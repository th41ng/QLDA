from datetime import datetime

from flask import Blueprint, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from . import json_error, json_ok
from ..core.extensions import db
from ..core.security import hash_password, verify_password
from ..models import CandidateProfile, Company, User
from ..repositories import get_company_by_user_id, get_profile_by_user_id, get_user_by_email, get_user_by_id
from ..services.otp_service import OtpServiceError, resend_otp_request, send_otp_request, verify_otp_request

api_auth_bp = Blueprint("api_auth", __name__)


def _issue_token(user: User):
    token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
    return json_ok(
        {
            "token": token,
            "user": {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "role": user.role,
                "status": user.status,
            },
        },
        "Authenticated",
    )


def _normalize_register_role(role: str | None) -> str:
    normalized = (role or "").strip().lower()
    if normalized not in {"candidate", "recruiter"}:
        raise ValueError("Role is required.")
    return normalized


def _apply_registration_profile(user: User, payload: dict):
    user.phone = (payload.get("phone") or "").strip() or user.phone
    if user.role == "candidate":
        profile = get_profile_by_user_id(user.id) or CandidateProfile(user_id=user.id)
        profile.dob = payload.get("dob") or profile.dob
        if isinstance(profile.dob, str) and profile.dob:
            profile.dob = datetime.fromisoformat(profile.dob).date()
        profile.gender = payload.get("gender") or profile.gender
        profile.address = payload.get("address") or profile.address
        profile.headline = payload.get("headline") or profile.headline
        profile.summary = payload.get("summary") or profile.summary
        profile.current_title = payload.get("current_title") or profile.current_title
        years = payload.get("years_experience")
        profile.years_experience = int(years) if str(years).isdigit() else profile.years_experience
        profile.expected_salary = payload.get("expected_salary") or profile.expected_salary
        profile.desired_location = payload.get("desired_location") or profile.desired_location
        profile.education = payload.get("education") or profile.education
        profile.experience = payload.get("experience") or profile.experience
        db.session.add(profile)
    elif user.role == "recruiter":
        company = get_company_by_user_id(user.id) or Company(recruiter_user_id=user.id)
        company.company_name = (payload.get("company_name") or user.full_name).strip()
        company.tax_code = payload.get("tax_code") or company.tax_code
        company.website = payload.get("website") or company.website
        company.address = payload.get("company_address") or payload.get("address") or company.address
        company.description = payload.get("company_description") or company.description
        company.industry = payload.get("industry") or company.industry
        db.session.add(company)


@api_auth_bp.post("/register/password")
def register_password():
    data = request.get_json(force=True)
    try:
        role = _normalize_register_role(data.get("role"))
    except ValueError:
        return json_error("Vui lòng chọn vai trò.", 400)
    email = data.get("email", "").strip().lower()
    if get_user_by_email(email):
        return json_error("Email already exists.", 409)
    user = User(
        full_name=data.get("full_name", "").strip(),
        email=email,
        password_hash=hash_password(data.get("password", "")),
        role=role,
        auth_method_preference="password",
        email_verified=True,
        status="active",
        phone=(data.get("phone") or "").strip() or None,
    )
    db.session.add(user)
    db.session.flush()
    _apply_registration_profile(user, data)
    db.session.commit()
    return _issue_token(user)


def _do_otp_send(purpose_override: str | None = None):
    data = request.get_json(force=True)
    purpose = purpose_override or data.get("purpose")
    try:
        role = data.get("role")
        if purpose == "register":
            role = _normalize_register_role(role)
        result = send_otp_request(
            email=data.get("email"),
            purpose=purpose,
            request_ip=_request_ip(),
            role=role,
            full_name=data.get("fullName") or data.get("full_name"),
            password=data.get("password"),
            confirm_password=data.get("confirmPassword") or data.get("confirm_password"),
        )
    except OtpServiceError as exc:
        return json_error(exc.message, exc.status, **exc.extra)
    return json_ok(
        {
            "email": result.email,
            "purpose": result.purpose,
            "expiresIn": result.expires_in,
            "resendIn": result.resend_in,
        },
        "OTP sent successfully",
    )


def _do_otp_verify(purpose_override: str | None = None):
    data = request.get_json(force=True)
    purpose = purpose_override or data.get("purpose")
    try:
        verified = verify_otp_request(
            email=data.get("email"),
            purpose=purpose,
            code=data.get("otp") or data.get("code"),
        )
    except OtpServiceError as exc:
        return json_error(exc.message, exc.status, **exc.extra)

    if verified.purpose == "login":
        user = get_user_by_email(verified.email)
        if not user:
            return json_error("Tài khoản không tồn tại", 404)
        if user.status != "active":
            return json_error("Tài khoản hiện không khả dụng", 403)
        if user.role == "admin":
            return json_error("Admin must login through backend web.", 403)
        user.auth_method_preference = "otp"
        user.last_login_at = datetime.utcnow()
        db.session.commit()
        return _issue_token(user)

    payload = verified.payload or {}
    if get_user_by_email(verified.email):
        return json_error("Email already exists.", 409)
    password_hash_temp = payload.get("password_hash_temp")
    if not password_hash_temp:
        return json_error("Missing registration payload.", 400)
    try:
        role = _normalize_register_role(payload.get("role"))
    except ValueError:
        return json_error("Vui lòng chọn vai trò.", 400)

    user = User(
        full_name=payload.get("full_name", "").strip(),
        email=verified.email,
        password_hash=password_hash_temp,
        role=role,
        auth_method_preference="otp",
        email_verified=True,
        status="active",
        phone=(payload.get("phone") or "").strip() or None,
    )
    db.session.add(user)
    db.session.flush()
    _apply_registration_profile(user, payload)
    db.session.commit()
    return _issue_token(user)


@api_auth_bp.post("/otp/send")
def otp_send():
    return _do_otp_send()


@api_auth_bp.post("/otp/verify")
def otp_verify():
    return _do_otp_verify()


@api_auth_bp.post("/otp/resend")
def otp_resend():
    data = request.get_json(force=True)
    try:
        result = resend_otp_request(
            email=data.get("email"),
            purpose=data.get("purpose"),
            request_ip=_request_ip(),
        )
    except OtpServiceError as exc:
        return json_error(exc.message, exc.status, **exc.extra)
    return json_ok(
        {
            "email": result.email,
            "purpose": result.purpose,
            "expiresIn": result.expires_in,
            "resendIn": result.resend_in,
        },
        "OTP resent successfully",
    )


@api_auth_bp.post("/register/otp/start")
def register_otp_start():
    return _do_otp_send(purpose_override="register")


@api_auth_bp.post("/register/otp/verify")
def register_otp_verify():
    return _do_otp_verify(purpose_override="register")


@api_auth_bp.post("/login/password")
def login_password():
    data = request.get_json(force=True)
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    user = get_user_by_email(email)
    if not user:
        return json_error("Tài khoản không tồn tại", 404)
    if user.status != "active":
        return json_error("Tài khoản hiện không khả dụng", 403)
    if user.role == "admin":
        return json_error("Admin must login through backend web.", 403)
    if not verify_password(user.password_hash, password):
        return json_error("Mật khẩu không đúng", 401)
    user.last_login_at = datetime.utcnow()
    db.session.commit()
    return _issue_token(user)


@api_auth_bp.post("/login/otp/start")
def login_otp_start():
    return _do_otp_send(purpose_override="login")


@api_auth_bp.post("/login/otp/verify")
def login_otp_verify():
    return _do_otp_verify(purpose_override="login")


@api_auth_bp.get("/me")
@jwt_required()
def me():
    user = get_user_by_id(int(get_jwt_identity()))
    if not user:
        return json_error("User not found.", 404)
    return json_ok(
        {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "status": user.status,
            "auth_method_preference": user.auth_method_preference,
            "phone": user.phone,
            "avatar_url": user.avatar_url,
            "company": user.company.company_name if user.company else None,
        }
    )


def _request_ip():
    forwarded_for = request.headers.get("X-Forwarded-For", "").strip()
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.headers.get("X-Real-IP") or request.remote_addr or ""
