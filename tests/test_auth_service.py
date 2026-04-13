"""
Unit tests for Auth Service (backend/services/auth_service.py).
Tests core authentication business logic without using real database.
All dependencies are mocked - no real database or external services used.
"""

import pytest
from datetime import datetime
from unittest.mock import Mock, patch

from backend.services.auth_service import (
    login_with_password,
    register_with_password,
    update_password,
    update_user_profile,
    get_user_info,
    lock_user,
    unlock_user,
    AuthServiceError,
    LoginResult,
    RegisterResult,
)


@pytest.mark.unit
class TestLoginWithPassword:
    """Test cases for login_with_password function."""

    def test_login_success(self, monkeypatch):
        """Test successful login with correct email and password."""
        # Mock user from repository
        mock_user = Mock()
        mock_user.id = 1
        mock_user.email = "user@example.com"
        mock_user.full_name = "John Doe"
        mock_user.role = "candidate"
        mock_user.status = "active"
        mock_user.password_hash = "hashed_password"
        mock_user.last_login_at = None

        # Mock repository
        monkeypatch.setattr(
            "backend.services.auth_service.get_user_by_email",
            lambda email: mock_user,
        )

        # Mock password verification
        monkeypatch.setattr(
            "backend.services.auth_service.verify_password",
            lambda hash, pwd: True,
        )

        # Mock database commit
        mock_db_session = Mock()
        monkeypatch.setattr(
            "backend.services.auth_service.db.session",
            mock_db_session,
        )

        result = login_with_password("user@example.com", "password123")

        assert isinstance(result, LoginResult)
        assert result.user_id == 1
        assert result.email == "user@example.com"
        assert result.full_name == "John Doe"
        assert result.role == "candidate"
        assert result.status == "active"
        assert mock_user.auth_method_preference == "password"
        mock_db_session.commit.assert_called_once()

    def test_login_user_not_found(self, monkeypatch):
        """Test login fails when user doesn't exist."""
        monkeypatch.setattr(
            "backend.services.auth_service.get_user_by_email",
            lambda email: None,
        )

        with pytest.raises(AuthServiceError) as exc_info:
            login_with_password("nonexistent@example.com", "password123")

        assert exc_info.value.status == 404
        assert "không tồn tại" in exc_info.value.message

    def test_login_wrong_password(self, monkeypatch):
        """Test login fails with incorrect password."""
        mock_user = Mock()
        mock_user.email = "user@example.com"
        mock_user.status = "active"
        mock_user.role = "candidate"
        mock_user.password_hash = "hashed_password"

        monkeypatch.setattr(
            "backend.services.auth_service.get_user_by_email",
            lambda email: mock_user,
        )

        # Password verification returns False
        monkeypatch.setattr(
            "backend.services.auth_service.verify_password",
            lambda hash, pwd: False,
        )

        with pytest.raises(AuthServiceError) as exc_info:
            login_with_password("user@example.com", "wrongpassword")

        assert exc_info.value.status == 401
        assert "không đúng" in exc_info.value.message

    def test_login_account_locked(self, monkeypatch):
        """Test login fails when account is locked."""
        mock_user = Mock()
        mock_user.email = "user@example.com"
        mock_user.status = "locked"
        mock_user.role = "candidate"

        monkeypatch.setattr(
            "backend.services.auth_service.get_user_by_email",
            lambda email: mock_user,
        )

        with pytest.raises(AuthServiceError) as exc_info:
            login_with_password("user@example.com", "password123")

        assert exc_info.value.status == 403
        assert "khả dụng" in exc_info.value.message

    def test_login_admin_user(self, monkeypatch):
        """Test login fails for admin users."""
        mock_user = Mock()
        mock_user.email = "admin@example.com"
        mock_user.status = "active"
        mock_user.role = "admin"

        monkeypatch.setattr(
            "backend.services.auth_service.get_user_by_email",
            lambda email: mock_user,
        )

        with pytest.raises(AuthServiceError) as exc_info:
            login_with_password("admin@example.com", "password123")

        assert exc_info.value.status == 403
        assert "backend web" in exc_info.value.message

    def test_login_email_normalization(self, monkeypatch):
        """Test that email is normalized (lowercased and trimmed)."""
        mock_user = Mock()
        mock_user.id = 1
        mock_user.email = "user@example.com"
        mock_user.full_name = "John Doe"
        mock_user.role = "candidate"
        mock_user.status = "active"
        mock_user.password_hash = "hashed_password"

        mock_db_session = Mock()

        captured_email = []

        def capture_email(email):
            captured_email.append(email)
            return mock_user

        monkeypatch.setattr(
            "backend.services.auth_service.get_user_by_email",
            capture_email,
        )

        monkeypatch.setattr(
            "backend.services.auth_service.verify_password",
            lambda hash, pwd: True,
        )

        monkeypatch.setattr(
            "backend.services.auth_service.db.session",
            mock_db_session,
        )

        login_with_password("  USER@EXAMPLE.COM  ", "password123")

        assert captured_email[0] == "user@example.com"


@pytest.mark.unit
class TestRegisterWithPassword:
    """Test cases for register_with_password function."""

    def test_register_success_candidate(self, monkeypatch):
        """Test successful registration for candidate."""
        monkeypatch.setattr(
            "backend.services.auth_service.get_user_by_email",
            lambda email: None,
        )

        mock_db_session = Mock()
        monkeypatch.setattr(
            "backend.services.auth_service.db.session",
            mock_db_session,
        )

        # Mock User model
        mock_user_instance = Mock()
        mock_user_instance.id = 1
        mock_user_instance.email = "newuser@example.com"
        mock_user_instance.full_name = "Jane Doe"
        mock_user_instance.role = "candidate"

        with patch("backend.services.auth_service.User") as mock_user_class:
            mock_user_class.return_value = mock_user_instance
            
            # Mock CandidateProfile
            with patch("backend.services.auth_service.CandidateProfile"):
                result = register_with_password(
                    email="newuser@example.com",
                    password="password123",
                    full_name="Jane Doe",
                    role="candidate",
                    phone="1234567890",
                )

                assert isinstance(result, RegisterResult)
                assert result.user_id == 1
                assert result.email == "newuser@example.com"
                assert result.full_name == "Jane Doe"
                assert result.role == "candidate"
                # Verify User was created with correct attributes
                assert mock_db_session.add.called
                assert mock_db_session.commit.called

    def test_register_success_recruiter(self, monkeypatch):
        """Test successful registration for recruiter."""
        monkeypatch.setattr(
            "backend.services.auth_service.get_user_by_email",
            lambda email: None,
        )

        mock_db_session = Mock()
        monkeypatch.setattr(
            "backend.services.auth_service.db.session",
            mock_db_session,
        )

        mock_user_instance = Mock()
        mock_user_instance.id = 2
        mock_user_instance.email = "recruiter@example.com"
        mock_user_instance.full_name = "John Recruiter"
        mock_user_instance.role = "recruiter"

        with patch("backend.services.auth_service.User") as mock_user_class:
            mock_user_class.return_value = mock_user_instance
            
            with patch("backend.services.auth_service.Company"):
                result = register_with_password(
                    email="recruiter@example.com",
                    password="password123",
                    full_name="John Recruiter",
                    role="recruiter",
                    company_name="Tech Corp",
                )

                assert result.role == "recruiter"
                assert mock_db_session.commit.called

    def test_register_email_already_exists(self, monkeypatch):
        """Test registration fails when email already exists."""
        existing_user = Mock()
        monkeypatch.setattr(
            "backend.services.auth_service.get_user_by_email",
            lambda email: existing_user,
        )

        with pytest.raises(AuthServiceError) as exc_info:
            register_with_password(
                email="existing@example.com",
                password="password123",
                full_name="John Doe",
                role="candidate",
            )

        assert exc_info.value.status == 409
        assert "tồn tại" in exc_info.value.message

    def test_register_invalid_role(self, monkeypatch):
        """Test registration fails with invalid role."""
        monkeypatch.setattr(
            "backend.services.auth_service.get_user_by_email",
            lambda email: None,
        )

        with pytest.raises(AuthServiceError) as exc_info:
            register_with_password(
                email="user@example.com",
                password="password123",
                full_name="John Doe",
                role="admin",
            )

        assert exc_info.value.status == 400
        assert "vai trò" in exc_info.value.message

    def test_register_password_too_short(self, monkeypatch):
        """Test registration fails with password < 6 characters."""
        monkeypatch.setattr(
            "backend.services.auth_service.get_user_by_email",
            lambda email: None,
        )

        with pytest.raises(AuthServiceError) as exc_info:
            register_with_password(
                email="user@example.com",
                password="123",
                full_name="John Doe",
                role="candidate",
            )

        assert exc_info.value.status == 400
        assert "6 ký tự" in exc_info.value.message

    def test_register_missing_full_name(self, monkeypatch):
        """Test registration fails with missing full name."""
        monkeypatch.setattr(
            "backend.services.auth_service.get_user_by_email",
            lambda email: None,
        )

        with pytest.raises(AuthServiceError) as exc_info:
            register_with_password(
                email="user@example.com",
                password="password123",
                full_name="  ",
                role="candidate",
            )

        assert exc_info.value.status == 400
        assert "họ và tên" in exc_info.value.message

    def test_register_invalid_email(self, monkeypatch):
        """Test registration fails with invalid email."""
        with pytest.raises(AuthServiceError) as exc_info:
            register_with_password(
                email="not-an-email",
                password="password123",
                full_name="John Doe",
                role="candidate",
            )

        assert exc_info.value.status == 400
        assert "không hợp lệ" in exc_info.value.message

    def test_register_empty_email(self, monkeypatch):
        """Test registration fails with empty email."""
        with pytest.raises(AuthServiceError) as exc_info:
            register_with_password(
                email="",
                password="password123",
                full_name="John Doe",
                role="candidate",
            )

        assert exc_info.value.status == 400

    def test_register_email_normalization(self, monkeypatch):
        """Test that email is normalized during registration."""
        captured_emails = []

        def capture_get_user(email):
            captured_emails.append(email)
            return None

        monkeypatch.setattr(
            "backend.services.auth_service.get_user_by_email",
            capture_get_user,
        )

        mock_db_session = Mock()
        monkeypatch.setattr(
            "backend.services.auth_service.db.session",
            mock_db_session,
        )

        with patch("backend.services.auth_service.User"):
            with patch("backend.services.auth_service.CandidateProfile"):
                try:
                    register_with_password(
                        email="  USER@EXAMPLE.COM  ",
                        password="password123",
                        full_name="John Doe",
                        role="candidate",
                    )
                except:
                    pass

                assert captured_emails[0] == "user@example.com"


@pytest.mark.unit
class TestUpdatePassword:
    """Test cases for update_password function."""

    def test_update_password_success(self, monkeypatch):
        """Test successful password update."""
        mock_user = Mock()
        mock_user.id = 1
        mock_user.password_hash = "old_hashed_password"

        monkeypatch.setattr(
            "backend.services.auth_service.get_user_by_id",
            lambda user_id: mock_user,
        )

        monkeypatch.setattr(
            "backend.services.auth_service.verify_password",
            lambda hash, pwd: True,
        )

        mock_db_session = Mock()
        monkeypatch.setattr(
            "backend.services.auth_service.db.session",
            mock_db_session,
        )

        result = update_password(1, "oldpassword", "newpassword123")

        assert result is True
        assert mock_user.password_hash != "old_hashed_password"
        mock_db_session.commit.assert_called_once()

    def test_update_password_user_not_found(self, monkeypatch):
        """Test password update fails when user not found."""
        monkeypatch.setattr(
            "backend.services.auth_service.get_user_by_id",
            lambda user_id: None,
        )

        with pytest.raises(AuthServiceError) as exc_info:
            update_password(999, "oldpassword", "newpassword123")

        assert exc_info.value.status == 404

    def test_update_password_wrong_old_password(self, monkeypatch):
        """Test password update fails with wrong old password."""
        mock_user = Mock()
        mock_user.id = 1
        mock_user.password_hash = "old_hashed_password"

        monkeypatch.setattr(
            "backend.services.auth_service.get_user_by_id",
            lambda user_id: mock_user,
        )

        monkeypatch.setattr(
            "backend.services.auth_service.verify_password",
            lambda hash, pwd: False,
        )

        with pytest.raises(AuthServiceError) as exc_info:
            update_password(1, "wrongpassword", "newpassword123")

        assert exc_info.value.status == 401
        assert "cũ không đúng" in exc_info.value.message

    def test_update_password_new_password_too_short(self, monkeypatch):
        """Test password update fails when new password is too short."""
        mock_user = Mock()
        mock_user.id = 1
        mock_user.password_hash = "old_hashed_password"

        monkeypatch.setattr(
            "backend.services.auth_service.get_user_by_id",
            lambda user_id: mock_user,
        )

        monkeypatch.setattr(
            "backend.services.auth_service.verify_password",
            lambda hash, pwd: True,
        )

        with pytest.raises(AuthServiceError) as exc_info:
            update_password(1, "oldpassword", "123")

        assert exc_info.value.status == 400
        assert "6 ký tự" in exc_info.value.message


@pytest.mark.unit
class TestUpdateUserProfile:
    """Test cases for update_user_profile function."""

    def test_update_profile_basic_info(self, monkeypatch):
        """Test successful profile update with basic info."""
        mock_user = Mock()
        mock_user.id = 1
        mock_user.full_name = "Old Name"
        mock_user.phone = "123456"
        mock_user.role = "candidate"
        mock_user.avatar_url = None

        monkeypatch.setattr(
            "backend.services.auth_service.get_user_by_id",
            lambda user_id: mock_user,
        )

        monkeypatch.setattr(
            "backend.services.auth_service.get_profile_by_user_id",
            lambda user_id: None,
        )

        mock_db_session = Mock()
        monkeypatch.setattr(
            "backend.services.auth_service.db.session",
            mock_db_session,
        )

        result = update_user_profile(
            1,
            {"full_name": "New Name", "phone": "9876543210"},
        )

        assert result is True
        assert mock_user.full_name == "New Name"
        assert mock_user.phone == "9876543210"
        mock_db_session.commit.assert_called_once()

    def test_update_profile_user_not_found(self, monkeypatch):
        """Test profile update fails when user not found."""
        monkeypatch.setattr(
            "backend.services.auth_service.get_user_by_id",
            lambda user_id: None,
        )

        with pytest.raises(AuthServiceError) as exc_info:
            update_user_profile(999, {"full_name": "New Name"})

        assert exc_info.value.status == 404

    def test_update_profile_candidate_details(self, monkeypatch):
        """Test updating candidate profile details."""
        mock_user = Mock()
        mock_user.id = 1
        mock_user.full_name = "John Doe"
        mock_user.phone = None
        mock_user.role = "candidate"
        mock_user.avatar_url = None

        mock_profile = Mock()
        mock_profile.user_id = 1
        mock_profile.dob = None
        mock_profile.gender = None
        mock_profile.address = None

        monkeypatch.setattr(
            "backend.services.auth_service.get_user_by_id",
            lambda user_id: mock_user,
        )

        monkeypatch.setattr(
            "backend.services.auth_service.get_profile_by_user_id",
            lambda user_id: mock_profile,
        )

        mock_db_session = Mock()
        monkeypatch.setattr(
            "backend.services.auth_service.db.session",
            mock_db_session,
        )

        result = update_user_profile(
            1,
            {
                "headline": "Senior Software Engineer",
                "years_experience": 5,
                "desired_location": "Ho Chi Minh City",
            },
        )

        assert result is True
        assert mock_profile.headline == "Senior Software Engineer"
        assert mock_profile.years_experience == 5
        assert mock_profile.desired_location == "Ho Chi Minh City"


@pytest.mark.unit
class TestGetUserInfo:
    """Test cases for get_user_info function."""

    def test_get_user_info_success(self, monkeypatch):
        """Test successful retrieval of user info."""
        mock_user = Mock()
        mock_user.id = 1
        mock_user.email = "user@example.com"
        mock_user.full_name = "John Doe"
        mock_user.phone = "1234567890"
        mock_user.role = "candidate"
        mock_user.status = "active"
        mock_user.avatar_url = "https://example.com/avatar.jpg"
        mock_user.email_verified = True
        mock_user.last_login_at = datetime.utcnow()
        mock_user.created_at = datetime.utcnow()

        monkeypatch.setattr(
            "backend.services.auth_service.get_user_by_id",
            lambda user_id: mock_user,
        )

        result = get_user_info(1)

        assert result["id"] == 1
        assert result["email"] == "user@example.com"
        assert result["full_name"] == "John Doe"
        assert result["role"] == "candidate"
        assert result["status"] == "active"
        assert result["email_verified"] is True

    def test_get_user_info_not_found(self, monkeypatch):
        """Test getting user info fails when user not found."""
        monkeypatch.setattr(
            "backend.services.auth_service.get_user_by_id",
            lambda user_id: None,
        )

        with pytest.raises(AuthServiceError) as exc_info:
            get_user_info(999)

        assert exc_info.value.status == 404


@pytest.mark.unit
class TestLockAndUnlockUser:
    """Test cases for lock_user and unlock_user functions."""

    def test_lock_user_success(self, monkeypatch):
        """Test successful user account lock."""
        mock_user = Mock()
        mock_user.id = 1
        mock_user.status = "active"

        monkeypatch.setattr(
            "backend.services.auth_service.get_user_by_id",
            lambda user_id: mock_user,
        )

        mock_db_session = Mock()
        monkeypatch.setattr(
            "backend.services.auth_service.db.session",
            mock_db_session,
        )

        result = lock_user(1)

        assert result is True
        assert mock_user.status == "locked"
        mock_db_session.commit.assert_called_once()

    def test_lock_user_not_found(self, monkeypatch):
        """Test locking user fails when user not found."""
        monkeypatch.setattr(
            "backend.services.auth_service.get_user_by_id",
            lambda user_id: None,
        )

        with pytest.raises(AuthServiceError) as exc_info:
            lock_user(999)

        assert exc_info.value.status == 404

    def test_unlock_user_success(self, monkeypatch):
        """Test successful user account unlock."""
        mock_user = Mock()
        mock_user.id = 1
        mock_user.status = "locked"

        monkeypatch.setattr(
            "backend.services.auth_service.get_user_by_id",
            lambda user_id: mock_user,
        )

        mock_db_session = Mock()
        monkeypatch.setattr(
            "backend.services.auth_service.db.session",
            mock_db_session,
        )

        result = unlock_user(1)

        assert result is True
        assert mock_user.status == "active"
        mock_db_session.commit.assert_called_once()

    def test_unlock_user_not_found(self, monkeypatch):
        """Test unlocking user fails when user not found."""
        monkeypatch.setattr(
            "backend.services.auth_service.get_user_by_id",
            lambda user_id: None,
        )

        with pytest.raises(AuthServiceError) as exc_info:
            unlock_user(999)

        assert exc_info.value.status == 404
