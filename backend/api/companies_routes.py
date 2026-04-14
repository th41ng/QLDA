from sqlalchemy import func

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from . import json_ok, role_required
from ..core.extensions import db
from ..models import Company, JobPosting

api_companies_bp = Blueprint("api_companies", __name__)


def _company_to_dict(company: Company, openings: int = 0):
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
    }


@api_companies_bp.get("/featured")
def featured_companies():
    rows = (
        db.session.query(Company, func.count(JobPosting.id).label("openings"))
        .outerjoin(
            JobPosting,
            (JobPosting.company_id == Company.id) & (JobPosting.status == "published"),
        )
        .group_by(Company.id)
        .order_by(func.count(JobPosting.id).desc(), Company.company_name.asc())
        .limit(12)
        .all()
    )
    return json_ok([_company_to_dict(company, openings) for company, openings in rows])


@api_companies_bp.get("/me")
@jwt_required()
@role_required("recruiter", "admin")
def company_me():
    user_id = int(get_jwt_identity())
    company = Company.query.filter_by(recruiter_user_id=user_id).first()
    return json_ok(_company_to_dict(company, 0) if company else None)


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