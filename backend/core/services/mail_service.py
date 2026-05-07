from flask import current_app
from flask_mail import Message

from ..extensions import mail


def send_mail(subject: str, recipients: list[str], body: str, html: str | None = None) -> None:
    cfg = current_app.config
    mail_username = (cfg.get("MAIL_USERNAME") or "").strip()
    mail_password_configured = bool((cfg.get("MAIL_PASSWORD") or "").strip())
    mail_server = cfg.get("MAIL_SERVER")
    mail_port = cfg.get("MAIL_PORT")
    if not mail_username or not mail_password_configured:
        raise RuntimeError("Mail is not configured (missing MAIL_USERNAME/MAIL_PASSWORD)")

    message = Message(
        subject=subject,
        recipients=recipients,
        body=body,
        html=html,
        sender=cfg.get("MAIL_DEFAULT_SENDER") or mail_username,
    )
    try:
        mail.send(message)
    except Exception:  # noqa: BLE001
        current_app.logger.exception(
            "Failed to send email via SMTP",
            extra={
                "smtp_server": mail_server,
                "smtp_port": mail_port,
                "smtp_tls": bool(cfg.get("MAIL_USE_TLS")),
                "smtp_ssl": bool(cfg.get("MAIL_USE_SSL")),
                "mail_username_set": bool(mail_username),
                "recipients": recipients,
            },
        )
        raise


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
