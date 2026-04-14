from datetime import datetime

from ..core.extensions import db


class CvTemplate(db.Model):
    __tablename__ = "cv_templates"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False, unique=True)
    slug = db.Column(db.String(180), nullable=False, unique=True, index=True)
    summary = db.Column(db.String(255))
    description = db.Column(db.Text)
    thumbnail_url = db.Column(db.String(255))
    preview_url = db.Column(db.String(255))
    file_format = db.Column(db.String(20), default="both")
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
