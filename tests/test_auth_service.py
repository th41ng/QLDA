"""
Condensed unit tests for Auth Service helpers.
Each core function has one success case and one failure case to keep tests minimal.
"""

import pytest
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
)


@pytest.mark.unit
class TestLogin:
    def test_login_success(self, monkeypatch):
        mock_user = Mock(id=1, email="user@example.com", full_name="John", role="candidate", status="active", password_hash="h")
        monkeypatch.setattr("backend.services.auth_service.get_user_by_email", lambda e: mock_user)
        monkeypatch.setattr("backend.services.auth_service.verify_password", lambda h, p: True)
        mock_db = Mock()
        monkeypatch.setattr("backend.services.auth_service.db.session", mock_db)

        res = login_with_password("user@example.com", "pwd")
        assert res.user_id == 1
        mock_db.commit.assert_called_once()

    def test_login_wrong_password(self, monkeypatch):
        mock_user = Mock(email="user@example.com", status="active", role="candidate", password_hash="h")
        monkeypatch.setattr("backend.services.auth_service.get_user_by_email", lambda e: mock_user)
        monkeypatch.setattr("backend.services.auth_service.verify_password", lambda h, p: False)

        with pytest.raises(AuthServiceError):
            login_with_password("user@example.com", "bad")


@pytest.mark.unit
class TestRegister:
    def test_register_success_candidate(self, monkeypatch):
        monkeypatch.setattr("backend.services.auth_service.get_user_by_email", lambda e: None)
        mock_db = Mock()
        monkeypatch.setattr("backend.services.auth_service.db.session", mock_db)

        mock_user_inst = Mock(id=10, email="new@example.com", full_name="New", role="candidate")
        with patch("backend.services.auth_service.User") as UserClass:
            UserClass.return_value = mock_user_inst
            with patch("backend.services.auth_service.CandidateProfile"):
                res = register_with_password(email="new@example.com", password="pass123", full_name="New", role="candidate")
                assert res.user_id == 10
                mock_db.commit.assert_called()

    def test_register_email_exists(self, monkeypatch):
        monkeypatch.setattr("backend.services.auth_service.get_user_by_email", lambda e: Mock())
        with pytest.raises(AuthServiceError):
            register_with_password(email="existing@example.com", password="p", full_name="X", role="candidate")


@pytest.mark.unit
class TestPasswordUpdate:
    def test_update_password_success(self, monkeypatch):
        mock_user = Mock(id=5, password_hash="old")
        monkeypatch.setattr("backend.services.auth_service.get_user_by_id", lambda i: mock_user)
        monkeypatch.setattr("backend.services.auth_service.verify_password", lambda h, p: True)
        mock_db = Mock()
        monkeypatch.setattr("backend.services.auth_service.db.session", mock_db)

        assert update_password(5, "oldpwd", "newpassword") is True
        mock_db.commit.assert_called()

    def test_update_password_wrong_old(self, monkeypatch):
        mock_user = Mock(id=5, password_hash="old")
        monkeypatch.setattr("backend.services.auth_service.get_user_by_id", lambda i: mock_user)
        monkeypatch.setattr("backend.services.auth_service.verify_password", lambda h, p: False)
        with pytest.raises(AuthServiceError):
            update_password(5, "bad", "new")


@pytest.mark.unit
class TestUserProfileAndInfo:
    def test_update_profile_success(self, monkeypatch):
        mock_user = Mock(id=1, full_name="A", phone=None, role="candidate")
        monkeypatch.setattr("backend.services.auth_service.get_user_by_id", lambda i: mock_user)
        monkeypatch.setattr("backend.services.auth_service.get_profile_by_user_id", lambda i: None)
        mock_db = Mock()
        monkeypatch.setattr("backend.services.auth_service.db.session", mock_db)

        assert update_user_profile(1, {"full_name": "B", "phone": "012"}) is True
        assert mock_user.full_name == "B"

    def test_update_profile_user_not_found(self, monkeypatch):
        monkeypatch.setattr("backend.services.auth_service.get_user_by_id", lambda i: None)
        with pytest.raises(AuthServiceError):
            update_user_profile(999, {"full_name": "X"})

    def test_get_user_info_success_and_not_found(self, monkeypatch):
        mock_user = Mock(id=2, email="u@example.com", full_name="U", role="candidate", status="active", email_verified=True)
        monkeypatch.setattr("backend.services.auth_service.get_user_by_id", lambda i: mock_user if i == 2 else None)
        info = get_user_info(2)
        assert info["email"] == "u@example.com"
        with pytest.raises(AuthServiceError):
            get_user_info(999)


@pytest.mark.unit
class TestLockUnlock:
    def test_lock_and_unlock_success_and_not_found(self, monkeypatch):
        mock_user = Mock(id=7, status="active")
        monkeypatch.setattr("backend.services.auth_service.get_user_by_id", lambda i: mock_user if i == 7 else None)
        mock_db = Mock()
        monkeypatch.setattr("backend.services.auth_service.db.session", mock_db)

        assert lock_user(7) is True
        assert mock_user.status == "locked"

        # unlock
        mock_user.status = "locked"
        assert unlock_user(7) is True

        # not found cases
        with pytest.raises(AuthServiceError):
            lock_user(9999)
        with pytest.raises(AuthServiceError):
            unlock_user(9999)
