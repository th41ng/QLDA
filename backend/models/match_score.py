from datetime import datetime

from ..core.extensions import db


class MatchScore(db.Model):
    __tablename__ = "match_scores"

    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey("job_postings.id"), nullable=False)
    resume_id = db.Column(db.Integer, db.ForeignKey("resumes.id"), nullable=False)
    candidate_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    score = db.Column(db.Float, default=0)
    breakdown_json = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
