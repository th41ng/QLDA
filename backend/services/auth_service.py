"""
Auth Service - Core business logic for authentication.
Handles login, registration, and password management.
"""

from datetime import datetime
from dataclasses import dataclass
from typing import Any

from ..core.extensions import db
from ..core.security import hash_password, verify_password
from ..models import User, CandidateProfile, Company
from ..repositories import get_user_by_email, get_user_by_id, get_profile_by_user_id, get_company_by_user_id


class AuthServiceError(Exception):
    """Custom exception for auth service errors."""

    def __init__(self, message: str, status: int = 400, **extra: Any):
        super().__init__(message)
        self.message = message
        self.status = status
        self.extra = extra


@dataclass
class LoginResult:
    """Result of a successful login."""

    user_id: int
    email: str
    full_name: str
    role: str
    status: str


@dataclass
class RegisterResult:
    """Result of a successful registration."""

    user_id: int
    email: str
    full_name: str
    role: str


def login_with_password(email: str, password: str) -> LoginResult:
    """
    Authenticate user with email and password.
    
    Args:
        email: User email address
        password: User password (plain text)
        
    Returns:
        LoginResult with user information
        
    Raises:
        AuthServiceError: If login fails (user not found, wrong password, etc.)
    """
    email = _normalize_email(email)
    
    user = get_user_by_email(email)
    if not user:
        raise AuthServiceError("Tài khoản không tồn tại", 404)
    
    if user.status != "active":
        raise AuthServiceError("Tài khoản hiện không khả dụng", 403)
    
    if user.role == "admin":
        raise AuthServiceError("Admin must login through backend web.", 403)
    
    if not verify_password(user.password_hash, password):
        raise AuthServiceError("Mật khẩu không đúng", 401)
    
    # Update last login timestamp
    user.last_login_at = datetime.utcnow()
    user.auth_method_preference = "password"
    db.session.commit()
    
    return LoginResult(
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        status=user.status,
    )


def register_with_password(
    email: str,
    password: str,
    full_name: str,
    role: str,
    phone: str | None = None,
    **profile_data,
) -> RegisterResult:
    """
    Register a new user with email and password.
    
    Args:
        email: User email address
        password: User password (plain text)
        full_name: User full name
        role: User role (candidate or recruiter)
        phone: Optional phone number
        **profile_data: Additional profile data (dob, address, etc.)
        
    Returns:
        RegisterResult with user information
        
    Raises:
        AuthServiceError: If registration fails (email exists, invalid data, etc.)
    """
    email = _normalize_email(email)
    role = _normalize_role(role)
    
    if get_user_by_email(email):
        raise AuthServiceError("Email đã tồn tại.", 409)
    
    full_name = (full_name or "").strip()
    if not full_name:
        raise AuthServiceError("Vui lòng nhập họ và tên.", 400)
    
    if len(password) < 6:
        raise AuthServiceError("Mật khẩu phải có ít nhất 6 ký tự.", 400)
    
    # Create user
    user = User(
        full_name=full_name,
        email=email,
        password_hash=hash_password(password),
        role=role,
        auth_method_preference="password",
        email_verified=True,
        status="active",
        phone=(phone or "").strip() or None,
    )
    db.session.add(user)
    db.session.flush()
    
    # Create profile based on role
    _create_user_profile(user, profile_data)
    
    db.session.commit()
    
    return RegisterResult(
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
    )


def update_password(user_id: int, old_password: str, new_password: str) -> bool:
    """
    Update user password.
    
    Args:
        user_id: User ID
        old_password: Current password (plain text)
        new_password: New password (plain text)
        
    Returns:
        True if password was updated
        
    Raises:
        AuthServiceError: If update fails
    """
    user = get_user_by_id(user_id)
    if not user:
        raise AuthServiceError("Tài khoản không tồn tại", 404)
    
    if not verify_password(user.password_hash, old_password):
        raise AuthServiceError("Mật khẩu cũ không đúng", 401)
    
    if len(new_password) < 6:
        raise AuthServiceError("Mật khẩu phải có ít nhất 6 ký tự.", 400)
    
    user.password_hash = hash_password(new_password)
    db.session.commit()
    return True


def update_user_profile(user_id: int, profile_data: dict) -> bool:
    """
    Update user profile information.
    
    Args:
        user_id: User ID
        profile_data: Dictionary with profile data (phone, full_name, etc.)
        
    Returns:
        True if profile was updated
        
    Raises:
        AuthServiceError: If user not found
    """
    user = get_user_by_id(user_id)
    if not user:
        raise AuthServiceError("Tài khoản không tồn tại", 404)
    
    # Update basic user info
    if "full_name" in profile_data:
        user.full_name = (profile_data["full_name"] or "").strip() or user.full_name
    
    if "phone" in profile_data:
        user.phone = (profile_data["phone"] or "").strip() or None
    
    if "avatar_url" in profile_data:
        user.avatar_url = profile_data["avatar_url"]
    
    # Update role-specific profile
    _update_role_profile(user, profile_data)
    
    db.session.commit()
    return True


def get_user_info(user_id: int) -> dict:
    """
    Get user information.
    
    Args:
        user_id: User ID
        
    Returns:
        Dictionary with user info
        
    Raises:
        AuthServiceError: If user not found
    """
    user = get_user_by_id(user_id)
    if not user:
        raise AuthServiceError("Tài khoản không tồn tại", 404)
    
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "role": user.role,
        "status": user.status,
        "avatar_url": user.avatar_url,
        "email_verified": user.email_verified,
        "last_login_at": user.last_login_at,
        "created_at": user.created_at,
    }


def lock_user(user_id: int) -> bool:
    """
    Lock a user account (disable login).
    
    Args:
        user_id: User ID
        
    Returns:
        True if user was locked
        
    Raises:
        AuthServiceError: If user not found
    """
    user = get_user_by_id(user_id)
    if not user:
        raise AuthServiceError("Tài khoản không tồn tại", 404)
    
    user.status = "locked"
    db.session.commit()
    return True


def unlock_user(user_id: int) -> bool:
    """
    Unlock a user account (enable login).
    
    Args:
        user_id: User ID
        
    Returns:
        True if user was unlocked
        
    Raises:
        AuthServiceError: If user not found
    """
    user = get_user_by_id(user_id)
    if not user:
        raise AuthServiceError("Tài khoản không tồn tại", 404)
    
    user.status = "active"
    db.session.commit()
    return True


# ============= PRIVATE HELPERS =============


def _normalize_email(email: str) -> str:
    """Normalize and validate email."""
    normalized = (email or "").strip().lower()
    if not normalized or "@" not in normalized:
        raise AuthServiceError("Email không hợp lệ.", 400)
    return normalized


def _normalize_role(role: str) -> str:
    """Normalize and validate role."""
    normalized = (role or "").strip().lower()
    if normalized not in {"candidate", "recruiter"}:
        raise AuthServiceError("Vui lòng chọn vai trò.", 400)
    return normalized


def _create_user_profile(user: User, profile_data: dict) -> None:
    """Create role-specific profile for new user."""
    if user.role == "candidate":
        profile = CandidateProfile(user_id=user.id)
        _apply_candidate_profile_data(profile, profile_data)
        db.session.add(profile)
    
    elif user.role == "recruiter":
        company = Company(recruiter_user_id=user.id)
        _apply_company_profile_data(company, profile_data, user.full_name)
        db.session.add(company)


def _update_role_profile(user: User, profile_data: dict) -> None:
    """Update role-specific profile for existing user."""
    if user.role == "candidate":
        profile = get_profile_by_user_id(user.id)
        if profile:
            _apply_candidate_profile_data(profile, profile_data)
    
    elif user.role == "recruiter":
        company = get_company_by_user_id(user.id)
        if company:
            _apply_company_profile_data(company, profile_data, user.full_name)


def _apply_candidate_profile_data(profile: CandidateProfile, data: dict) -> None:
    """Apply candidate profile data."""
    if "dob" in data:
        profile.dob = data["dob"]
    if "gender" in data:
        profile.gender = data["gender"]
    if "address" in data:
        profile.address = data["address"]
    if "headline" in data:
        profile.headline = data["headline"]
    if "summary" in data:
        profile.summary = data["summary"]
    if "current_title" in data:
        profile.current_title = data["current_title"]
    if "years_experience" in data:
        try:
            profile.years_experience = int(data["years_experience"])
        except (ValueError, TypeError):
            pass
    if "expected_salary" in data:
        profile.expected_salary = data["expected_salary"]
    if "desired_location" in data:
        profile.desired_location = data["desired_location"]
    if "education" in data:
        profile.education = data["education"]
    if "experience" in data:
        profile.experience = data["experience"]


def _apply_company_profile_data(company: Company, data: dict, default_name: str) -> None:
    """Apply company profile data."""
    if "company_name" in data:
        company.company_name = (data["company_name"] or default_name).strip()
    else:
        company.company_name = default_name
    
    if "tax_code" in data:
        company.tax_code = data["tax_code"]
    if "website" in data:
        company.website = data["website"]
    if "company_address" in data:
        company.address = data["company_address"]
    elif "address" in data:
        company.address = data["address"]
    if "company_description" in data:
        company.description = data["company_description"]
    if "industry" in data:
        company.industry = data["industry"]
