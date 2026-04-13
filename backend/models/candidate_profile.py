from datetime import datetime

from ..core.extensions import db


class CandidateProfile(db.Model):
    __tablename__ = "candidate_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True)
    dob = db.Column(db.Date)
    gender = db.Column(db.String(20))
    address = db.Column(db.String(255))
    headline = db.Column(db.String(200))
    summary = db.Column(db.Text)
    current_title = db.Column(db.String(120))
    years_experience = db.Column(db.Integer, default=0)
    expected_salary = db.Column(db.String(80))
    desired_location = db.Column(db.String(120))
    education = db.Column(db.Text)
    experience = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
