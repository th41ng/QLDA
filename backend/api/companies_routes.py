from sqlalchemy import func
from sqlalchemy.orm import selectinload

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from . import json_error, json_ok, role_required
from ..core.extensions import db
from ..models import CandidateCompanyFollow, Company, JobPosting, Tag
from ..schemas import tag_to_dict

api_companies_bp = Blueprint("api_companies", __name__)


def _published_jobs(company: Company):
    return (
        JobPosting.query
        .options(selectinload(JobPosting.tags))
        .filter(
            JobPosting.company_id == company.id,
            JobPosting.status == "published",
        )
        .order_by(
            JobPosting.published_at.desc(),
            JobPosting.created_at.desc(),
        )
        .all()
    )


def _job_to_summary(job: JobPosting):
    return {
        "id": job.id,
        "title": job.title,
        "slug": job.slug,
        "summary": job.summary,
        "location": job.location,
        "workplace_type": job.workplace_type,
        "employment_type": job.employment_type,
        "experience_level": job.experience_level,
        "vacancy_count": job.vacancy_count,
        "deadline": job.deadline.isoformat() if job.deadline else None,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "published_at": job.published_at.isoformat() if job.published_at else None,
        "tags": [tag_to_dict(tag) for tag in (job.tags or [])],
    }


def _company_to_dict(company: Company, openings: int | None = None, active_jobs_count: int | None = None):
    jobs = _published_jobs(company)
    if openings is None:
        openings = sum(int(job.vacancy_count or 0) for job in jobs)
    if active_jobs_count is None:
        active_jobs_count = len(jobs)
    tags = []
    seen_tags = set()
    locations = []
    seen_locations = set()
    hiring_focus = []
    seen_focus = set()

    for job in jobs:
        if job.location and job.location not in seen_locations:
            seen_locations.add(job.location)
            locations.append(job.location)
        if job.title and job.title not in seen_focus:
            seen_focus.add(job.title)
            hiring_focus.append(job.title)
        for tag in job.tags or []:
            if tag.name and tag.name not in seen_tags:
                seen_tags.add(tag.name)
                tags.append(tag.name)

    return {
        "id": company.id,
        "recruiter_user_id": company.recruiter_user_id,
        "company_name": company.company_name,
        "tax_code": company.tax_code,
        "website": company.website,
        "address": company.address,
        "description": company.description,
        "logo_url": company.logo_url,
        "industry": company.industry,
        "openings": int(openings or 0),
        "active_jobs_count": int(active_jobs_count or 0),
        "locations": locations,
        "tags": tags[:8],
        "hiring_focus": hiring_focus[:4],
        "latest_jobs": [_job_to_summary(job) for job in jobs[:5]],
        "created_at": company.created_at.isoformat() if company.created_at else None,
        "updated_at": company.updated_at.isoformat() if company.updated_at else None,
    }


@api_companies_bp.get("/featured")
def featured_companies():
    q = (request.args.get("q") or "").strip()
    try:
        page = max(1, int(request.args.get("page", 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        per_page = min(100, max(1, int(request.args.get("per_page", 6))))
    except (TypeError, ValueError):
        per_page = 6

    base_query = (
        db.session.query(
            Company,
            func.count(JobPosting.id).label("active_jobs_count"),
            func.coalesce(func.sum(JobPosting.vacancy_count), 0).label("openings"),
        )
        .outerjoin(
            JobPosting,
            (JobPosting.company_id == Company.id) & (JobPosting.status == "published"),
        )
        .group_by(Company.id)
    )

    if q:
        like = f"%{q}%"
        base_query = base_query.filter(
            Company.company_name.ilike(like)
            | Company.industry.ilike(like)
            | Company.address.ilike(like)
            | Company.description.ilike(like)
        )

    total = base_query.count()
    rows = (
        base_query
        .order_by(func.count(JobPosting.id).desc(), Company.company_name.asc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return json_ok({
        "companies": [_company_to_dict(company, openings, active_jobs_count) for company, active_jobs_count, openings in rows],
        "total": total,
        "page": page,
        "per_page": per_page,
        "has_more": (page * per_page) < total,
    })


@api_companies_bp.get("/me")
@jwt_required()
@role_required("recruiter", "admin")
def company_me():
    user_id = int(get_jwt_identity())
    company = Company.query.filter_by(recruiter_user_id=user_id).first()
    return json_ok(_company_to_dict(company) if company else None)


@api_companies_bp.put("/me")
@api_companies_bp.patch("/me")
@jwt_required()
@role_required("recruiter", "admin")
def company_update_me():
    user_id = int(get_jwt_identity())
    company = Company.query.filter_by(recruiter_user_id=user_id).first()
    if not company:
        company = Company(recruiter_user_id=user_id, company_name="")
        db.session.add(company)

    data = request.get_json(force=True)
    for field in ["company_name", "tax_code", "website", "address", "description", "logo_url", "industry"]:
        if field in data:
            setattr(company, field, data[field])

    if not (company.company_name or "").strip():
        company.company_name = "Company"

    db.session.commit()
    return json_ok(_company_to_dict(company), "Company updated")


@api_companies_bp.get("/follows")
@jwt_required()
@role_required("candidate")
def followed_companies():
    user_id = int(get_jwt_identity())
    follows = (
        CandidateCompanyFollow.query.options(
            selectinload(CandidateCompanyFollow.company)
        )
        .filter_by(candidate_user_id=user_id)
        .order_by(CandidateCompanyFollow.created_at.desc())
        .all()
    )
    companies = [_company_to_dict(follow.company) for follow in follows if follow.company]
    return json_ok({
        "company_ids": [company["id"] for company in companies],
        "companies": companies,
    })


@api_companies_bp.put("/<int:company_id>/follow")
@jwt_required()
@role_required("candidate")
def follow_company(company_id):
    user_id = int(get_jwt_identity())
    company = db.session.get(Company, company_id)
    if not company:
        return json_error("Company not found", 404)

    follow = db.session.get(CandidateCompanyFollow, (user_id, company_id))
    if not follow:
        db.session.add(CandidateCompanyFollow(candidate_user_id=user_id, company_id=company_id))
        db.session.commit()
    return json_ok({"company_id": company_id, "followed": True}, "Company followed")


@api_companies_bp.delete("/<int:company_id>/follow")
@jwt_required()
@role_required("candidate")
def unfollow_company(company_id):
    user_id = int(get_jwt_identity())
    follow = db.session.get(CandidateCompanyFollow, (user_id, company_id))
    if follow:
        db.session.delete(follow)
        db.session.commit()
    return json_ok({"company_id": company_id, "followed": False}, "Company unfollowed")
