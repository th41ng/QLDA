from ..models import CandidateProfile


def get_profile_by_user_id(user_id):
    return CandidateProfile.query.filter_by(user_id=user_id).first()
