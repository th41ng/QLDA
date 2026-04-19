from functools import wraps
from datetime import datetime

from flask import Blueprint, request
from flask_jwt_extended import create_access_token, get_jwt, get_jwt_identity, jwt_required

from ..core.extensions import db
from ..core.security import verify_password
from . import json_error, json_ok
from ..repositories.admin import get_admin_by_email
from ..services.admin_service import (
    AdminServiceError,
    create_admin_user,
    delete_admin_user,
    get_admin_by_id_service,
    get_all_admins_service,
    search_admin_users,
    update_admin_user,
    verify_admin_password,
)

api_admin_bp = Blueprint("api_admin", __name__)


def require_admin_role(fn):
    """Decorator to check if user has admin role"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        role = claims.get("role")
        if role != "admin":
            return json_error("Only admins can access this resource", 403)
        return fn(*args, **kwargs)
    return wrapper


@api_admin_bp.post("/login")
def admin_login():
    """
    Admin login endpoint.
    
    Request body:
        - email (required): Admin email
        - password (required): Admin password
        
    Returns:
        JWT token and admin user info
    """
    data = request.get_json(force=True)
    
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    
    if not email:
        return json_error("Email is required", 400)
    
    if not password:
        return json_error("Password is required", 400)
    
    # Get admin by email
    admin = get_admin_by_email(email)
    
    if not admin:
        return json_error("Invalid email or password", 401)
    
    # Verify password
    if not verify_password(admin.password_hash, password):
        return json_error("Invalid email or password", 401)
    
    # Check if admin is active
    if admin.status != "active":
        return json_error("Admin account is inactive", 403)
    
    # Update last login
    admin.last_login_at = datetime.utcnow()
    db.session.commit()
    
    # Create JWT token
    token = create_access_token(
        identity=str(admin.id),
        additional_claims={"role": admin.role}
    )
    
    return json_ok(
        {
            "token": token,
            "user": {
                "id": admin.id,
                "full_name": admin.full_name,
                "email": admin.email,
                "role": admin.role,
                "status": admin.status,
            },
        },
        "Admin authenticated successfully",
    )


@api_admin_bp.post("")
@jwt_required()
@require_admin_role
def create_admin():
    """
    Create a new admin user.
    
    Request body:
        - full_name (required): Admin's full name
        - email (required): Admin's email
        - password (required): Admin's password (min 6 characters)
        
    Returns:
        Created admin user
    """
    data = request.get_json(force=True)
    
    try:
        full_name = data.get("full_name") or ""
        email = data.get("email") or ""
        password = data.get("password") or ""
        
        admin = create_admin_user(full_name, email, password)
        
        return json_ok(
            {
                "id": admin.id,
                "full_name": admin.full_name,
                "email": admin.email,
                "role": admin.role,
                "status": admin.status,
                "created_at": admin.created_at.isoformat(),
            },
            "Admin created successfully",
        ), 201
    except AdminServiceError as e:
        return json_error(str(e), 400)
    except Exception as e:
        return json_error(f"An error occurred: {str(e)}", 500)


@api_admin_bp.get("")
@jwt_required()
@require_admin_role
def get_all_admins():
    """
    Get all admin users.
    
    Returns:
        List of all admin users
    """
    try:
        admins = get_all_admins_service()
        return json_ok(
            [
                {
                    "id": admin.id,
                    "full_name": admin.full_name,
                    "email": admin.email,
                    "role": admin.role,
                    "status": admin.status,
                    "created_at": admin.created_at.isoformat(),
                    "last_login_at": admin.last_login_at.isoformat() if admin.last_login_at else None,
                }
                for admin in admins
            ],
            "Admins retrieved successfully",
        )
    except Exception as e:
        return json_error(f"An error occurred: {str(e)}", 500)


@api_admin_bp.get("/<int:admin_id>")
@jwt_required()
@require_admin_role
def get_admin(admin_id):
    """
    Get admin by ID.
    
    Path parameters:
        - admin_id: Admin's ID
        
    Returns:
        Admin user details
    """
    try:
        admin = get_admin_by_id_service(admin_id)
        if not admin:
            return json_error("Admin not found", 404)
        
        return json_ok(
            {
                "id": admin.id,
                "full_name": admin.full_name,
                "email": admin.email,
                "role": admin.role,
                "status": admin.status,
                "phone": admin.phone,
                "created_at": admin.created_at.isoformat(),
                "updated_at": admin.updated_at.isoformat(),
                "last_login_at": admin.last_login_at.isoformat() if admin.last_login_at else None,
            },
            "Admin retrieved successfully",
        )
    except Exception as e:
        return json_error(f"An error occurred: {str(e)}", 500)


@api_admin_bp.put("/<int:admin_id>")
@jwt_required()
@require_admin_role
def update_admin(admin_id):
    """
    Update admin user.
    
    Path parameters:
        - admin_id: Admin's ID
        
    Request body:
        - full_name (optional): New full name
        - email (optional): New email
        - password (optional): New password
        - status (optional): 'active' or 'inactive'
        - phone (optional): Phone number
        
    Returns:
        Updated admin user
    """
    try:
        data = request.get_json(force=True)
        
        admin = update_admin_user(
            admin_id,
            full_name=data.get("full_name"),
            email=data.get("email"),
            password=data.get("password"),
            status=data.get("status"),
        )
        
        # Update phone if provided
        if data.get("phone"):
            admin.phone = data.get("phone").strip()
            db.session.commit()
        
        return json_ok(
            {
                "id": admin.id,
                "full_name": admin.full_name,
                "email": admin.email,
                "role": admin.role,
                "status": admin.status,
                "phone": admin.phone,
                "updated_at": admin.updated_at.isoformat(),
            },
            "Admin updated successfully",
        )
    except AdminServiceError as e:
        return json_error(str(e), 400)
    except Exception as e:
        return json_error(f"An error occurred: {str(e)}", 500)


@api_admin_bp.delete("/<int:admin_id>")
@jwt_required()
@require_admin_role
def delete_admin(admin_id):
    """
    Delete an admin user.
    
    Path parameters:
        - admin_id: Admin's ID to delete
        
    Returns:
        Success message
    """
    try:
        current_user_id = int(get_jwt_identity())
        
        # Prevent admin from deleting themselves
        if current_user_id == admin_id:
            return json_error("You cannot delete your own account", 400)
        
        delete_admin_user(admin_id)
        
        return json_ok(
            {"deleted_id": admin_id},
            "Admin deleted successfully",
        )
    except AdminServiceError as e:
        return json_error(str(e), 404)
    except Exception as e:
        return json_error(f"An error occurred: {str(e)}", 500)


@api_admin_bp.get("/search/<query_string>")
@jwt_required()
@require_admin_role
def search_admins(query_string):
    """
    Search admins by email or full name.
    
    Path parameters:
        - query_string: Search term
        
    Returns:
        List of matching admins
    """
    try:
        admins = search_admin_users(query_string)
        return json_ok(
            [
                {
                    "id": admin.id,
                    "full_name": admin.full_name,
                    "email": admin.email,
                    "role": admin.role,
                    "status": admin.status,
                    "created_at": admin.created_at.isoformat(),
                }
                for admin in admins
            ],
            "Search completed",
        )
    except Exception as e:
        return json_error(f"An error occurred: {str(e)}", 500)


@api_admin_bp.post("/<int:admin_id>/change-password")
@jwt_required()
@require_admin_role
def change_admin_password(admin_id):
    """
    Change admin password.
    
    Path parameters:
        - admin_id: Admin's ID
        
    Request body:
        - old_password (required): Current password
        - new_password (required): New password (min 6 characters)
        
    Returns:
        Success message
    """
    try:
        data = request.get_json(force=True)
        
        old_password = data.get("old_password") or ""
        new_password = data.get("new_password") or ""
        
        if not old_password:
            return json_error("Old password is required", 400)
        
        if not new_password:
            return json_error("New password is required", 400)
        
        if len(new_password) < 6:
            return json_error("New password must be at least 6 characters", 400)
        
        # Verify old password
        if not verify_admin_password(admin_id, old_password):
            return json_error("Old password is incorrect", 401)
        
        # Update to new password
        update_admin_user(admin_id, password=new_password)
        
        return json_ok(
            {},
            "Password changed successfully",
        )
    except AdminServiceError as e:
        return json_error(str(e), 404)
    except Exception as e:
        return json_error(f"An error occurred: {str(e)}", 500)
