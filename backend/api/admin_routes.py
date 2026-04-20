"""Admin role validation for API endpoints"""

from functools import wraps
from flask_jwt_extended import get_jwt_identity
from . import json_error
from ..repositories import get_user_by_id


def require_admin_role(fn):
    """Decorator to require admin role for API endpoints"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        if not user_id:
            return json_error("Unauthorized", 401)
        
        user = get_user_by_id(user_id)
        if not user or user.role != "admin":
            return json_error("Admin role required", 403)
        
        return fn(*args, **kwargs)
    
    return wrapper
