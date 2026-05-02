"""
Application service for handling business logic related to applications.
"""

from typing import Optional
import logging

from ..core.extensions import db
from ..models import Application, JobPosting, Notification
from .mail_service import send_mail
from flask import current_app

logger = logging.getLogger(__name__)


class ApplicationServiceError(Exception):
    """Base exception for application service errors."""
    pass


class ApplicationNotFoundError(ApplicationServiceError):
    """Raised when application is not found."""
    pass


class InvalidStatusError(ApplicationServiceError):
    """Raised when status is invalid."""
    pass


class MissingReasonError(ApplicationServiceError):
    """Raised when reason is required but not provided."""
    pass


VALID_STATUSES = {"submitted", "reviewing", "accepted", "rejected"}
STATUSES_REQUIRING_REASON = {"rejected"}
STATUSES_REQUIRING_NOTIFICATION = {"accepted", "rejected"}


def _build_status_message(status: str, job_title: str, reason: str | None = None):
    """Build notification title and message based on status."""
    title_map = {
        "accepted": "Chúc mừng! Hồ sơ ứng tuyển được chấp nhận",
        "rejected": "Kết quả hồ sơ ứng tuyển",
    }
    message_map = {
        "accepted": f"Chúc mừng! Hồ sơ của bạn cho vị trí {job_title} đã được chấp nhận.",
        "rejected": f"Hồ sơ của bạn cho vị trí {job_title} đã bị từ chối.",
    }
    title = title_map.get(status, "Cập nhật hồ sơ ứng tuyển")
    message = message_map.get(status, f"Hồ sơ ứng tuyển cho vị trí {job_title} vừa được cập nhật.")
    if reason:
        message = f"{message} Lý do: {reason}"
    return title, message


def _notify_candidate_for_status(application: Application, reason: str | None = None):
    """Send notification and email to candidate when application status changes."""
    candidate = application.candidate
    if not candidate:
        return

    job_title = application.job.title if application.job else f"#{application.job_id}"
    title, message = _build_status_message(application.status, job_title, reason)
    link_url = f"/candidate/applications?applicationId={application.id}"

    db.session.add(
        Notification(
            user_id=application.candidate_user_id,
            title=title,
            message=message,
            type=application.status,
            link_url=link_url,
        )
    )

    if not candidate.email:
        return

    subject = title
    body = (
        f"Xin chào {candidate.full_name or 'ứng viên'},\n\n"
        f"{message}\n\n"
        f"Bạn có thể xem chi tiết hồ sơ tại: "
        f"{current_app.config.get('FRONTEND_URL', 'http://127.0.0.1:5173')}/candidate/applications?applicationId={application.id}\n"
    )
    html = (
        "<div style='font-family:Arial,sans-serif;line-height:1.6'>"
        "<h2 style='margin:0 0 12px;color:#1d4ed8'>JOBPORTAL</h2>"
        f"<p>Xin chào <b>{candidate.full_name or 'ứng viên'}</b>,</p>"
        f"<p>{message}</p>"
        f"<p><a href='{current_app.config.get('FRONTEND_URL', 'http://127.0.0.1:5173')}/candidate/applications?applicationId={application.id}' "
        "style='display:inline-block;padding:10px 16px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:8px'>"
        "Xem chi tiết hồ sơ</a></p>"
        "</div>"
    )
    send_mail(subject, [candidate.email], body, html)


def update_application_status(
    application_id: int,
    recruiter_user_id: int,
    status: str,
    reason: str | None = None
) -> Application:
    """
    Update application status and notify candidate if needed.
    
    Args:
        application_id: ID of the application to update
        recruiter_user_id: ID of the recruiter/admin making the update
        status: New status for the application
        reason: Reason for status change (required for rejected)
        
    Returns:
        Updated Application object
        
    Raises:
        InvalidStatusError: If status is not valid
        MissingReasonError: If reason is required but not provided
        ApplicationNotFoundError: If application not found or recruiter doesn't have access
    """
    # Validate status
    status = (status or "").strip().lower()
    if status not in VALID_STATUSES:
        raise InvalidStatusError("Invalid status.")
    
    # Validate reason
    reason = (reason or "").strip() or None
    if status in STATUSES_REQUIRING_REASON and not reason:
        raise MissingReasonError("Reason is required for this status.")
    
    # Get application
    app = (
        Application.query.join(JobPosting, JobPosting.id == Application.job_id)
        .filter(Application.id == application_id, JobPosting.recruiter_user_id == recruiter_user_id)
        .first()
    )
    
    if not app:
        raise ApplicationNotFoundError("Application not found.")
    
    # Update status and reason
    app.status = status
    if reason is not None:
        app.recruiter_note = reason
    elif status in STATUSES_REQUIRING_REASON:
        app.recruiter_note = None
    
    # Send notification for accepted and rejected status
    if status in STATUSES_REQUIRING_NOTIFICATION:
        try:
            _notify_candidate_for_status(app, reason)
        except Exception as e:
            # Notification failed but we still want to save the status change
            # Log the error but don't fail the entire operation
            logger.error(f"Failed to notify candidate for application {application_id}: {str(e)}", exc_info=True)
    
    db.session.commit()
    return app
