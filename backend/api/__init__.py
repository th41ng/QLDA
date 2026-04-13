from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request

from ..models import User


def json_ok(data=None, message="OK", status=200):
    return jsonify({"ok": True, "message": message, "data": data}), status


def json_error(message, status=400, **extra):
    payload = {"ok": False, "message": message}
    if extra:
        payload.update(extra)
    return jsonify(payload), status


def role_required(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            identity = get_jwt_identity()
            try:
                identity = int(identity)
            except (TypeError, ValueError):
                return json_error("Unauthorized", 401)
            user = User.query.get(identity)
            if not user or user.role not in roles:
                return json_error("Forbidden", 403)
            return fn(*args, **kwargs)

        return wrapper

    return decorator
