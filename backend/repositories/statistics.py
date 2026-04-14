from sqlalchemy import func

from ..core.extensions import db
from ..models import Category, JobPosting
from .cv_templates import count_active_cv_templates


def count_published_jobs():
    return JobPosting.query.filter(JobPosting.status == "published").count()


def count_published_employers():
    return (
        db.session.query(func.count(func.distinct(JobPosting.company_id)))
        .filter(JobPosting.status == "published")
        .scalar()
        or 0
    )


def count_active_categories():
    return Category.query.filter(Category.is_active.is_(True)).count()


def count_cv_templates():
    return count_active_cv_templates()
