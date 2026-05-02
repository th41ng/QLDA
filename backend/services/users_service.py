"""User management service with business logic and validation"""

from ..core.security import hash_password, verify_password
from ..core.extensions import db
from ..repositories import users as users_repo


class UserServiceError(Exception):
    """Custom exception for user service errors"""
    pass


def get_all_users_service(role=None, status=None, search=None):
    """
    Get all users with optional filters.
    
    Args:
        role: Filter by role (admin, candidate, recruiter)
        status: Filter by status (active, inactive)
        search: Search query
    
    Returns:
        List of users
    """
    filters = {}
    if role:
        filters["role"] = role
    if status:
        filters["status"] = status
    if search:
        filters["search"] = search
    
    return users_repo.get_all_users(filters if filters else None)


def get_user_by_id_service(user_id):
    """Get user by ID"""
    user = users_repo.get_user_by_id(user_id)
    if not user:
        raise UserServiceError(f"User ID {user_id} not found")
    return user


def create_user_service(full_name, email, password, role="candidate", status="active"):
    """
    Create new user with validation.
    
    Args:
        full_name: User full name (required)
        email: User email (required, unique)
        password: User password (required, min 6 chars)
        role: User role (admin, candidate, recruiter)
        status: User status (active, inactive)
    
    Returns:
        Created User object
    
    Raises:
        UserServiceError: If validation fails
    """
    # Validate inputs
    if not full_name or not full_name.strip():
        raise UserServiceError("Full name is required")
    
    if not email or not email.strip():
        raise UserServiceError("Email is required")
    
    if not password or len(password) < 6:
        raise UserServiceError("Password must be at least 6 characters")
    
    # Normalize email
    email = email.strip().lower()
    
    # Check if email exists
    existing_user = users_repo.get_user_by_email(email)
    if existing_user:
        raise UserServiceError("Email already exists")
    
    # Validate role
    valid_roles = ["admin", "candidate", "recruiter"]
    if role not in valid_roles:
        raise UserServiceError(f"Invalid role. Must be one of: {', '.join(valid_roles)}")
    
    # Validate status
    valid_statuses = ["active", "inactive"]
    if status not in valid_statuses:
        raise UserServiceError(f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
    
    # Hash password and create user
    password_hash = hash_password(password)
    user = users_repo.create_user(full_name, email, password_hash, role, status)
    
    return user


def update_user_service(user_id, full_name=None, email=None, password=None, role=None, status=None, phone=None):
    """
    Update user with validation.
    
    Args:
        user_id: User ID
        full_name: Updated full name
        email: Updated email
        password: Updated password
        role: Updated role
        status: Updated status
        phone: Updated phone
    
    Returns:
        Updated User object
    
    Raises:
        UserServiceError: If validation fails
    """
    user = users_repo.get_user_by_id(user_id)
    if not user:
        raise UserServiceError(f"User ID {user_id} not found")
    
    updates = {}
    
    # Update full_name
    if full_name is not None:
        if not full_name.strip():
            raise UserServiceError("Full name cannot be empty")
        updates["full_name"] = full_name
    
    # Update email
    if email is not None:
        email = email.strip().lower()
        # Check if email already exists for another user
        existing_user = users_repo.get_user_by_email(email)
        if existing_user and existing_user.id != user.id:
            raise UserServiceError("Email already exists")
        updates["email"] = email
    
    # Update password
    if password is not None:
        if len(password) < 6:
            raise UserServiceError("Password must be at least 6 characters")
        updates["password_hash"] = hash_password(password)
    
    # Update role
    if role is not None:
        valid_roles = ["admin", "candidate", "recruiter"]
        if role not in valid_roles:
            raise UserServiceError(f"Invalid role. Must be one of: {', '.join(valid_roles)}")
        updates["role"] = role
    
    # Update status
    if status is not None:
        valid_statuses = ["active", "inactive"]
        if status not in valid_statuses:
            raise UserServiceError(f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
        updates["status"] = status
    
    # Update phone
    if phone is not None:
        updates["phone"] = phone if phone.strip() else None
    
    if not updates:
        raise UserServiceError("No fields to update")
    
    return users_repo.update_user(user, **updates)


def delete_user_service(user_id, current_user_id=None):
    """
    Delete user with validation.
    
    Args:
        user_id: User ID to delete
        current_user_id: Current user ID (to prevent self-deletion)
    
    Returns:
        True if deleted
    
    Raises:
        UserServiceError: If validation fails
    """
    user = users_repo.get_user_by_id(user_id)
    if not user:
        raise UserServiceError(f"User ID {user_id} not found")
    
    if current_user_id and user_id == current_user_id:
        raise UserServiceError("Cannot delete your own account")
    
    return users_repo.delete_user(user)


def search_users_service(query_string):
    """Search users by email or name"""
    if not query_string or not query_string.strip():
        raise UserServiceError("Search query is required")
    
    return users_repo.search_users(query_string)


def verify_user_password(user_id, password):
    """
    Verify user password.
    
    Args:
        user_id: User ID
        password: Password to verify
    
    Returns:
        True if password is correct
    
    Raises:
        UserServiceError: If user not found
    """
    user = users_repo.get_user_by_id(user_id)
    if not user:
        raise UserServiceError(f"User ID {user_id} not found")
    
    return verify_password(password, user.password_hash)


def get_user_stats():
    """Get user statistics by role"""
    return {
        "total_users": users_repo.count_all_users(),
        "admins": users_repo.count_users_by_role("admin"),
        "candidates": users_repo.count_users_by_role("candidate"),
        "recruiters": users_repo.count_users_by_role("recruiter"),
    }
