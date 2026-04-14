from datetime import datetime

from sqlalchemy.orm import selectinload

from ..core.security import slugify
from ..models import Category, JobPosting, Tag


def get_job_query():
    return JobPosting.query.options(selectinload(JobPosting.tags), selectinload(JobPosting.company))


def list_published_jobs():
    return get_job_query().filter(JobPosting.status == "published").order_by(JobPosting.is_featured.desc(), JobPosting.created_at.desc()).all()


def list_jobs(filters=None):
    filters = filters or {}
    query = get_job_query().filter(JobPosting.status == filters.get("status", "published"))

    q = (filters.get("q") or "").strip().lower()
    location = (filters.get("location") or "").strip().lower()
    tags = [item.strip().lower() for item in (filters.get("tags") or "").split(",") if item.strip()]
    experience = (filters.get("experience") or "").strip().lower()
    industry = (filters.get("industry") or "").strip().lower()

    if q:
        like = f"%{q}%"
        query = query.filter(
            (JobPosting.title.ilike(like))
            | (JobPosting.description.ilike(like))
            | (JobPosting.requirements.ilike(like))
            | (JobPosting.summary.ilike(like))
        )
    if location:
        query = query.filter(JobPosting.location.ilike(f"%{location}%"))
    if experience:
        query = query.filter(JobPosting.experience_level.ilike(f"%{experience}%"))
    if tags or industry:
        query = query.join(JobPosting.tags)
        if tags:
            query = query.filter(Tag.slug.in_(tags))
        if industry:
            query = query.join(Tag.category).filter(Category.slug == slugify(industry))

    return query.order_by(JobPosting.is_featured.desc(), JobPosting.created_at.desc()).all()


def get_job_by_id(job_id):
    return get_job_query().filter_by(id=job_id).first()


def list_jobs_for_recruiter(recruiter_user_id, status=None):
    query = get_job_query().filter(JobPosting.recruiter_user_id == recruiter_user_id)
    if status:
        query = query.filter(JobPosting.status == status)
    return query.order_by(JobPosting.created_at.desc()).all()


def create_job_record(user_id, company_id, data):
    title = data.get("title", "").strip()
    slug = slugify(data.get("slug") or title)
    if JobPosting.query.filter_by(slug=slug).first():
        slug = f"{slug}-{int(datetime.utcnow().timestamp())}"

    job = JobPosting(
        recruiter_user_id=user_id,
        company_id=company_id,
        title=title,
        slug=slug,
        summary=data.get("summary", "").strip(),
        description=data.get("description", "").strip(),
        requirements=data.get("requirements", "").strip(),
        responsibilities=data.get("responsibilities", "").strip(),
        location=data.get("location", "").strip(),
        workplace_type=data.get("workplace_type", "onsite"),
        employment_type=data.get("employment_type", "full-time"),
        experience_level=data.get("experience_level", "junior"),
        salary_min=data.get("salary_min"),
        salary_max=data.get("salary_max"),
        salary_currency=data.get("salary_currency", "VND"),
        vacancy_count=data.get("vacancy_count", 1),
        status=data.get("status", "published"),
    )
    if data.get("deadline"):
        job.deadline = datetime.fromisoformat(data["deadline"]).date()
    if job.status == "published":
        job.published_at = datetime.utcnow()
    return job


def apply_tags(job, tag_ids):
    if tag_ids:
        job.tags = Tag.query.filter(Tag.id.in_(tag_ids)).all()


def delete_job_record(job):
    return job
