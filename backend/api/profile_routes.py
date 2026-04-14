from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from . import json_error, json_ok, role_required
from ..core.extensions import db
from ..services.storage_service import upload_image
from ..models import CandidateProfile
from ..repositories import get_profile_by_user_id, get_user_by_id
from ..schemas import profile_to_dict

api_profiles_bp = Blueprint("api_profiles", __name__)


@api_profiles_bp.get("/me")
@jwt_required()
@role_required("candidate")
def get_profile():
    user = get_user_by_id(int(get_jwt_identity()))
    profile = get_profile_by_user_id(user.id)
    return json_ok(profile_to_dict(profile))


@api_profiles_bp.put("/me")
@api_profiles_bp.patch("/me")
@jwt_required()
@role_required("candidate")
def update_profile():
    user = get_user_by_id(int(get_jwt_identity()))
    data = request.get_json(force=True) if request.is_json else request.form.to_dict(flat=True)
    profile = get_profile_by_user_id(user.id)
    if not profile:
        profile = CandidateProfile(user_id=user.id)
        db.session.add(profile)
    for field in [
        "dob",
        "gender",
        "address",
        "headline",
        "summary",
        "current_title",
        "years_experience",
        "expected_salary",
        "desired_location",
        "education",
        "experience",
    ]:
        if field in data:
            value = data[field]
            if field == "dob" and value:
                from datetime import date

                value = date.fromisoformat(value)
            setattr(profile, field, value)
    avatar_file = request.files.get("avatar_file")
    if avatar_file and avatar_file.filename:
        uploaded = upload_image(avatar_file, folder="jobportal/avatars", public_id=f"user-{user.id}")
        if uploaded:
            user.avatar_url = uploaded.url
    db.session.commit()
    return json_ok(profile_to_dict(profile))
