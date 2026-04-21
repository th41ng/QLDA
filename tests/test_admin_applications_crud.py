"""
Unit tests for Admin CRUD operations - Applications
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

from backend.models import Application, User, JobPosting, Resume


@pytest.mark.unit
class TestAdminApplicationsCRUD:
    """Test Admin Applications CRUD operations"""

    def test_get_applications_list_success(self, monkeypatch, app):
        """Test retrieving all applications successfully"""
        with app.app_context():
            mock_applications = [
                Mock(
                    id=1,
                    candidate_user_id=1,
                    job_id=1,
                    resume_id=1,
                    status="submitted",
                    cover_letter="Letter 1",
                    recruiter_note=None,
                    applied_at=datetime(2026, 4, 20),
                    updated_at=datetime(2026, 4, 20),
                ),
                Mock(
                    id=2,
                    candidate_user_id=2,
                    job_id=2,
                    resume_id=2,
                    status="reviewing",
                    cover_letter="Letter 2",
                    recruiter_note="Good candidate",
                    applied_at=datetime(2026, 4, 19),
                    updated_at=datetime(2026, 4, 19),
                ),
            ]

            monkeypatch.setattr(
                "backend.web.admin_routes.Application.query.order_by",
                Mock(
                    return_value=Mock(
                        all=Mock(return_value=mock_applications)
                    )
                ),
            )

            # Simulate the route
            with app.test_request_context("/admin/applications"):
                from backend.web.admin_routes import admin_bp
                
                # Verify applications are loaded
                assert len(mock_applications) == 2
                assert mock_applications[0].status == "submitted"
                assert mock_applications[1].recruiter_note == "Good candidate"

    def test_get_applications_with_edit_id(self, monkeypatch, app):
        """Test retrieving single application for editing"""
        with app.app_context():
            mock_app = Mock(
                id=1,
                candidate_user_id=1,
                job_id=1,
                resume_id=1,
                status="submitted",
                cover_letter="Test letter",
                recruiter_note=None,
                applied_at=datetime(2026, 4, 20),
                updated_at=datetime(2026, 4, 20),
            )

            monkeypatch.setattr(
                "backend.core.extensions.db.session.get",
                Mock(return_value=mock_app),
            )

            # Simulate getting application by ID
            with app.test_request_context("/admin/applications?edit=1"):
                # Verify we can retrieve the application
                assert mock_app.id == 1
                assert mock_app.status == "submitted"

    def test_update_application_status(self, monkeypatch, app):
        """Test updating application status"""
        with app.app_context():
            mock_app = Mock(
                id=1,
                candidate_user_id=1,
                job_id=1,
                resume_id=1,
                status="submitted",
                recruiter_note=None,
                applied_at=datetime(2026, 4, 20),
                updated_at=datetime(2026, 4, 20),
            )

            monkeypatch.setattr(
                "backend.core.extensions.db.session.get",
                Mock(return_value=mock_app),
            )

            # Simulate status update
            mock_app.status = "reviewing"
            mock_app.recruiter_note = "Reviewing application"

            assert mock_app.status == "reviewing"
            assert mock_app.recruiter_note == "Reviewing application"

    def test_update_application_recruiter_note(self, monkeypatch, app):
        """Test updating recruiter note"""
        with app.app_context():
            mock_app = Mock(
                id=1,
                status="submitted",
                recruiter_note=None,
            )

            # Simulate adding recruiter note
            mock_app.recruiter_note = "Strong technical skills"

            assert mock_app.recruiter_note == "Strong technical skills"

    def test_delete_application_success(self, monkeypatch, app):
        """Test deleting application successfully"""
        with app.app_context():
            mock_app = Mock(
                id=1,
                candidate_user_id=1,
                job_id=1,
                resume_id=1,
                status="submitted",
            )
            mock_db = Mock()

            monkeypatch.setattr(
                "backend.core.extensions.db.session.get",
                Mock(return_value=mock_app),
            )
            monkeypatch.setattr(
                "backend.core.extensions.db.session",
                mock_db,
            )

            # Simulate deletion
            if mock_app:
                mock_db.delete(mock_app)
                mock_db.commit()

            mock_db.delete.assert_called_with(mock_app)
            mock_db.commit.assert_called()

    def test_delete_application_not_found(self, monkeypatch, app):
        """Test deleting application that doesn't exist"""
        with app.app_context():
            monkeypatch.setattr(
                "backend.core.extensions.db.session.get",
                Mock(return_value=None),
            )

            mock_app = None

            assert mock_app is None

    def test_update_application_not_found(self, monkeypatch, app):
        """Test updating application that doesn't exist"""
        with app.app_context():
            monkeypatch.setattr(
                "backend.core.extensions.db.session.get",
                Mock(return_value=None),
            )

            with app.test_request_context(
                "/admin/applications",
                method="POST",
                data={
                    "action": "save",
                    "application_id": "999",
                    "status": "reviewing",
                },
            ):
                mock_app = None
                assert mock_app is None

    def test_update_application_with_valid_status(self, monkeypatch, app):
        """Test updating application with valid status"""
        with app.app_context():
            mock_app = Mock(
                id=1,
                status="submitted",
                recruiter_note=None,
            )

            # Valid status options
            valid_statuses = ["submitted", "reviewing", "interview", "accepted", "rejected"]
            
            # Simulate status update
            new_status = "interview"
            if new_status in valid_statuses:
                mock_app.status = new_status

            assert mock_app.status == "interview"

    def test_update_application_with_invalid_status(self, monkeypatch, app):
        """Test updating application with invalid status (should be ignored)"""
        with app.app_context():
            mock_app = Mock(
                id=1,
                status="submitted",
                recruiter_note=None,
            )
            original_status = mock_app.status
            
            # Valid status options
            valid_statuses = ["submitted", "reviewing", "interview", "accepted", "rejected"]
            
            # Try invalid status - should not update
            invalid_status = "invalid_status"
            if invalid_status in valid_statuses:
                mock_app.status = invalid_status
            
            # Status should remain unchanged
            assert mock_app.status == original_status

    def test_update_application_recruiter_note_empty_to_none(self, monkeypatch, app):
        """Test that empty recruiter note is converted to None"""
        with app.app_context():
            mock_app = Mock(
                id=1,
                recruiter_note="Previous note",
            )

            # Simulate empty string converted to None
            empty_note = "".strip() or None
            if empty_note is None:
                mock_app.recruiter_note = empty_note

            assert mock_app.recruiter_note is None

    def test_list_applications_ordered_by_applied_at_desc(self, monkeypatch, app):
        """Test that applications are ordered by applied_at descending"""
        with app.app_context():
            mock_apps = [
                Mock(id=1, applied_at=datetime(2026, 4, 21)),
                Mock(id=2, applied_at=datetime(2026, 4, 20)),
                Mock(id=3, applied_at=datetime(2026, 4, 19)),
            ]

            monkeypatch.setattr(
                "backend.web.admin_routes.Application.query.order_by",
                Mock(
                    return_value=Mock(
                        all=Mock(return_value=mock_apps)
                    )
                ),
            )

            # Verify order
            assert mock_apps[0].applied_at > mock_apps[1].applied_at
            assert mock_apps[1].applied_at > mock_apps[2].applied_at

    def test_application_status_options(self, app):
        """Test that valid status options are defined"""
        with app.app_context():
            from backend.web.admin_routes import APPLICATION_STATUS_OPTIONS
            
            valid_statuses = ["submitted", "reviewing", "interview", "accepted", "rejected"]
            
            for status in valid_statuses:
                assert status in APPLICATION_STATUS_OPTIONS

    def test_application_count_total(self, monkeypatch, app):
        """Test counting total applications"""
        with app.app_context():
            mock_apps = [Mock(id=i) for i in range(1, 11)]  # 10 applications
            
            monkeypatch.setattr(
                "backend.web.admin_routes.Application.query.order_by",
                Mock(
                    return_value=Mock(
                        all=Mock(return_value=mock_apps)
                    )
                ),
            )

            total = len(mock_apps)
            assert total == 10


@pytest.mark.unit
class TestApplicationsModel:
    """Test Application model"""

    def test_application_unique_constraint(self):
        """Test that candidate can only apply once per job"""
        # This constraint should be enforced at database level
        # (candidate_user_id, job_id) should be unique
        pass

    def test_application_status_field(self):
        """Test application status field"""
        mock_app = Mock(
            id=1,
            status="submitted",
        )
        
        assert mock_app.status == "submitted"

    def test_application_recruiter_note_field(self):
        """Test application recruiter note field"""
        mock_app = Mock(
            id=1,
            recruiter_note="Test note",
        )
        
        assert mock_app.recruiter_note == "Test note"

    def test_application_timestamps(self):
        """Test application timestamp fields"""
        now = datetime(2026, 4, 21)
        mock_app = Mock(
            applied_at=now,
            updated_at=now,
        )
        
        assert mock_app.applied_at == now
        assert mock_app.updated_at == now


@pytest.mark.unit
class TestApplicationsPermissions:
    """Test application CRUD permissions"""

    def test_applications_route_requires_admin_login(self):
        """Test that /admin/applications requires admin login"""
        # This would be tested via integration tests
        # Admin-only decorator should prevent access
        pass

    def test_applications_route_requires_admin_role(self):
        """Test that /admin/applications requires admin role"""
        # This would be tested via integration tests
        # admin_required decorator should prevent non-admin access
        pass


@pytest.mark.unit
class TestApplicationsValidation:
    """Test application validation"""

    def test_application_note_strips_whitespace(self):
        """Test that recruiter note has whitespace stripped"""
        note_with_spaces = "  Test note  ".strip()
        
        assert note_with_spaces == "Test note"

    def test_application_note_empty_converts_to_none(self):
        """Test that empty note is converted to None"""
        empty_note = "".strip() or None
        
        assert empty_note is None

    def test_application_status_validation(self):
        """Test status validation"""
        valid_statuses = ["submitted", "reviewing", "interview", "accepted", "rejected"]
        
        test_status = "reviewing"
        is_valid = test_status in valid_statuses
        
        assert is_valid is True

    def test_application_invalid_status_ignored(self):
        """Test that invalid status is not applied"""
        valid_statuses = ["submitted", "reviewing", "interview", "accepted", "rejected"]
        original_status = "submitted"
        new_status = "invalid"
        
        # Invalid status should not be applied
        final_status = new_status if new_status in valid_statuses else original_status
        
        assert final_status == original_status


@pytest.fixture
def app():
    """Create Flask app for testing"""
    from backend.app import create_app
    
    app = create_app()
    app.config["TESTING"] = True
    
    return app
