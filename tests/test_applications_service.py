"""
Unit tests for application service (backend/services/application_service.py).
These tests mock DB/query behavior and do not require a real database.
"""

from unittest.mock import Mock

import pytest
from flask import Flask

from backend.services.application_service import (
    update_application_status,
    ApplicationServiceError,
    InvalidStatusError,
    MissingReasonError,
    ApplicationNotFoundError,
)


@pytest.fixture
def app():
    """Create Flask app context for tests"""
    app = Flask(__name__)
    with app.app_context():
        yield app


@pytest.mark.unit
class TestUpdateApplicationStatusService:
    """Test application status update service logic"""

    def test_invalid_status_raises_error(self, app, monkeypatch):
        """Test that invalid status raises InvalidStatusError"""
        with pytest.raises(InvalidStatusError) as exc_info:
            update_application_status(
                application_id=1,
                recruiter_user_id=5,
                status="invalid_status"
            )
        assert "Invalid status" in str(exc_info.value)

    def test_update_to_accepted_status_success(self, app, monkeypatch):
        """Test successful update to accepted status"""
        from backend.services import application_service
        
        mock_app = Mock(
            id=1,
            status="reviewing",
            recruiter_note=None
        )
        mock_query = Mock()
        mock_query.join.return_value.filter.return_value.first.return_value = mock_app
        
        monkeypatch.setattr(
            application_service,
            "Application",
            Mock(query=mock_query)
        )
        
        mock_db = Mock()
        monkeypatch.setattr(
            application_service,
            "db",
            mock_db
        )
        
        result = update_application_status(
            application_id=1,
            recruiter_user_id=5,
            status="accepted"
        )
        
        assert result.status == "accepted"
        mock_db.session.commit.assert_called_once()

    def test_update_to_rejected_status_with_reason(self, app, monkeypatch):
        """Test successful update to rejected status with reason"""
        from backend.services import application_service
        
        mock_app = Mock(
            id=1,
            status="reviewing",
            recruiter_note=None,
            candidate_user_id=10,
            job_id=20,
            job=Mock(title="Developer"),
            candidate=Mock(email="test@test.com", full_name="Jane")
        )
        mock_query = Mock()
        mock_query.join.return_value.filter.return_value.first.return_value = mock_app
        
        monkeypatch.setattr(
            application_service,
            "Application",
            Mock(query=mock_query)
        )
        
        mock_db = Mock()
        monkeypatch.setattr(
            application_service,
            "db",
            mock_db
        )
        
        mock_notify = Mock()
        monkeypatch.setattr(
            application_service,
            "_notify_candidate_for_status",
            mock_notify
        )
        
        reason = "Not a good fit"
        result = update_application_status(
            application_id=1,
            recruiter_user_id=5,
            status="rejected",
            reason=reason
        )
        
        assert result.status == "rejected"
        assert result.recruiter_note == reason
        mock_notify.assert_called_once_with(mock_app, reason)
        mock_db.session.commit.assert_called_once()

    def test_application_not_found_raises_error(self, app, monkeypatch):
        """Test that non-existent application raises ApplicationNotFoundError"""
        from backend.services import application_service
        
        mock_query = Mock()
        mock_query.join.return_value.filter.return_value.first.return_value = None
        
        monkeypatch.setattr(
            application_service,
            "Application",
            Mock(query=mock_query)
        )
        
        with pytest.raises(ApplicationNotFoundError) as exc_info:
            update_application_status(
                application_id=999,
                recruiter_user_id=5,
                status="reviewing"
            )
        assert "not found" in str(exc_info.value).lower()
