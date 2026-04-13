from ..models import Company


def get_company_by_user_id(user_id):
    return Company.query.filter_by(recruiter_user_id=user_id).first()
