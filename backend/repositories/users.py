"""User repository for database operations"""

from ..models import User


def get_all_users(filters=None):
    """
    Get all users with optional filters.
    
    Args:
        filters: Dict with optional keys:
            - role: Filter by role (admin, candidate, recruiter, user)
            - status: Filter by status (active, inactive)
            - search: Search by email or full_name (ilike)
    
    Returns:
        List of User objects
    """
    query = User.query
    
    if filters:
        if filters.get("role"):
            query = query.filter_by(role=filters["role"])
        if filters.get("status"):
            query = query.filter_by(status=filters["status"])
        if filters.get("search"):
            search_term = f"%{filters['search']}%"
            query = query.filter(
                (User.email.ilike(search_term)) | (User.full_name.ilike(search_term))
            )
    
    return query.order_by(User.created_at.desc()).all()


def get_user_by_id(user_id):
    """
    Get user by ID.
    
    Args:
        user_id: User ID (integer)
    
    Returns:
        User object or None
    """
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return None
    return User.query.get(user_id)


def get_user_by_email(email):
    """
    Get user by email.
    
    Args:
        email: User email
    
    Returns:
        User object or None
    """
    query = User.query.filter_by(email=(email or "").strip().lower())
    return query.first()


def count_users_by_role(role):
    """
    Count users by role.
    
    Args:
        role: Role type (admin, candidate, recruiter)
    
    Returns:
        Count of users with that role
    """
    return User.query.filter_by(role=role).count()


def get_users_by_role(role):
    """
    Get all users with specific role.
    
    Args:
        role: Role type (admin, candidate, recruiter)
    
    Returns:
        List of User objects
    """
    return User.query.filter_by(role=role).order_by(User.created_at.desc()).all()


def search_users(query_string):
    """
    Search users by email or full_name.
    
    Args:
        query_string: Search query
    
    Returns:
        List of matching User objects
    """
    if not query_string:
        return []
    
    search_term = f"%{query_string}%"
    return User.query.filter(
        (User.email.ilike(search_term)) | (User.full_name.ilike(search_term))
    ).all()


def create_user(full_name, email, password_hash, role="candidate", status="active"):
    """
    Create new user.
    
    Args:
        full_name: User full name
        email: User email
        password_hash: Hashed password
        role: User role (admin, candidate, recruiter)
        status: User status (active, inactive)
    
    Returns:
        Created User object
    """
    user = User(
        full_name=full_name,
        email=email,
        password_hash=password_hash,
        role=role,
        status=status,
    )
    from ..core.extensions import db
    db.session.add(user)
    db.session.commit()
    return user


def update_user(user, **kwargs):
    """
    Update user fields.
    
    Args:
        user: User object
        **kwargs: Fields to update (full_name, email, password_hash, role, status, phone)
    
    Returns:
        Updated User object
    """
    allowed_fields = {"full_name", "email", "password_hash", "role", "status", "phone"}
    
    for field, value in kwargs.items():
        if field in allowed_fields and value is not None:
            setattr(user, field, value)
    
    from ..core.extensions import db
    db.session.commit()
    return user


def delete_user(user):
    """
    Delete user.
    
    Args:
        user: User object
    
    Returns:
        True if deleted successfully
    """
    from ..core.extensions import db
    db.session.delete(user)
    db.session.commit()
    return True
