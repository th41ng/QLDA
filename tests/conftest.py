"""
Pytest configuration and fixtures for unit tests.
Sets up Flask app context for testing without using real database.
"""

import pytest
from unittest.mock import Mock, patch

from backend.app import create_app


@pytest.fixture(scope="session")
def app():
    """Create and configure a Flask app instance for testing."""
    app = create_app()
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    return app


@pytest.fixture
def app_context(app):
    """Push app context for test."""
    with app.app_context():
        yield app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def mock_db():
    """Mock database session."""
    return Mock()


@pytest.fixture
def mock_user():
    """Fixture for mock user object."""
    user = Mock()
    user.id = 1
    user.email = "user@example.com"
    user.full_name = "John Doe"
    user.phone = "1234567890"
    user.role = "candidate"
    user.status = "active"
    user.password_hash = "hashed_password"
    user.auth_method_preference = "password"
    user.email_verified = True
    user.avatar_url = None
    user.last_login_at = None
    return user


@pytest.fixture
def mock_recruiter():
    """Fixture for mock recruiter user object."""
    user = Mock()
    user.id = 2
    user.email = "recruiter@example.com"
    user.full_name = "Jane Recruiter"
    user.phone = "0987654321"
    user.role = "recruiter"
    user.status = "active"
    user.password_hash = "hashed_password"
    user.auth_method_preference = "password"
    user.email_verified = True
    user.avatar_url = None
    user.last_login_at = None
    return user


@pytest.fixture
def mock_admin():
    """Fixture for mock admin user object."""
    user = Mock()
    user.id = 3
    user.email = "admin@example.com"
    user.full_name = "Admin User"
    user.phone = None
    user.role = "admin"
    user.status = "active"
    user.password_hash = "hashed_password"
    user.auth_method_preference = "password"
    user.email_verified = True
    user.avatar_url = None
    user.last_login_at = None
    return user


@pytest.fixture
def mock_candidate_profile():
    """Fixture for mock candidate profile."""
    profile = Mock()
    profile.id = 1
    profile.user_id = 1
    profile.dob = None
    profile.gender = None
    profile.address = None
    profile.headline = None
    profile.summary = None
    profile.current_title = None
    profile.years_experience = 0
    profile.expected_salary = None
    profile.desired_location = None
    profile.education = None
    profile.experience = None
    return profile


@pytest.fixture
def mock_company():
    """Fixture for mock company."""
    company = Mock()
    company.id = 1
    company.recruiter_user_id = 2
    company.company_name = "Tech Corp"
    company.tax_code = "0123456789"
    company.website = "https://techcorp.com"
    company.address = "123 Tech Street"
    company.description = "A tech company"
    company.industry = "Technology"
    company.logo_url = None
    return company
