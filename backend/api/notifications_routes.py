from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from . import json_error, json_ok, role_required
from ..core.extensions import db
from ..models import Notification

api_notifications_bp = Blueprint("api_notifications", __name__)


def _notification_to_dict(notification: Notification):
    return {
        "id": notification.id,
        "title": notification.title,
        "message": notification.message,
        "type": notification.type,
        "link_url": notification.link_url,
        "is_read": bool(notification.is_read),
        "created_at": notification.created_at.isoformat() if notification.created_at else None,
    }


@api_notifications_bp.get("/mine")
@jwt_required()
@role_required("candidate", "recruiter", "admin")
def my_notifications():
    user_id = int(get_jwt_identity())
    limit_raw = request.args.get("limit", "10")
    try:
        limit = max(1, min(int(limit_raw), 50))
    except (TypeError, ValueError):
        return json_error("Invalid limit.", 400)

    notifications = (
        Notification.query.filter_by(user_id=user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )
    return json_ok([_notification_to_dict(item) for item in notifications])


@api_notifications_bp.patch("/<int:notification_id>/read")
@jwt_required()
@role_required("candidate", "recruiter", "admin")
def mark_notification_read(notification_id):
    user_id = int(get_jwt_identity())
    notification = Notification.query.filter_by(id=notification_id, user_id=user_id).first()
    if not notification:
        return json_error("Notification not found.", 404)

    notification.is_read = True
    db.session.commit()
    return json_ok(_notification_to_dict(notification), "Notification updated")
