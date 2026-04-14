from datetime import datetime

from ..core.extensions import db
from .base import job_tags


class JobPosting(db.Model):
    __tablename__ = "job_postings"

    id = db.Column(db.Integer, primary_key=True)
    recruiter_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False)
    title = db.Column(db.String(180), nullable=False)
    slug = db.Column(db.String(220), nullable=False, unique=True, index=True)
    summary = db.Column(db.String(255))
    description = db.Column(db.Text, nullable=False)
    requirements = db.Column(db.Text, nullable=False)
    responsibilities = db.Column(db.Text)
    location = db.Column(db.String(120), nullable=False)
    workplace_type = db.Column(db.String(40), default="onsite")
    employment_type = db.Column(db.String(40), default="full-time")
    experience_level = db.Column(db.String(40), default="junior")
    salary_min = db.Column(db.Integer)
    salary_max = db.Column(db.Integer)
    salary_currency = db.Column(db.String(10), default="VND")
    vacancy_count = db.Column(db.Integer, default=1)
    deadline = db.Column(db.Date)
    status = db.Column(db.String(20), default="published")
    is_featured = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = db.Column(db.DateTime)

    tags = db.relationship("Tag", secondary=job_tags, backref="jobs")
