from ..core.extensions import db
from ..core.security import hash_password, verify_password
from ..repositories.admin import (
    create_admin,
    delete_admin,
    get_admin_by_email,
    get_admin_by_id,
    get_all_admins,
    search_admins,
)


class AdminServiceError(Exception):
    pass


def create_admin_user(full_name, email, password):
    """
    Create a new admin user.
    
    Args:
        full_name: Admin's full name
        email: Admin's email (must be unique)
        password: Admin's password (will be hashed)
        
    Returns:
        User object
        
    Raises:
        AdminServiceError: If email already exists or validation fails
    """
    email = (email or "").strip().lower()
    
    if not email:
        raise AdminServiceError("Email is required")
    
    if not full_name or not full_name.strip():
        raise AdminServiceError("Full name is required")
    
    if not password or len(password) < 6:
        raise AdminServiceError("Password must be at least 6 characters")
    
    # Check if email already exists
    existing_admin = get_admin_by_email(email)
    if existing_admin:
        raise AdminServiceError("Email already exists")
    
    # Create new admin
    password_hash = hash_password(password)
    admin = create_admin(full_name, email, password_hash)
    
    try:
        db.session.add(admin)
        db.session.commit()
        return admin
    except Exception as e:
        db.session.rollback()
        raise AdminServiceError(f"Failed to create admin: {str(e)}")


def get_admin_by_id_service(admin_id):
    """Get admin by ID"""
    return get_admin_by_id(admin_id)


def get_all_admins_service():
    """Get all admins"""
    return get_all_admins()


def update_admin_user(admin_id, full_name=None, email=None, password=None, status=None):
    """
    Update admin user information.
    
    Args:
        admin_id: Admin's ID
        full_name: New full name (optional)
        email: New email (optional)
        password: New password (optional)
        status: New status - 'active' or 'inactive' (optional)
        
    Returns:
        Updated User object
        
    Raises:
        AdminServiceError: If validation fails
    """
    admin = get_admin_by_id(admin_id)
    if not admin:
        raise AdminServiceError("Admin not found")
    
    # Update full name
    if full_name:
        full_name = full_name.strip()
        if not full_name:
            raise AdminServiceError("Full name cannot be empty")
        admin.full_name = full_name
    
    # Update email (check for duplicates)
    if email:
        email = email.strip().lower()
        if not email:
            raise AdminServiceError("Email cannot be empty")
        
        # Check if email is already taken by another admin
        existing_admin = get_admin_by_email(email)
        if existing_admin and existing_admin.id != admin_id:
            raise AdminServiceError("Email already exists")
        
        admin.email = email
    
    # Update password
    if password:
        if len(password) < 6:
            raise AdminServiceError("Password must be at least 6 characters")
        admin.password_hash = hash_password(password)
    
    # Update status
    if status:
        if status not in ["active", "inactive"]:
            raise AdminServiceError("Status must be 'active' or 'inactive'")
        admin.status = status
    
    try:
        db.session.commit()
        return admin
    except Exception as e:
        db.session.rollback()
        raise AdminServiceError(f"Failed to update admin: {str(e)}")


def delete_admin_user(admin_id):
    """
    Delete an admin user.
    
    Args:
        admin_id: Admin's ID
        
    Returns:
        True if deleted successfully
        
    Raises:
        AdminServiceError: If admin not found
    """
    admin = delete_admin(admin_id)
    if not admin:
        raise AdminServiceError("Admin not found")
    
    try:
        db.session.delete(admin)
        db.session.commit()
        return True
    except Exception as e:
        db.session.rollback()
        raise AdminServiceError(f"Failed to delete admin: {str(e)}")


def verify_admin_password(admin_id, password):
    """
    Verify admin password.
    
    Args:
        admin_id: Admin's ID
        password: Password to verify
        
    Returns:
        True if password is correct
        
    Raises:
        AdminServiceError: If admin not found
    """
    admin = get_admin_by_id(admin_id)
    if not admin:
        raise AdminServiceError("Admin not found")
    
    return verify_password(admin.password_hash, password)


def search_admin_users(query_string):
    """Search admins by email or full name"""
    if not query_string or not query_string.strip():
        raise AdminServiceError("Search query cannot be empty")
    
    return search_admins(query_string.strip())


def check_admin_exists(email):
    """Check if admin with given email exists"""
    return get_admin_by_email(email) is not None
