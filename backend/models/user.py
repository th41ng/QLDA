from datetime import datetime

from flask_login import UserMixin

from ..core.extensions import db
from .base import job_tags, resume_tags


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    auth_method_preference = db.Column(db.String(20), default="password")
    status = db.Column(db.String(20), default="active")
    email_verified = db.Column(db.Boolean, default=False)
    phone = db.Column(db.String(30))
    avatar_url = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = db.Column(db.DateTime)

    candidate_profile = db.relationship("CandidateProfile", backref="user", uselist=False, cascade="all, delete-orphan")
    company = db.relationship("Company", backref="recruiter", uselist=False, cascade="all, delete-orphan")
    resumes = db.relationship("Resume", backref="user", cascade="all, delete-orphan")
    jobs = db.relationship("JobPosting", backref="recruiter", cascade="all, delete-orphan")
    applications = db.relationship("Application", backref="candidate", cascade="all, delete-orphan")
    otp_codes = db.relationship("OtpCode", backref="user", cascade="all, delete-orphan")
