from ..core.extensions import db


job_tags = db.Table(
    "job_tags",
    db.Column("job_id", db.Integer, db.ForeignKey("job_postings.id", ondelete="CASCADE"), primary_key=True),
    db.Column("tag_id", db.Integer, db.ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)
