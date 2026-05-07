from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from flask import current_app

from ..core.extensions import db
from ..core.security import hash_otp, hash_password, make_otp, verify_otp
from ..models import OtpCode
from ..repositories import get_user_by_email
from ..services.mail_service import send_otp_email

ALLOWED_PURPOSES = {"login", "register"}
ALLOWED_ROLES = {"candidate", "recruiter"}


class OtpServiceError(Exception):
    def __init__(self, message: str, status: int = 400, **extra: Any):
        super().__init__(message)
        self.message = message
        self.status = status
        self.extra = extra


@dataclass
class OtpSendResult:
    email: str
    purpose: str
    expires_in: int
    resend_in: int


@dataclass
class OtpVerifyResult:
    email: str
    purpose: str
    payload: dict[str, Any]


def send_otp_request(
    *,
    email: str,
    purpose: str,
    request_ip: str | None = None,
    role: str | None = None,
    full_name: str | None = None,
    password: str | None = None,
    confirm_password: str | None = None,
    password_hash_temp: str | None = None,
    payload: dict[str, Any] | None = None,
) -> OtpSendResult:
    email = _normalize_email(email)
    purpose = _normalize_purpose(purpose)
    now = datetime.utcnow()
    resend_seconds = current_app.config.get("OTP_RESEND_SECONDS", 60)
    expires_minutes = current_app.config.get("OTP_EXPIRES_MINUTES", 5)
    max_attempts = current_app.config.get("OTP_MAX_ATTEMPTS", 5)

    if purpose == "login":
        user = get_user_by_email(email)
        if not user:
            raise OtpServiceError("Tài khoản không tồn tại", 404)
        if user.status != "active":
            raise OtpServiceError("Tài khoản hiện không khả dụng", 403)
        if user.role == "admin":
            raise OtpServiceError("Admin đăng nhập ở hệ thống backend riêng.", 403)
        role = user.role
        payload_data = None
    else:
        role = _normalize_role(role)
        if not full_name or not full_name.strip():
            raise OtpServiceError("Vui lòng nhập họ và tên.", 400)
        if get_user_by_email(email):
            raise OtpServiceError("Email đã tồn tại.", 409)
        payload_data = dict(payload or {})
        password_hash_temp = password_hash_temp or payload_data.get("password_hash_temp")
        if not password_hash_temp:
            if not password:
                raise OtpServiceError("Vui lòng nhập mật khẩu.", 400)
            if len(password) < 6:
                raise OtpServiceError("Mật khẩu phải có ít nhất 6 ký tự.", 400)
            if confirm_password is not None and password != confirm_password:
                raise OtpServiceError("Mật khẩu xác nhận không khớp.", 400)
            password_hash_temp = hash_password(password)
        payload_data.update(
            {
                "full_name": full_name.strip(),
                "role": role,
                "password_hash_temp": password_hash_temp,
            }
        )

    _enforce_send_limits(email=email, purpose=purpose, request_ip=request_ip, now=now)

    payload_data = payload_data or {}
    _invalidate_previous_otps(email=email, purpose=purpose, now=now)

    code = make_otp()
    record = OtpCode(
        email=email,
        role=role or "candidate",
        purpose=purpose,
        code_hash=hash_otp(code),
        payload_json=payload_data,
        expires_at=now + timedelta(minutes=expires_minutes),
        resend_available_at=now + timedelta(seconds=resend_seconds),
        attempts=0,
        max_attempts=max_attempts,
        request_ip=request_ip,
    )
    db.session.add(record)
    db.session.commit()

    try:
        send_otp_email(email, code, purpose)
    except Exception as exc:  # noqa: BLE001
        current_app.logger.exception("Failed to send OTP email")
        db.session.delete(record)
        db.session.commit()

        extra: dict[str, Any] = {"mailError": type(exc).__name__}
        if current_app.config.get("EXPOSE_MAIL_ERRORS") or current_app.debug:
            extra["mailErrorDetail"] = str(exc)

        raise OtpServiceError("Không thể gửi email OTP. Vui lòng thử lại.", 502, **extra) from exc

    return OtpSendResult(
        email=email,
        purpose=purpose,
        expires_in=int(expires_minutes * 60),
        resend_in=int(resend_seconds),
    )


def resend_otp_request(*, email: str, purpose: str, request_ip: str | None = None) -> OtpSendResult:
    email = _normalize_email(email)
    purpose = _normalize_purpose(purpose)
    latest = _get_latest_record(email=email, purpose=purpose)
    if not latest:
        raise OtpServiceError("Không có OTP hợp lệ để gửi lại.", 404)
    if latest.resend_available_at and latest.resend_available_at > datetime.utcnow():
        retry_after = int((latest.resend_available_at - datetime.utcnow()).total_seconds())
        raise OtpServiceError("Bạn cần chờ trước khi gửi lại OTP.", 429, resendIn=retry_after)

    payload = latest.payload_json or {}
    if purpose == "login":
        return send_otp_request(email=email, purpose=purpose, request_ip=request_ip)

    return send_otp_request(
        email=email,
        purpose=purpose,
        request_ip=request_ip,
        role=payload.get("role"),
        full_name=payload.get("full_name"),
        password_hash_temp=payload.get("password_hash_temp"),
        payload=payload,
    )


def verify_otp_request(*, email: str, purpose: str, code: str) -> OtpVerifyResult:
    email = _normalize_email(email)
    purpose = _normalize_purpose(purpose)
    code = (code or "").strip()

    if not code or len(code) != 6 or not code.isdigit():
        raise OtpServiceError("OTP phải gồm 6 chữ số.", 400)

    record = _get_latest_record(email=email, purpose=purpose)
    if not record:
        raise OtpServiceError("OTP không hợp lệ hoặc đã hết hạn.", 400)

    now = datetime.utcnow()
    if record.used_at:
        raise OtpServiceError("OTP đã được sử dụng.", 400)
    if record.expires_at < now:
        db.session.delete(record)
        db.session.commit()
        raise OtpServiceError("OTP đã hết hạn.", 400)
    if record.attempts >= (record.max_attempts or current_app.config.get("OTP_MAX_ATTEMPTS", 5)):
        raise OtpServiceError("Bạn đã nhập sai quá số lần cho phép.", 429)

    if not verify_otp(record.code_hash, code):
        record.attempts += 1
        db.session.commit()
        remaining = max((record.max_attempts or 5) - record.attempts, 0)
        raise OtpServiceError(
            "OTP không đúng.",
            400,
            remainingAttempts=remaining,
        )

    payload = record.payload_json or {}
    db.session.delete(record)
    db.session.commit()
    return OtpVerifyResult(email=email, purpose=purpose, payload=payload)


def _normalize_email(email: str) -> str:
    normalized = (email or "").strip().lower()
    if not normalized or "@" not in normalized:
        raise OtpServiceError("Email không hợp lệ.", 400)
    return normalized


def _normalize_purpose(purpose: str) -> str:
    normalized = (purpose or "").strip().lower()
    if normalized not in ALLOWED_PURPOSES:
        raise OtpServiceError("Mục đích OTP không hợp lệ.", 400)
    return normalized


def _normalize_role(role: str | None) -> str:
    normalized = (role or "").strip().lower()
    if normalized not in ALLOWED_ROLES:
        raise OtpServiceError("Vui lòng chọn vai trò.", 400)
    return normalized


def _get_latest_record(*, email: str, purpose: str) -> OtpCode | None:
    return (
        OtpCode.query.filter_by(email=email, purpose=purpose)
        .order_by(OtpCode.created_at.desc())
        .first()
    )


def _invalidate_previous_otps(*, email: str, purpose: str, now: datetime) -> None:
    latest_records = OtpCode.query.filter_by(email=email, purpose=purpose, used_at=None).all()
    for record in latest_records:
        record.used_at = now


def _enforce_send_limits(*, email: str, purpose: str, request_ip: str | None, now: datetime) -> None:
    window_start = now - timedelta(hours=1)
    max_sends = current_app.config.get("OTP_MAX_SENDS_PER_HOUR", 5)

    email_count = (
        OtpCode.query.filter(
            OtpCode.email == email,
            OtpCode.purpose == purpose,
            OtpCode.created_at >= window_start,
        ).count()
    )
    if email_count >= max_sends:
        raise OtpServiceError("Bạn đã yêu cầu OTP quá nhiều lần. Vui lòng thử lại sau.", 429)

    if request_ip:
        ip_count = (
            OtpCode.query.filter(
                OtpCode.request_ip == request_ip,
                OtpCode.purpose == purpose,
                OtpCode.created_at >= window_start,
            ).count()
        )
        if ip_count >= max_sends:
            raise OtpServiceError("Bạn đã yêu cầu OTP quá nhiều lần từ IP này.", 429)
