from datetime import date

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy.orm import selectinload

from . import json_error, json_ok, role_required
from ..core.extensions import db
from ..core.security import slugify
from ..core.services.matching_service import score_resume_for_job
from ..models import Application, Company, JobPosting, Tag

api_jobs_bp = Blueprint("api_jobs", __name__)


def _tag_to_dict(tag: Tag):
    return {
        "id": tag.id,
        "name": tag.name,
        "slug": tag.slug,
        "description": tag.description,
        "category": tag.category.slug if tag.category else None,
        "category_name": tag.category.name if tag.category else None,
    }


def _company_to_dict(company: Company | None):
    if not company:
        return None
    return {
        "id": company.id,
        "company_name": company.company_name,
        "website": company.website,
        "address": company.address,
        "logo_url": company.logo_url,
        "industry": company.industry,
    }


def _job_to_dict(job: JobPosting):
    return {
        "id": job.id,
        "recruiter_user_id": job.recruiter_user_id,
        "company_id": job.company_id,
        "title": job.title,
        "slug": job.slug,
        "summary": job.summary,
        "description": job.description,
        "requirements": job.requirements,
        "responsibilities": job.responsibilities,
        "location": job.location,
        "workplace_type": job.workplace_type,
        "employment_type": job.employment_type,
        "experience_level": job.experience_level,
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
        "salary_currency": job.salary_currency,
        "vacancy_count": job.vacancy_count,
        "deadline": job.deadline.isoformat() if job.deadline else None,
        "status": job.status,
        "is_featured": bool(job.is_featured),
        "company": _company_to_dict(job.company),
        "tags": [_tag_to_dict(tag) for tag in (job.tags or [])],
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "updated_at": job.updated_at.isoformat() if job.updated_at else None,
    }


def _resume_for_screening(resume):
    return {
        "id": resume.id,
        "title": resume.title,
        "template_name": resume.template_name,
        "source_type": resume.source_type,
        "stored_path": resume.stored_path,
        "structured_json": resume.structured_json or {},
        "candidate_name": resume.user.full_name if resume.user else None,
        "tags": [_tag_to_dict(tag) for tag in (resume.tags or [])],
    }


@api_jobs_bp.get("")
def list_jobs():
    status = (request.args.get("status") or "").strip().lower()
    query = JobPosting.query.options(selectinload(JobPosting.tags), selectinload(JobPosting.company))
    if status:
        query = query.filter(JobPosting.status == status)
    jobs = query.order_by(JobPosting.is_featured.desc(), JobPosting.created_at.desc()).all()
    return json_ok([_job_to_dict(job) for job in jobs])


@api_jobs_bp.get("/mine")
@jwt_required()
@role_required("recruiter", "admin")
def list_my_jobs():
    user_id = int(get_jwt_identity())
    query = JobPosting.query.options(selectinload(JobPosting.tags), selectinload(JobPosting.company))
    jobs = query.filter(JobPosting.recruiter_user_id == user_id).order_by(JobPosting.created_at.desc()).all()
    return json_ok([_job_to_dict(job) for job in jobs])


@api_jobs_bp.get("/<int:job_id>")
def job_detail(job_id):
    job = JobPosting.query.options(selectinload(JobPosting.tags), selectinload(JobPosting.company)).filter_by(id=job_id).first()
    if not job:
        return json_error("Job not found.", 404)
    return json_ok(_job_to_dict(job))


@api_jobs_bp.post("")
@jwt_required()
@role_required("recruiter", "admin")
def create_job():
    user_id = int(get_jwt_identity())
    data = request.get_json(force=True)
    company = Company.query.filter_by(recruiter_user_id=user_id).first()
    if not company:
        return json_error("Company profile is required.", 400)

    title = (data.get("title") or "").strip()
    if not title:
        return json_error("Title is required.", 400)

    slug = (data.get("slug") or slugify(title)).strip() or slugify(title)
    if JobPosting.query.filter(JobPosting.slug == slug).first():
        slug = f"{slug}-{user_id}"

    job = JobPosting(
        recruiter_user_id=user_id,
        company_id=company.id,
        title=title,
        slug=slug,
        summary=data.get("summary"),
        description=data.get("description") or "",
        requirements=data.get("requirements") or "",
        responsibilities=data.get("responsibilities"),
        location=data.get("location") or "",
        workplace_type=data.get("workplace_type") or "onsite",
        employment_type=data.get("employment_type") or "full-time",
        experience_level=data.get("experience_level") or "junior",
        salary_min=data.get("salary_min") or None,
        salary_max=data.get("salary_max") or None,
        salary_currency=data.get("salary_currency") or "VND",
        vacancy_count=data.get("vacancy_count") or 1,
        status=data.get("status") or "draft",
        is_featured=bool(data.get("is_featured", False)),
    )

    deadline_raw = data.get("deadline")
    if deadline_raw:
        try:
            job.deadline = date.fromisoformat(deadline_raw)
        except (TypeError, ValueError):
            pass

    tag_ids = data.get("tag_ids") or []
    if tag_ids:
        job.tags = Tag.query.filter(Tag.id.in_(tag_ids)).all()

    db.session.add(job)
    db.session.commit()
    return json_ok(_job_to_dict(job), "Job created", 201)


@api_jobs_bp.put("/<int:job_id>")
@api_jobs_bp.patch("/<int:job_id>")
@jwt_required()
@role_required("recruiter", "admin")
def update_job(job_id):
    user_id = int(get_jwt_identity())
    job = JobPosting.query.options(selectinload(JobPosting.tags), selectinload(JobPosting.company)).filter_by(id=job_id).first()
    if not job or job.recruiter_user_id != user_id:
        return json_error("Job not found.", 404)

    data = request.get_json(force=True)
    for field in [
        "title",
        "slug",
        "summary",
        "description",
        "requirements",
        "responsibilities",
        "location",
        "workplace_type",
        "employment_type",
        "experience_level",
        "salary_min",
        "salary_max",
        "salary_currency",
        "vacancy_count",
        "status",
        "is_featured",
    ]:
        if field in data:
            setattr(job, field, data[field])

    if "deadline" in data:
        value = data.get("deadline")
        job.deadline = date.fromisoformat(value) if value else None

    if "tag_ids" in data:
        tag_ids = data.get("tag_ids") or []
        job.tags = Tag.query.filter(Tag.id.in_(tag_ids)).all() if tag_ids else []

    db.session.commit()
    return json_ok(_job_to_dict(job), "Job updated")


@api_jobs_bp.delete("/<int:job_id>")
@jwt_required()
@role_required("recruiter", "admin")
def delete_job(job_id):
    user_id = int(get_jwt_identity())
    job = JobPosting.query.filter_by(id=job_id, recruiter_user_id=user_id).first()
    if not job:
        return json_error("Job not found.", 404)
    db.session.delete(job)
    db.session.commit()
    return json_ok(message="Job deleted")


@api_jobs_bp.get("/<int:job_id>/screen")
@jwt_required()
@role_required("recruiter", "admin")
def screen_job_resumes(job_id):
    user_id = int(get_jwt_identity())
    job = JobPosting.query.options(selectinload(JobPosting.tags)).filter_by(id=job_id, recruiter_user_id=user_id).first()
    if not job:
        return json_error("Job not found.", 404)

    applications = (
        Application.query.options(
            selectinload(Application.resume).selectinload("tags"),
            selectinload(Application.resume).selectinload("user"),
        )
        .filter(Application.job_id == job.id)
        .all()
    )

    results = []
    for app in applications:
        if not app.resume:
            continue
        scored = score_resume_for_job(app.resume, job)
        results.append(
            {
                "application_id": app.id,
                "score": scored.get("score", 0),
                "breakdown": scored.get("breakdown", {}),
                "resume": _resume_for_screening(app.resume),
            }
        )

    results.sort(key=lambda item: item["score"], reverse=True)
    return json_ok(results)