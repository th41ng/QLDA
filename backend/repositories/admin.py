from ..models import User


def get_admin_by_id(admin_id):
    """Get admin user by ID"""
    try:
        admin_id = int(admin_id)
    except (TypeError, ValueError):
        return None
    admin = User.query.get(admin_id)
    return admin if admin and admin.role == "admin" else None


def get_admin_by_email(email):
    """Get admin user by email"""
    query = User.query.filter_by(email=(email or "").strip().lower(), role="admin")
    return query.first()


def get_all_admins():
    """Get all admin users"""
    return User.query.filter_by(role="admin").all()


def create_admin(full_name, email, password_hash):
    """Create a new admin user"""
    admin = User(
        full_name=full_name.strip(),
        email=email.strip().lower(),
        password_hash=password_hash,
        role="admin",
        status="active",
        email_verified=True,
    )
    return admin


def get_admin_by_id_unrestricted(admin_id):
    """Get any user by ID (used internally for verification)"""
    try:
        admin_id = int(admin_id)
    except (TypeError, ValueError):
        return None
    return User.query.get(admin_id)


def get_all_users_with_role(role):
    """Get all users with a specific role"""
    return User.query.filter_by(role=role).all()


def delete_admin(admin_id):
    """Delete an admin user"""
    admin = get_admin_by_id(admin_id)
    return admin


def search_admins(query_string):
    """Search admins by email or full_name"""
    search_term = f"%{query_string}%"
    return User.query.filter(
        User.role == "admin",
        (User.email.ilike(search_term) | User.full_name.ilike(search_term))
    ).all()
