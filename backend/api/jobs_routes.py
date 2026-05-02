from datetime import date

from flask import Blueprint, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from sqlalchemy import func
from sqlalchemy.orm import selectinload

from . import json_error, json_ok, role_required
from ..core.extensions import db
from ..schemas import tag_to_dict
from ..core.security import slugify
from ..core.services.matching_service import screen_resume_for_job_with_ai
from ..models import Application, Category, Company, JobPosting, Resume, Tag
from ..models.base import job_tags

api_jobs_bp = Blueprint("api_jobs", __name__)

_EMPLOYMENT_TYPES = {"full-time", "part-time", "contract", "internship", "freelance"}
_WORKPLACE_TYPES = {"onsite", "remote", "hybrid"}
_EXPERIENCE_LEVELS = {"intern", "junior", "mid", "senior", "lead", "manager"}
_EDUCATION_LEVELS = {"any", "high-school", "associate", "bachelor", "master", "phd"}


def _validate_job_enums(data: dict) -> str | None:
    checks = [
        ("employment_type", _EMPLOYMENT_TYPES),
        ("workplace_type", _WORKPLACE_TYPES),
        ("experience_level", _EXPERIENCE_LEVELS),
        ("education_level", _EDUCATION_LEVELS),
    ]
    for field, valid_set in checks:
        value = data.get(field)
        if value and value not in valid_set:
            return f"Invalid {field}: '{value}'. Must be one of: {', '.join(sorted(valid_set))}"
    return None


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
        "benefits": job.benefits,
        "education_level": job.education_level or "any",
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
        "tags": [tag_to_dict(tag) for tag in (job.tags or [])],
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
        "tags": [tag_to_dict(tag) for tag in (resume.tags or [])],
        "updated_at": resume.updated_at.isoformat() if resume.updated_at else None,
    }


def _screen_results_for_job(job: JobPosting, include_debug: bool = False):
    applications = (
        Application.query.options(
            selectinload(Application.resume).selectinload(Resume.tags),
            selectinload(Application.resume).selectinload(Resume.user),
        )
        .filter(Application.job_id == job.id)
        .all()
    )

    results = []
    for app in applications:
        if not app.resume:
            continue
        scored = screen_resume_for_job_with_ai(app.resume, job)
        payload = {
            "application_id": app.id,
            "score": scored.get("score", 0),
            "breakdown": scored.get("breakdown", {}),
            "breakdown_normalized": scored.get("breakdown_normalized", scored.get("breakdown", {})),
            "breakdown_raw": scored.get("breakdown_raw", {}),
            "insights": scored.get("insights", {}),
            "engine": scored.get("engine", {}),
            "resume": _resume_for_screening(app.resume),
        }
        if include_debug:
            payload["debug"] = scored.get("debug", {})
        results.append(payload)

    results.sort(key=lambda item: item["score"], reverse=True)
    return results


@api_jobs_bp.get("/filter-options")
def job_filter_options():
    locations = [
        r[0] for r in db.session.query(JobPosting.location)
        .filter(JobPosting.status == "published", JobPosting.location.isnot(None), JobPosting.location != "")
        .distinct().order_by(JobPosting.location).all()
    ]
    experiences = [
        r[0] for r in db.session.query(JobPosting.experience_level)
        .filter(JobPosting.status == "published", JobPosting.experience_level.isnot(None), JobPosting.experience_level != "")
        .distinct().order_by(JobPosting.experience_level).all()
    ]
    workplaces = [
        r[0] for r in db.session.query(JobPosting.workplace_type)
        .filter(JobPosting.status == "published", JobPosting.workplace_type.isnot(None), JobPosting.workplace_type != "")
        .distinct().order_by(JobPosting.workplace_type).all()
    ]
    employments = [
        r[0] for r in db.session.query(JobPosting.employment_type)
        .filter(JobPosting.status == "published", JobPosting.employment_type.isnot(None), JobPosting.employment_type != "")
        .distinct().order_by(JobPosting.employment_type).all()
    ]

    published_job_ids = db.session.query(JobPosting.id).filter(JobPosting.status == "published").subquery()

    tag_counts = (
        db.session.query(Tag.id, Tag.name, Tag.slug, Category.slug.label("cat_slug"), func.count(job_tags.c.job_id).label("cnt"))
        .join(job_tags, Tag.id == job_tags.c.tag_id)
        .join(Category, Category.id == Tag.category_id)
        .filter(job_tags.c.job_id.in_(published_job_ids))
        .group_by(Tag.id, Tag.name, Tag.slug, Category.slug)
        .order_by(func.count(job_tags.c.job_id).desc())
        .all()
    )

    industries = [
        {"value": r.slug, "label": r.name}
        for r in tag_counts if r.cat_slug == "industry"
    ]
    top_tags = [
        {"slug": r.slug, "name": r.name, "count": r.cnt}
        for r in tag_counts[:12]
    ]

    return json_ok({
        "locations": locations,
        "experiences": experiences,
        "workplaces": workplaces,
        "employments": employments,
        "industries": industries,
        "tags": top_tags,
    })


@api_jobs_bp.get("")
def list_jobs():
    status = (request.args.get("status") or "published").strip().lower()
    q = (request.args.get("q") or "").strip()
    location = (request.args.get("location") or "").strip()
    industry = (request.args.get("industry") or "").strip()
    experience = (request.args.get("experience") or "").strip()
    workplace = (request.args.get("workplace") or "").strip()
    employment = (request.args.get("employment") or "").strip()
    tag_slug = (request.args.get("tag") or "").strip()
    sort = (request.args.get("sort") or "featured").strip()

    try:
        page = max(1, int(request.args.get("page") or 1))
        per_page = min(50, max(1, int(request.args.get("per_page") or 6)))
    except (TypeError, ValueError):
        page, per_page = 1, 6

    query = JobPosting.query.options(
        selectinload(JobPosting.tags).selectinload(Tag.category),
        selectinload(JobPosting.company),
    )

    if status:
        query = query.filter(JobPosting.status == status)

    if q:
        pattern = f"%{q}%"
        query = query.join(Company, Company.id == JobPosting.company_id, isouter=True).filter(
            db.or_(
                JobPosting.title.ilike(pattern),
                JobPosting.summary.ilike(pattern),
                JobPosting.description.ilike(pattern),
                JobPosting.requirements.ilike(pattern),
                JobPosting.location.ilike(pattern),
                Company.company_name.ilike(pattern),
            )
        )

    if location:
        query = query.filter(JobPosting.location == location)

    if experience:
        query = query.filter(JobPosting.experience_level == experience)

    if workplace:
        query = query.filter(JobPosting.workplace_type == workplace)

    if employment:
        query = query.filter(JobPosting.employment_type == employment)

    if industry:
        industry_subq = (
            db.session.query(job_tags.c.job_id)
            .join(Tag, Tag.id == job_tags.c.tag_id)
            .join(Category, Category.id == Tag.category_id)
            .filter(Tag.slug == industry, Category.slug == "industry")
            .subquery()
        )
        query = query.filter(JobPosting.id.in_(industry_subq))

    if tag_slug:
        tag_subq = (
            db.session.query(job_tags.c.job_id)
            .join(Tag, Tag.id == job_tags.c.tag_id)
            .filter(Tag.slug == tag_slug)
            .subquery()
        )
        query = query.filter(JobPosting.id.in_(tag_subq))

    if sort == "newest":
        query = query.order_by(JobPosting.created_at.desc())
    elif sort == "salary_desc":
        query = query.order_by(
            func.coalesce(JobPosting.salary_max, JobPosting.salary_min, 0).desc(),
            JobPosting.created_at.desc(),
        )
    elif sort == "salary_asc":
        query = query.order_by(
            func.coalesce(JobPosting.salary_max, JobPosting.salary_min, 0).asc(),
            JobPosting.created_at.desc(),
        )
    else:
        query = query.order_by(JobPosting.is_featured.desc(), JobPosting.created_at.desc())

    total = query.count()
    total_pages = max(1, (total + per_page - 1) // per_page)
    jobs = query.offset((page - 1) * per_page).limit(per_page).all()

    return json_ok({
        "items": [_job_to_dict(job) for job in jobs],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
    })


@api_jobs_bp.get("/mine")
@jwt_required()
@role_required("recruiter", "admin")
def list_my_jobs():
    user_id = int(get_jwt_identity())
    status_filter = (request.args.get("status") or "").strip().lower()
    try:
        page = max(1, int(request.args.get("page") or 1))
        per_page = min(50, max(1, int(request.args.get("per_page") or 10)))
    except (TypeError, ValueError):
        page, per_page = 1, 10

    base_q = (
        JobPosting.query
        .options(selectinload(JobPosting.tags), selectinload(JobPosting.company))
        .filter(JobPosting.recruiter_user_id == user_id)
    )
    if status_filter:
        base_q = base_q.filter(JobPosting.status == status_filter)
    base_q = base_q.order_by(JobPosting.created_at.desc())

    total = base_q.count()
    jobs = base_q.offset((page - 1) * per_page).limit(per_page).all()
    return json_ok({
        "items": [_job_to_dict(job) for job in jobs],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": max(1, (total + per_page - 1) // per_page),
    })


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

    enum_error = _validate_job_enums(data)
    if enum_error:
        return json_error(enum_error, 400)

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
        benefits=data.get("benefits"),
        education_level=data.get("education_level") or "any",
        location=data.get("location") or "",
        workplace_type=data.get("workplace_type") or "onsite",
        employment_type=data.get("employment_type") or "full-time",
        experience_level=data.get("experience_level") or "junior",
        salary_min=data.get("salary_min") or None,
        salary_max=data.get("salary_max") or None,
        salary_currency=data.get("salary_currency") or "VND",
        vacancy_count=data.get("vacancy_count") or 1,
        status=data.get("status") or "draft",
        is_featured=bool(data.get("is_featured", False)) if get_jwt().get("role") == "admin" else False,
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

    enum_error = _validate_job_enums(data)
    if enum_error:
        return json_error(enum_error, 400)

    for field in [
        "title",
        "slug",
        "summary",
        "description",
        "requirements",
        "responsibilities",
        "benefits",
        "education_level",
        "location",
        "workplace_type",
        "employment_type",
        "experience_level",
        "salary_min",
        "salary_max",
        "salary_currency",
        "vacancy_count",
        "status",
    ]:
        if field in data:
            setattr(job, field, data[field])

    if "is_featured" in data and get_jwt().get("role") == "admin":
        job.is_featured = bool(data["is_featured"])

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

    include_debug = (request.args.get("debug") or "").strip().lower() in {"1", "true", "yes"}
    results = _screen_results_for_job(job, include_debug=include_debug)
    return json_ok(results)


@api_jobs_bp.get("/<int:job_id>/screen/debug")
@jwt_required()
@role_required("recruiter", "admin")
def screen_job_resumes_debug(job_id):
    user_id = int(get_jwt_identity())
    job = JobPosting.query.options(selectinload(JobPosting.tags)).filter_by(id=job_id, recruiter_user_id=user_id).first()
    if not job:
        return json_error("Job not found.", 404)

    results = _screen_results_for_job(job, include_debug=True)
    return json_ok(
        {
            "job": {
                "id": job.id,
                "title": job.title,
                "experience_level": job.experience_level,
                "location": job.location,
                "tag_count": len(job.tags or []),
                "tags": [tag_to_dict(tag) for tag in (job.tags or [])],
            },
            "results": results,
        }
    )