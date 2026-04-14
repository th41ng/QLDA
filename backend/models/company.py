from datetime import datetime

from ..core.extensions import db


class Company(db.Model):
    __tablename__ = "companies"

    id = db.Column(db.Integer, primary_key=True)
    recruiter_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True)
    company_name = db.Column(db.String(200), nullable=False)
    tax_code = db.Column(db.String(50))
    website = db.Column(db.String(255))
    address = db.Column(db.String(255))
    description = db.Column(db.Text)
    logo_url = db.Column(db.String(255))
    industry = db.Column(db.String(120))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    jobs = db.relationship("JobPosting", backref="company", cascade="all, delete-orphan")
