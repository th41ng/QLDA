from datetime import datetime

from ..core.extensions import db


class CandidateCompanyFollow(db.Model):
    __tablename__ = "candidate_company_follows"

    candidate_user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id", ondelete="CASCADE"), primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    candidate = db.relationship("User", backref="followed_companies")
    company = db.relationship("Company", backref="candidate_follows")
