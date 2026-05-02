"""User management API endpoints - Admin only"""

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from . import json_error, json_ok, role_required
from ..services.users_service import (
    UserServiceError,
    create_user_service,
    delete_user_service,
    get_all_users_service,
    get_user_by_id_service,
    get_user_stats,
    search_users_service,
    update_user_service,
)

api_users_bp = Blueprint("api_users", __name__)


@api_users_bp.get("")
@jwt_required()
@role_required("admin")
def list_users():
    """
    Get all users with optional filters.
    
    Query parameters:
        - role: Filter by role (admin, candidate, recruiter)
        - status: Filter by status (active, inactive)
        - search: Search by email or name
    
    Returns:
        List of users
    """
    try:
        role = request.args.get("role")
        status = request.args.get("status")
        search = request.args.get("search")
        
        users = get_all_users_service(role=role, status=status, search=search)
        
        users_data = [
            {
                "id": u.id,
                "full_name": u.full_name,
                "email": u.email,
                "role": u.role,
                "status": u.status,
                "phone": u.phone,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
            }
            for u in users
        ]
        
        return json_ok(users_data, f"Retrieved {len(users_data)} users", 200)
    except Exception as e:
        return json_error(str(e), 400)


@api_users_bp.get("/<int:user_id>")
@jwt_required()
@role_required("admin")
def get_user(user_id):
    """
    Get user by ID.
    
    Returns:
        User object
    """
    try:
        user = get_user_by_id_service(user_id)
        
        user_data = {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "status": user.status,
            "phone": user.phone,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
        }
        
        return json_ok(user_data, "User retrieved successfully", 200)
    except UserServiceError as e:
        return json_error(str(e), 404)
    except Exception as e:
        return json_error(str(e), 400)


@api_users_bp.post("")
@jwt_required()
@role_required("admin")
def create_user():
    """
    Create new user.
    
    Request body:
        - full_name (required): User full name
        - email (required): User email
        - password (required): User password (min 6 chars)
        - role (required): User role (admin, candidate, recruiter)
        - status (optional): User status (active, inactive), default: active
        - phone (optional): User phone
    
    Returns:
        Created user object
    """
    try:
        data = request.get_json(force=True)
        
        user = create_user_service(
            full_name=data.get("full_name"),
            email=data.get("email"),
            password=data.get("password"),
            role=data.get("role", "candidate"),
            status=data.get("status", "active"),
        )
        
        user_data = {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "status": user.status,
            "phone": user.phone,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        }
        
        return json_ok(user_data, "User created successfully", 201)
    except UserServiceError as e:
        return json_error(str(e), 400)
    except Exception as e:
        return json_error(str(e), 400)


@api_users_bp.put("/<int:user_id>")
@jwt_required()
@role_required("admin")
def update_user(user_id):
    """
    Update user.
    
    Request body (all optional):
        - full_name: User full name
        - email: User email
        - password: User password
        - role: User role (admin, candidate, recruiter)
        - status: User status (active, inactive)
        - phone: User phone
    
    Returns:
        Updated user object
    """
    try:
        data = request.get_json(force=True)
        
        user = update_user_service(
            user_id=user_id,
            full_name=data.get("full_name"),
            email=data.get("email"),
            password=data.get("password"),
            role=data.get("role"),
            status=data.get("status"),
            phone=data.get("phone"),
        )
        
        user_data = {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "status": user.status,
            "phone": user.phone,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
        }
        
        return json_ok(user_data, "User updated successfully", 200)
    except UserServiceError as e:
        return json_error(str(e), 400)
    except Exception as e:
        return json_error(str(e), 400)


@api_users_bp.delete("/<int:user_id>")
@jwt_required()
@role_required("admin")
def delete_user(user_id):
    """
    Delete user.
    
    Returns:
        Success message
    """
    try:
        current_user_id = get_jwt_identity()
        delete_user_service(user_id, current_user_id)
        
        return json_ok(None, "User deleted successfully", 200)
    except UserServiceError as e:
        return json_error(str(e), 400)
    except Exception as e:
        return json_error(str(e), 400)


@api_users_bp.get("/search/<query>")
@jwt_required()
@role_required("admin")
def search_users(query):
    """
    Search users by email or name.
    
    Path parameter:
        - query: Search query
    
    Returns:
        List of matching users
    """
    try:
        users = search_users_service(query)
        
        users_data = [
            {
                "id": u.id,
                "full_name": u.full_name,
                "email": u.email,
                "role": u.role,
                "status": u.status,
                "phone": u.phone,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ]
        
        return json_ok(users_data, f"Found {len(users_data)} users", 200)
    except UserServiceError as e:
        return json_error(str(e), 400)
    except Exception as e:
        return json_error(str(e), 400)


@api_users_bp.get("/stats/overview")
@jwt_required()
@role_required("admin")
def get_stats():
    """
    Get user statistics.
    
    Returns:
        User count by role
    """
    try:
        stats = get_user_stats()
        return json_ok(stats, "User stats retrieved successfully", 200)
    except Exception as e:
        return json_error(str(e), 400)
