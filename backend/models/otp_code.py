from datetime import datetime

from ..core.extensions import db


class OtpCode(db.Model):
    __tablename__ = "otp_codes"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    email = db.Column(db.String(120), nullable=False, index=True)
    role = db.Column(db.String(20), nullable=False)
    purpose = db.Column(db.String(30), nullable=False)
    code_hash = db.Column(db.String(255), nullable=False)
    payload_json = db.Column(db.JSON)
    expires_at = db.Column(db.DateTime, nullable=False)
    resend_available_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime)
    attempts = db.Column(db.Integer, default=0)
    max_attempts = db.Column(db.Integer, default=5)
    request_ip = db.Column(db.String(64))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
