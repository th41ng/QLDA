from sqlalchemy.orm import selectinload

from ..models import Resume


def list_resumes_by_user_id(user_id):
    return (
        Resume.query.options(selectinload(Resume.tags))
        .filter_by(user_id=user_id)
        .order_by(Resume.is_primary.desc(), Resume.created_at.desc())
        .all()
    )


def get_resume_by_id(resume_id):
    return Resume.query.options(selectinload(Resume.tags)).filter_by(id=resume_id).first()


def list_screenable_resumes():
    return (
        Resume.query.options(
            selectinload(Resume.tags),
            selectinload(Resume.user),
        )
        .filter(Resume.source_type.in_(["manual", "upload", "generated"]))
        .all()
    )
