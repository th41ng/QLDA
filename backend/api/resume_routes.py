from pathlib import Path
from datetime import date, datetime

from flask import Blueprint, current_app, redirect, request, send_file
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import func

from . import json_error, json_ok, role_required
from ..core.extensions import db
from ..models import CandidateProfile, CvTemplate, Resume, Tag
from ..repositories import get_profile_by_user_id, get_resume_by_id, get_user_by_id, list_resumes_by_user_id
from ..schemas import cv_template_to_dict, resume_to_dict
from ..core.services.cv_service import (
    allowed_resume_file,
    extract_text_from_upload,
    generate_docx_from_resume,
    generate_pdf_from_resume,
    save_uploaded_file,
)
from ..services.storage_service import upload_file
from ..core.services.cv_parser_service import parse_cv_to_structured
from ..core.services.matching_service import recommend_jobs_for_resume

api_resumes_bp = Blueprint("api_resumes", __name__)


def _current_user():
    return get_user_by_id(int(get_jwt_identity()))


def _structured_resume_payload(data: dict, user, template: CvTemplate | None = None):
    return {
        "full_name": data.get("full_name") or user.full_name,
        "email": data.get("email") or user.email,
        "phone": data.get("phone") or user.phone,
        "dob": data.get("dob"),
        "gender": data.get("gender"),
        "address": data.get("address"),
        "headline": data.get("headline") or (template.summary if template else None),
        "summary": data.get("summary"),
        "current_title": data.get("current_title"),
        "years_experience": int(data.get("years_experience") or 0),
        "expected_salary": data.get("expected_salary"),
        "desired_location": data.get("desired_location"),
        "education": data.get("education"),
        "experience": data.get("experience"),
        "skills": data.get("skills"),
        "skills_text": data.get("skills_text") or data.get("skills"),
        "additional_info": data.get("additional_info"),
        "template": {
            "id": template.id if template else data.get("template_id"),
            "name": template.name if template else data.get("template_name"),
            "slug": template.slug if template else data.get("template_slug"),
            "preview_url": template.preview_url if template else data.get("template_preview_url"),
        },
    }


def _manual_resume_raw_text(structured: dict | None) -> str:
    structured = structured or {}
    skills_text = structured.get("skills_text")
    if skills_text in (None, ""):
        skills_text = structured.get("skills")
    parts = []
    for field in ["headline", "summary"]:
        value = structured.get(field)
        if value is None:
            continue
        text = str(value).strip()
        if text:
            parts.append(text)
    if skills_text is not None:
        text = str(skills_text).strip()
        if text:
            parts.append(text)
    for field in ["experience", "education", "additional_info", "current_title"]:
        value = structured.get(field)
        if value is None:
            continue
        text = str(value).strip()
        if text:
            parts.append(text)
    return "\n\n".join(parts)


def _sync_candidate_profile(user, data: dict, structured: dict | None = None):
    profile = get_profile_by_user_id(user.id)
    if not profile:
        profile = CandidateProfile(user_id=user.id)
        db.session.add(profile)

    user.phone = data.get("phone") or user.phone
    if structured is None:
        structured = data

    profile.headline = structured.get("headline") or profile.headline
    profile.summary = structured.get("summary") or profile.summary
    profile.current_title = structured.get("current_title") or profile.current_title
    dob_value = structured.get("dob")
    if dob_value:
        profile.dob = date.fromisoformat(dob_value) if isinstance(dob_value, str) else dob_value
    profile.gender = structured.get("gender") or profile.gender
    profile.education = structured.get("education") or profile.education
    profile.experience = structured.get("experience") or profile.experience
    profile.address = structured.get("address") or profile.address
    profile.desired_location = structured.get("desired_location") or profile.desired_location
    years_experience = structured.get("years_experience", profile.years_experience or 0)
    try:
        profile.years_experience = int(years_experience or 0)
    except (TypeError, ValueError):
        profile.years_experience = profile.years_experience or 0
    profile.expected_salary = structured.get("expected_salary") or profile.expected_salary
    return profile


def _render_resume_files(resume: Resume):
    structured = resume.structured_json or {}
    render_data = {
        "full_name": structured.get("full_name") or resume.user.full_name,
        "headline": structured.get("headline") or "",
        "email": structured.get("email") or resume.user.email,
        "phone": structured.get("phone") or resume.user.phone,
        "address": structured.get("address") or "",
        "dob": structured.get("dob") or "",
        "gender": structured.get("gender") or "",
        "current_title": structured.get("current_title") or "",
        "years_experience": structured.get("years_experience") or 0,
        "expected_salary": structured.get("expected_salary") or "",
        "desired_location": structured.get("desired_location") or "",
        "summary": structured.get("summary") or "",
        "skills": structured.get("skills") or "",
        "additional_info": structured.get("additional_info") or "",
        "experience": structured.get("experience") or "",
        "education": structured.get("education") or "",
        "template": structured.get("template") or {
            "name": resume.template_name,
            "slug": (resume.template_name or "").lower().replace(" ", "-"),
        },
    }
    upload_dir = Path(current_app.config["UPLOAD_FOLDER"])
    pdf_path = upload_dir / f"resume-{resume.id}.pdf"
    docx_path = upload_dir / f"resume-{resume.id}.docx"
    generate_pdf_from_resume(render_data, str(pdf_path))
    generate_docx_from_resume(render_data, str(docx_path))

    resume.generated_pdf_path = str(pdf_path)
    resume.generated_docx_path = str(docx_path)


def _try_render_resume_files(resume: Resume):
    try:
        _render_resume_files(resume)
    except Exception:
        current_app.logger.exception("Failed to render resume files for resume_id=%s", resume.id)


@api_resumes_bp.get("")
@jwt_required()
@role_required("candidate")
def list_resumes():
    user = _current_user()
    resumes = list_resumes_by_user_id(user.id)
    return json_ok([resume_to_dict(resume) for resume in resumes])


@api_resumes_bp.get("/templates")
def list_resume_templates():
    templates = CvTemplate.query.filter(CvTemplate.is_active.is_(True)).order_by(CvTemplate.created_at.desc()).all()
    return json_ok([cv_template_to_dict(template) for template in templates])


@api_resumes_bp.post("/manual")
@jwt_required()
@role_required("candidate")
def create_manual_resume():
    user = _current_user()
    data = request.get_json(force=True)
    structured_json = _structured_resume_payload(data, user)
    resume = Resume(
        user_id=user.id,
        title=data.get("title") or f"CV của {user.full_name}",
        source_type="manual",
        template_name=data.get("template_name") or data.get("template_slug"),
        raw_text=_manual_resume_raw_text(structured_json),
        structured_json=structured_json,
        is_primary=bool(data.get("is_primary", False)),
    )
    if resume.is_primary:
        Resume.query.filter_by(user_id=user.id, is_primary=True).update({"is_primary": False})
    db.session.add(resume)
    db.session.flush()
    tag_ids = data.get("tag_ids", [])
    if tag_ids:
        resume.tags = Tag.query.filter(Tag.id.in_(tag_ids)).all()
    _sync_candidate_profile(user, data, structured_json)
    db.session.commit()
    _try_render_resume_files(resume)
    db.session.commit()
    return json_ok(resume_to_dict(resume), "Resume created", 201)


@api_resumes_bp.post("/from-template")
@jwt_required()
@role_required("candidate")
def create_resume_from_template():
    user = _current_user()
    data = request.get_json(force=True)
    template = None
    template_id = data.get("template_id")
    template_slug = str(data.get("template_slug") or "").strip().lower()
    template_name = str(data.get("template_name") or "").strip()

    if template_id:
        template = CvTemplate.query.filter_by(id=template_id, is_active=True).first()
    if not template and template_slug:
        template = CvTemplate.query.filter(
            func.lower(CvTemplate.slug) == template_slug,
            CvTemplate.is_active.is_(True),
        ).first()
    if not template and template_name:
        template = CvTemplate.query.filter(
            func.lower(CvTemplate.name) == template_name.lower(),
            CvTemplate.is_active.is_(True),
        ).first()
    if not template:
        return json_error("Template not found.", 404)

    structured_json = _structured_resume_payload(data, user, template)
    resume = Resume(
        user_id=user.id,
        title=data.get("title") or f"{template.name} - {user.full_name}",
        source_type="manual",
        template_name=template.name,
        raw_text=_manual_resume_raw_text(structured_json),
        structured_json=structured_json,
        is_primary=bool(data.get("is_primary", False)),
    )
    if resume.is_primary:
        Resume.query.filter_by(user_id=user.id, is_primary=True).update({"is_primary": False})
    db.session.add(resume)
    db.session.flush()
    tag_ids = data.get("tag_ids", [])
    if tag_ids:
        resume.tags = Tag.query.filter(Tag.id.in_(tag_ids)).all()
    _sync_candidate_profile(user, data, structured_json)
    db.session.commit()
    _try_render_resume_files(resume)
    db.session.commit()
    return json_ok(resume_to_dict(resume), "Resume created from template", 201)


@api_resumes_bp.post("/parse-preview")
@jwt_required()
@role_required("candidate")
def parse_cv_preview():
    """
    Parse CV file or existing resume and return structured data WITHOUT creating a resume.
    Used by frontend to pre-fill the editor form before user confirms.
    
    Form data (either file or resume_id):
    - file: PDF/DOC/DOCX file
    - resume_id: ID of existing uploaded resume
    """
    user = _current_user()
    extracted_text = None

    resume_id = request.form.get("resume_id")
    if resume_id:
        existing_resume = Resume.query.filter_by(id=int(resume_id), user_id=user.id).first()
        if not existing_resume:
            return json_error("Resume not found.", 404)
        extracted_text = existing_resume.raw_text or ""
    else:
        if "file" not in request.files:
            return json_error("Resume file or resume_id is required.", 400)
        file = request.files["file"]
        if not file.filename:
            return json_error("Resume file is required.", 400)
        if not allowed_resume_file(file.filename):
            return json_error("Only PDF, DOC and DOCX are supported.", 400)
        _filename, stored_path, _mime = save_uploaded_file(file, current_app.config["UPLOAD_FOLDER"], f"resume-{user.id}")
        extracted_text = extract_text_from_upload(stored_path)

    if not (extracted_text or "").strip():
        return json_error("Could not extract readable text from this resume file.", 422)

    user_info = {
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
    }
    parsed_data = parse_cv_to_structured(extracted_text, user_info)
    return json_ok(parsed_data, "CV parsed successfully")


@api_resumes_bp.post("/parse-and-create")
@jwt_required()
@role_required("candidate")
def parse_cv_and_create_resume():
    """
    Parse CV and auto-fill resume template.
    
    Form data (either file or resume_id):
    - file: PDF/DOC/DOCX file (for new upload)
    - resume_id: ID of existing uploaded resume (for conversion)
    - template_id: ID of resume template to use
    - title: Optional resume title
    - is_primary: Optional boolean
    """
    user = _current_user()
    
    template_id = request.form.get("template_id")
    if not template_id:
        return json_error("Template ID is required.", 400)
    
    template = CvTemplate.query.filter_by(id=int(template_id), is_active=True).first()
    if not template:
        return json_error("Template not found.", 404)
    
    # Get extracted text from either new file or existing resume
    extracted_text = None
    original_filename = None
    
    resume_id = request.form.get("resume_id")
    if resume_id:
        # Parse from existing uploaded resume
        existing_resume = Resume.query.filter_by(id=int(resume_id), user_id=user.id).first()
        if not existing_resume:
            return json_error("Resume not found.", 404)
        if existing_resume.source_type != "upload":
            return json_error("Can only convert uploaded resumes.", 400)
        
        extracted_text = existing_resume.raw_text
        original_filename = existing_resume.original_filename or existing_resume.title
    else:
        # Parse from new file upload
        if "file" not in request.files:
            return json_error("Resume file or resume_id is required.", 400)
        file = request.files["file"]
        if not file.filename:
            return json_error("Resume file is required.", 400)
        if not allowed_resume_file(file.filename):
            return json_error("Only PDF, DOC and DOCX are supported.", 400)
        
        # Save and extract text
        filename, stored_path, mime_type = save_uploaded_file(file, current_app.config["UPLOAD_FOLDER"], f"resume-{user.id}")
        extracted_text = extract_text_from_upload(stored_path)
        original_filename = file.filename

    if not (extracted_text or "").strip():
        return json_error("Could not extract readable text from this resume file.", 422)
    
    # Parse CV to structured data
    user_info = {
        'full_name': user.full_name,
        'email': user.email,
        'phone': user.phone,
    }
    parsed_data = parse_cv_to_structured(extracted_text, user_info)
    
    # Create structured resume payload with template
    structured_json = _structured_resume_payload(parsed_data, user, template)
    
    # Create resume
    resume = Resume(
        user_id=user.id,
        title=request.form.get("title") or f"Auto-parsed CV - {template.name}",
        source_type="parsed",
        original_filename=original_filename,
        raw_text=extracted_text,
        structured_json=structured_json,
        template_name=template.name,
        is_primary=bool(request.form.get("is_primary", "false").lower() == "true"),
    )
    if resume.is_primary:
        Resume.query.filter_by(user_id=user.id, is_primary=True).update({"is_primary": False})
    
    db.session.add(resume)
    db.session.flush()
    
    tag_ids = [int(tag_id) for tag_id in request.form.getlist("tag_ids") if str(tag_id).isdigit()]
    if tag_ids:
        resume.tags = Tag.query.filter(Tag.id.in_(tag_ids)).all()
    
    _sync_candidate_profile(user, parsed_data, structured_json)
    db.session.commit()
    _try_render_resume_files(resume)
    db.session.commit()
    
    return json_ok(resume_to_dict(resume), "CV parsed and resume created", 201)


@api_resumes_bp.post("/upload")
@jwt_required()
@role_required("candidate")
def upload_resume():
    user = _current_user()
    if "file" not in request.files:
        return json_error("Resume file is required.", 400)
    file = request.files["file"]
    if not file.filename:
        return json_error("Resume file is required.", 400)
    if not allowed_resume_file(file.filename):
        return json_error("Only PDF, DOC and DOCX are supported.", 400)
    filename, stored_path, mime_type = save_uploaded_file(file, current_app.config["UPLOAD_FOLDER"], f"resume-{user.id}")
    extracted_text = extract_text_from_upload(stored_path)

    if not (extracted_text or "").strip():
        return json_error("Could not extract readable text from this resume file.", 422)
    
    # Parse CV immediately to store structured data
    user_info = {
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
    }
    parsed_data = parse_cv_to_structured(extracted_text, user_info) if extracted_text else {}
    
    # Upload to Cloudinary
    uploaded = upload_file(
        stored_path,
        folder="jobportal/resumes/uploaded",
        public_id=f"resume-{user.id}-{Path(filename).stem}",
    )
    stored_reference = uploaded.url if uploaded else stored_path
    
    resume = Resume(
        user_id=user.id,
        title=request.form.get("title") or f"Uploaded CV {filename}",
        source_type="upload",
        original_filename=file.filename,
        stored_path=stored_reference,
        file_ext=Path(file.filename).suffix.lower(),
        mime_type=mime_type,
        raw_text=extracted_text,
        structured_json=parsed_data,  # ← Lưu parsed data thay vì {"extracted": True}
        is_primary=bool(request.form.get("is_primary", "false").lower() == "true"),
    )
    if resume.is_primary:
        Resume.query.filter_by(user_id=user.id, is_primary=True).update({"is_primary": False})
    db.session.add(resume)
    db.session.flush()
    tag_ids = [int(tag_id) for tag_id in request.form.getlist("tag_ids") if str(tag_id).isdigit()]
    if tag_ids:
        resume.tags = Tag.query.filter(Tag.id.in_(tag_ids)).all()
    db.session.commit()
    return json_ok(resume_to_dict(resume), "Resume uploaded", 201)


@api_resumes_bp.get("/<int:resume_id>")
@jwt_required()
def get_resume(resume_id):
    user = _current_user()
    resume = get_resume_by_id(resume_id)
    if not resume:
        return json_error("Resume not found.", 404)
    if user.role != "admin" and resume.user_id != user.id:
        return json_error("Forbidden", 403)
    return json_ok(resume_to_dict(resume))


@api_resumes_bp.put("/<int:resume_id>")
@api_resumes_bp.patch("/<int:resume_id>")
@jwt_required()
@role_required("candidate")
def update_resume(resume_id):
    user = _current_user()
    resume = Resume.query.filter_by(id=resume_id, user_id=user.id).first()
    if not resume:
        return json_error("Resume not found.", 404)
    data = request.get_json(force=True)
    for field in ["title", "template_name"]:
        if field in data:
            setattr(resume, field, data[field])
    if "structured_json" in data:
        resume.structured_json = data["structured_json"]
        if (resume.source_type or "").lower() == "manual":
            resume.raw_text = _manual_resume_raw_text(resume.structured_json)
    elif "raw_text" in data:
        resume.raw_text = data["raw_text"]
    if "is_primary" in data and data["is_primary"]:
        Resume.query.filter_by(user_id=user.id, is_primary=True).update({"is_primary": False})
        resume.is_primary = True
    if "tag_ids" in data:
        resume.tags = Tag.query.filter(Tag.id.in_(data["tag_ids"])).all()
    if data.get("structured_json"):
        _sync_candidate_profile(user, data["structured_json"], data["structured_json"])
    db.session.commit()
    if data.get("structured_json"):
        _try_render_resume_files(resume)
        db.session.commit()
    return json_ok(resume_to_dict(resume), "Resume updated")


@api_resumes_bp.delete("/<int:resume_id>")
@jwt_required()
@role_required("candidate")
def delete_resume(resume_id):
    user = _current_user()
    resume = Resume.query.filter_by(id=resume_id, user_id=user.id).first()
    if not resume:
        return json_error("Resume not found.", 404)
    db.session.delete(resume)
    db.session.commit()
    return json_ok(message="Resume deleted")


@api_resumes_bp.get("/<int:resume_id>/export")
@jwt_required()
@role_required("candidate", "recruiter", "admin")
def export_resume(resume_id):
    user = _current_user()
    resume = Resume.query.filter_by(id=resume_id).first()
    if not resume:
        return json_error("Resume not found.", 404)
    if user.role != "admin" and resume.user_id != user.id:
        return json_error("Forbidden", 403)
    fmt = request.args.get("format", "pdf").lower()

    if (resume.source_type or "").lower() == "upload":
        stored = (resume.stored_path or "").strip()
        download_name = resume.original_filename or f"resume-{resume.id}{resume.file_ext or '.pdf'}"
        if stored.startswith(("http://", "https://")):
            return redirect(stored)
        if stored:
            path = Path(stored)
            if not path.is_absolute():
                path = Path(current_app.config["UPLOAD_FOLDER"]) / stored.lstrip("/\\")
            if path.exists():
                return send_file(path, as_attachment=True, download_name=download_name)
        return json_error("Không tìm thấy file CV đã tải lên.", 404)

    structured = resume.structured_json or {}
    data = {
        "full_name": structured.get("full_name") or resume.user.full_name,
        "headline": structured.get("headline") or "",
        "email": structured.get("email") or resume.user.email,
        "phone": structured.get("phone") or resume.user.phone,
        "address": structured.get("address") or "",
        "dob": structured.get("dob") or "",
        "gender": structured.get("gender") or "",
        "current_title": structured.get("current_title") or "",
        "years_experience": structured.get("years_experience") or 0,
        "expected_salary": structured.get("expected_salary") or "",
        "desired_location": structured.get("desired_location") or "",
        "summary": structured.get("summary") or "",
        "skills": structured.get("skills") or "",
        "additional_info": structured.get("additional_info") or "",
        "experience": structured.get("experience") or "",
        "education": structured.get("education") or "",
        "template": structured.get("template") or {
            "name": resume.template_name,
            "slug": (resume.template_name or "").lower().replace(" ", "-"),
        },
    }
    upload_dir = Path(current_app.config["UPLOAD_FOLDER"]).resolve()
    upload_dir.mkdir(parents=True, exist_ok=True)

    try:
        if fmt == "docx":
            path = Path(resume.generated_docx_path).resolve() if resume.generated_docx_path else upload_dir / f"resume-{resume.id}.docx"
            if not path.exists() or upload_dir not in path.parents:
                path = upload_dir / f"resume-{resume.id}.docx"
            generate_docx_from_resume(data, str(path))
            return send_file(path, as_attachment=True, download_name=path.name)

        path = Path(resume.generated_pdf_path).resolve() if resume.generated_pdf_path else upload_dir / f"resume-{resume.id}.pdf"
        if not path.exists() or upload_dir not in path.parents:
            path = upload_dir / f"resume-{resume.id}.pdf"
        generate_pdf_from_resume(data, str(path))
        return send_file(path, as_attachment=True, download_name=path.name)
    except Exception:
        current_app.logger.exception("Failed to export resume_id=%s with format=%s", resume.id, fmt)
        return json_error("Không thể xuất file CV lúc này.", 500)


@api_resumes_bp.get("/recommendations")
@jwt_required()
@role_required("candidate")
def recommendations():
    user = _current_user()
    resumes = Resume.query.filter_by(user_id=user.id).all()
    recommendations_data = []
    for resume in resumes:
        for score, job, breakdown in recommend_jobs_for_resume(resume):
            recommendations_data.append({
                "resume_id": resume.id,
                "job_id": job.id,
                "score": score,
                "breakdown": breakdown,
            })
    recommendations_data.sort(key=lambda item: item["score"], reverse=True)
    return json_ok(recommendations_data)
