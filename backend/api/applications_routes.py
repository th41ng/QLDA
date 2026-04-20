import os

from flask import Blueprint, current_app, request, send_file
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy.orm import selectinload

from . import json_error, json_ok, role_required
from ..core.extensions import db
from ..models import Application, JobPosting, Notification, Resume, Tag, User
from ..services.mail_service import send_mail
from ..services.application_service import (
    update_application_status as update_application_status_service,
    ApplicationServiceError,
)

api_applications_bp = Blueprint("api_applications", __name__)


def _tag_to_dict(tag: Tag):
    return {
        "id": tag.id,
        "name": tag.name,
        "slug": tag.slug,
        "description": tag.description,
        "category": tag.category.slug if tag.category else None,
        "category_name": tag.category.name if tag.category else None,
    }


def _resume_to_dict(resume: Resume | None):
    if not resume:
        return None
    return {
        "id": resume.id,
        "title": resume.title,
        "source_type": resume.source_type,
        "template_name": resume.template_name,
        "stored_path": resume.stored_path,
        "generated_pdf_path": resume.generated_pdf_path,
        "generated_docx_path": resume.generated_docx_path,
        "structured_json": resume.structured_json or {},
        "tags": [_tag_to_dict(tag) for tag in (resume.tags or [])],
    }


def _job_to_dict(job: JobPosting | None):
    if not job:
        return None
    return {
        "id": job.id,
        "title": job.title,
        "location": job.location,
        "workplace_type": job.workplace_type,
        "employment_type": job.employment_type,
        "experience_level": job.experience_level,
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
        "status": job.status,
        "company": {
            "id": job.company.id if job.company else None,
            "company_name": job.company.company_name if job.company else None,
            "logo_url": job.company.logo_url if job.company else None,
        },
    }


def _candidate_to_dict(user: User | None):
    if not user:
        return None
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "avatar_url": user.avatar_url,
    }


def _application_to_dict(application: Application):
    return {
        "id": application.id,
        "candidate_user_id": application.candidate_user_id,
        "job_id": application.job_id,
        "resume_id": application.resume_id,
        "cover_letter": application.cover_letter,
        "status": application.status,
        "recruiter_note": application.recruiter_note,
        "applied_at": application.applied_at.isoformat() if application.applied_at else None,
        "updated_at": application.updated_at.isoformat() if application.updated_at else None,
        "job": _job_to_dict(application.job),
        "resume": _resume_to_dict(application.resume),
        "candidate": _candidate_to_dict(application.candidate),
    }


def _build_status_message(status: str, job_title: str, reason: str | None = None):
    title_map = {
        "rejected": "Kết quả hồ sơ ứng tuyển",
    }
    message_map = {
        "rejected": f"Hồ sơ của bạn cho vị trí {job_title} đã bị từ chối.",
    }
    title = title_map.get(status, "Cập nhật hồ sơ ứng tuyển")
    message = message_map.get(status, f"Hồ sơ ứng tuyển cho vị trí {job_title} vừa được cập nhật.")
    if reason:
        message = f"{message} Lý do: {reason}"
    return title, message


def _notify_candidate_for_status(application: Application, reason: str | None = None):
    candidate = application.candidate
    if not candidate:
        return

    job_title = application.job.title if application.job else f"#{application.job_id}"
    title, message = _build_status_message(application.status, job_title, reason)
    link_url = f"/candidate/applications?applicationId={application.id}"

    db.session.add(
        Notification(
            user_id=application.candidate_user_id,
            title=title,
            message=message,
            type=application.status,
            link_url=link_url,
        )
    )

    if not candidate.email:
        return

    subject = title
    body = (
        f"Xin chào {candidate.full_name or 'ứng viên'},\n\n"
        f"{message}\n\n"
        f"Bạn có thể xem chi tiết hồ sơ tại: "
        f"{current_app.config.get('FRONTEND_URL', 'http://127.0.0.1:5173')}/candidate/applications?applicationId={application.id}\n"
    )
    html = (
        "<div style='font-family:Arial,sans-serif;line-height:1.6'>"
        "<h2 style='margin:0 0 12px;color:#1d4ed8'>JOBPORTAL</h2>"
        f"<p>Xin chào <b>{candidate.full_name or 'ứng viên'}</b>,</p>"
        f"<p>{message}</p>"
        f"<p><a href='{current_app.config.get('FRONTEND_URL', 'http://127.0.0.1:5173')}/candidate/applications?applicationId={application.id}' "
        "style='display:inline-block;padding:10px 16px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:8px'>"
        "Xem chi tiết hồ sơ</a></p>"
        "</div>"
    )
    send_mail(subject, [candidate.email], body, html)


@api_applications_bp.post("")
@jwt_required()
@role_required("candidate")
def create_application():
    user_id = int(get_jwt_identity())
    data = request.get_json(force=True) or {}

    try:
        job_id = int(data.get("job_id"))
        resume_id = int(data.get("resume_id"))
    except (TypeError, ValueError):
        return json_error("job_id and resume_id must be integers.", 400)

    if not job_id or not resume_id:
        return json_error("job_id and resume_id are required.", 400)

    job = JobPosting.query.filter_by(id=job_id).first()
    if not job or job.status not in {"published", "open"}:
        return json_error("Job not found.", 404)

    resume = Resume.query.filter_by(id=resume_id, user_id=user_id).first()
    if not resume:
        return json_error("Resume not found.", 404)

    existing = Application.query.filter_by(candidate_user_id=user_id, job_id=job.id).first()
    if existing:
        return json_error("You already applied to this job.", 409)

    app = Application(
        candidate_user_id=user_id,
        job_id=job.id,
        resume_id=resume.id,
        cover_letter=(data.get("cover_letter") or "").strip() or None,
        status="submitted",
    )
    db.session.add(app)
    db.session.commit()
    return json_ok(_application_to_dict(app), "Application submitted", 201)


@api_applications_bp.get("/check")
@jwt_required()
@role_required("candidate")
def check_application_for_job():
    user_id = int(get_jwt_identity())

    job_id_raw = request.args.get("job_id")
    try:
        job_id = int(job_id_raw)
    except (TypeError, ValueError):
        return json_error("job_id must be an integer.", 400)

    application = (
        Application.query.options(
            selectinload(Application.job).selectinload(JobPosting.company),
            selectinload(Application.resume).selectinload(Resume.tags),
            selectinload(Application.candidate),
        )
        .filter(Application.candidate_user_id == user_id, Application.job_id == job_id)
        .first()
    )

    return json_ok(
        {
            "job_id": job_id,
            "has_applied": bool(application),
            "application": _application_to_dict(application) if application else None,
        }
    )


@api_applications_bp.get("/mine")
@jwt_required()
@role_required("candidate")
def my_applications():
    user_id = int(get_jwt_identity())
    apps = (
        Application.query.options(
            selectinload(Application.job).selectinload(JobPosting.company),
            selectinload(Application.resume).selectinload(Resume.tags),
            selectinload(Application.candidate),
        )
        .filter(Application.candidate_user_id == user_id)
        .order_by(Application.applied_at.desc())
        .all()
    )
    return json_ok([_application_to_dict(app) for app in apps])


@api_applications_bp.get("/recruiter")
@jwt_required()
@role_required("recruiter", "admin")
def recruiter_applications():
    user_id = int(get_jwt_identity())
    apps = (
        Application.query.options(
            selectinload(Application.job).selectinload(JobPosting.company),
            selectinload(Application.resume).selectinload(Resume.tags),
            selectinload(Application.candidate),
        )
        .join(JobPosting, JobPosting.id == Application.job_id)
        .filter(JobPosting.recruiter_user_id == user_id)
        .order_by(Application.applied_at.desc())
        .all()
    )
    return json_ok([_application_to_dict(app) for app in apps])


@api_applications_bp.get("/<int:application_id>/resume")
@jwt_required()
@role_required("recruiter", "admin")
def recruiter_application_resume(application_id):
    user_id = int(get_jwt_identity())
    app = (
        Application.query.options(
            selectinload(Application.job).selectinload(JobPosting.company),
            selectinload(Application.resume).selectinload(Resume.tags),
            selectinload(Application.candidate),
        )
        .join(JobPosting, JobPosting.id == Application.job_id)
        .filter(Application.id == application_id, JobPosting.recruiter_user_id == user_id)
        .first()
    )
    if not app:
        return json_error("Application not found.", 404)
    return json_ok({"application": _application_to_dict(app), "resume": _resume_to_dict(app.resume)})


@api_applications_bp.get("/<int:application_id>/resume/pdf")
@jwt_required()
@role_required("recruiter", "admin")
def recruiter_application_resume_pdf(application_id):
    user_id = int(get_jwt_identity())
    app = (
        Application.query.options(
            selectinload(Application.resume),
            selectinload(Application.job),
        )
        .join(JobPosting, JobPosting.id == Application.job_id)
        .filter(Application.id == application_id, JobPosting.recruiter_user_id == user_id)
        .first()
    )
    if not app or not app.resume:
        return json_error("Application or resume not found.", 404)

    resume = app.resume
    upload_folder = current_app.config.get("UPLOAD_FOLDER", "instance/uploads")
    stored = resume.stored_path or ""
    pdf_path = resume.generated_pdf_path or ""

    for candidate in (pdf_path, stored):
        if not candidate:
            continue
        full = candidate if os.path.isabs(candidate) else os.path.join(upload_folder, candidate.lstrip("/"))
        if os.path.isfile(full):
            return send_file(full, mimetype="application/pdf", as_attachment=False)

    return json_error("PDF file not found on server.", 404)


@api_applications_bp.patch("/<int:application_id>/status")
@jwt_required()
@role_required("recruiter", "admin")
def update_application_status(application_id):
    user_id = int(get_jwt_identity())
    
    try:
        data = request.get_json(force=True) or {}
    except Exception:
        return json_error("Invalid JSON request body.", 400)
    
    status = (data.get("status") or "").strip()
    reason = (data.get("reason") or data.get("recruiter_note") or "").strip() or None

    try:
        app = update_application_status_service(
            application_id=application_id,
            recruiter_user_id=user_id,
            status=status,
            reason=reason
        )
        return json_ok(_application_to_dict(app), "Application updated")
    except ApplicationServiceError as e:
        if "not found" in str(e).lower():
            return json_error(str(e), 404)
        else:
            return json_error(str(e), 400)
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Failed to update application status")
        return json_error("Unable to update application status.", 502)
