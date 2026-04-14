from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy.orm import selectinload

from . import json_error, json_ok, role_required
from ..core.extensions import db
from ..models import Application, JobPosting, Resume, Tag, User

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


@api_applications_bp.post("")
@jwt_required()
@role_required("candidate")
def create_application():
    user_id = int(get_jwt_identity())
    data = request.get_json(force=True)

    job_id = data.get("job_id")
    resume_id = data.get("resume_id")
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
        cover_letter=data.get("cover_letter"),
        status="submitted",
    )
    db.session.add(app)
    db.session.commit()
    return json_ok(_application_to_dict(app), "Application submitted", 201)


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


@api_applications_bp.patch("/<int:application_id>/status")
@jwt_required()
@role_required("recruiter", "admin")
def update_application_status(application_id):
    user_id = int(get_jwt_identity())
    data = request.get_json(force=True)
    status = (data.get("status") or "").strip().lower()
    if status not in {"submitted", "reviewing", "interview", "accepted", "rejected", "withdrawn"}:
        return json_error("Invalid status.", 400)

    app = (
        Application.query.join(JobPosting, JobPosting.id == Application.job_id)
        .filter(Application.id == application_id, JobPosting.recruiter_user_id == user_id)
        .first()
    )
    if not app:
        return json_error("Application not found.", 404)

    app.status = status
    db.session.commit()
    return json_ok(_application_to_dict(app), "Application updated")