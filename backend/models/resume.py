from datetime import datetime

from ..core.extensions import db
from .base import resume_tags


class Resume(db.Model):
    __tablename__ = "resumes"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    title = db.Column(db.String(180), nullable=False)
    source_type = db.Column(db.String(20), nullable=False, default="manual")
    template_name = db.Column(db.String(80))
    original_filename = db.Column(db.String(255))
    stored_path = db.Column(db.String(500))
    file_ext = db.Column(db.String(10))
    mime_type = db.Column(db.String(120))
    raw_text = db.Column(db.Text)
    structured_json = db.Column(db.JSON)
    generated_pdf_path = db.Column(db.String(500))
    generated_docx_path = db.Column(db.String(500))
    is_primary = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tags = db.relationship("Tag", secondary=resume_tags, backref="resumes")
    applications = db.relationship("Application", backref="resume", cascade="all, delete-orphan")
    match_scores = db.relationship("MatchScore", backref="resume", cascade="all, delete-orphan")
