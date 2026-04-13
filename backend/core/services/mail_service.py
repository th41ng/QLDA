from flask import current_app
from flask_mail import Message

from ..extensions import mail


def send_mail(subject: str, recipients: list[str], body: str, html: str | None = None) -> None:
    message = Message(subject=subject, recipients=recipients, body=body, html=html)
    mail.send(message)


def send_otp_email(email: str, code: str, purpose: str) -> None:
    expires_minutes = int(current_app.config.get("OTP_EXPIRES_MINUTES", 5))
    purpose_label = {
        "login": "đăng nhập",
        "register": "đăng ký",
    }.get(purpose, purpose)
    subject = f"Mã OTP {purpose_label} JOBPORTAL"
    body = (
        f"Mã OTP của bạn cho mục đích {purpose_label} là: {code}. "
        f"Mã sẽ hết hạn sau {expires_minutes} phút."
    )
    html = (
        f"<div style='font-family:Arial,sans-serif;line-height:1.6'>"
        f"<h2 style='margin:0 0 12px;color:#1d4ed8'>JOBPORTAL</h2>"
        f"<p>Mã OTP của bạn cho mục đích <b>{purpose_label}</b> là:</p>"
        f"<div style='font-size:28px;font-weight:800;letter-spacing:6px;padding:12px 16px;"
        f"border-radius:12px;background:#eff6ff;color:#0f172a;display:inline-block'>{code}</div>"
        f"<p style='margin-top:12px'>Mã có hiệu lực trong <b>{expires_minutes} phút</b>.</p>"
        f"<p>Nếu bạn không yêu cầu thao tác này, vui lòng bỏ qua email.</p>"
        f"</div>"
    )
    send_mail(subject, [email], body, html)
