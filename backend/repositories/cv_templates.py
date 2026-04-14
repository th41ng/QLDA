from ..models import CvTemplate


def count_active_cv_templates():
    return CvTemplate.query.filter(CvTemplate.is_active.is_(True)).count()


def list_active_cv_templates():
    return CvTemplate.query.filter(CvTemplate.is_active.is_(True)).order_by(CvTemplate.created_at.desc()).all()
