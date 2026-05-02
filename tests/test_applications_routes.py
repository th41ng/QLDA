"""
Unit tests for application submission routes (backend/api/applications_routes.py).
These tests mock DB/query behavior and do not require a real database.
"""

from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from flask import Flask

from backend.api import applications_routes as ar


@pytest.fixture
def app():
    app = Flask(__name__)
    with app.app_context():
        yield app


def _unwrap(view_func):
    """Unwrap jwt/role decorators so the route logic can be unit tested directly."""
    raw = view_func
    while hasattr(raw, "__wrapped__"):
        raw = raw.__wrapped__
    return raw


@pytest.mark.unit
class TestCreateApplicationRoute:
    def test_create_application_rejects_non_integer_ids(self, app, monkeypatch):
        monkeypatch.setattr(ar, "get_jwt_identity", lambda: "7")

        with app.test_request_context("/api/applications", method="POST", json={"job_id": "abc", "resume_id": 2}):
            response, status_code = _unwrap(ar.create_application)()

        assert status_code == 400
        assert response.get_json()["message"] == "job_id and resume_id must be integers."

    def test_create_application_rejects_duplicate_submission(self, app, monkeypatch):
        user_id = 10
        job = Mock(id=99, status="published", deadline=None)
        resume = Mock(id=15)

        monkeypatch.setattr(ar, "get_jwt_identity", lambda: str(user_id))

        job_query = Mock()
        job_query.filter_by.return_value.first.return_value = job
        monkeypatch.setattr(ar.JobPosting, "query", job_query)

        resume_query = Mock()
        resume_query.filter_by.return_value.first.return_value = resume
        monkeypatch.setattr(ar.Resume, "query", resume_query)

        app_query = Mock()
        app_query.filter_by.return_value.first.return_value = Mock(id=123)
        monkeypatch.setattr(ar.Application, "query", app_query)

        with app.test_request_context("/api/applications", method="POST", json={"job_id": 99, "resume_id": 15}):
            response, status_code = _unwrap(ar.create_application)()

        assert status_code == 409
        assert response.get_json()["message"] == "You already applied to this job."

    def test_create_application_success(self, app, monkeypatch):
        user_id = 10
        job = Mock(id=99, status="published", deadline=None)
        resume = Mock(id=15)

        monkeypatch.setattr(ar, "get_jwt_identity", lambda: str(user_id))

        job_query = Mock()
        job_query.filter_by.return_value.first.return_value = job
        monkeypatch.setattr(ar.JobPosting, "query", job_query)

        resume_query = Mock()
        resume_query.filter_by.return_value.first.return_value = resume
        monkeypatch.setattr(ar.Resume, "query", resume_query)

        app_query = Mock()
        app_query.filter_by.return_value.first.return_value = None
        monkeypatch.setattr(ar.Application, "query", app_query)

        mocked_session = Mock()
        monkeypatch.setattr(ar, "db", SimpleNamespace(session=mocked_session))

        # Keep this unit test independent from ORM serialization internals.
        monkeypatch.setattr(ar, "_application_to_dict", lambda application: {"job_id": application.job_id, "resume_id": application.resume_id})

        payload = {
            "job_id": 99,
            "resume_id": 15,
            "cover_letter": "   Em mong duoc dong hanh cung cong ty.   ",
        }
        with app.test_request_context("/api/applications", method="POST", json=payload):
            response, status_code = _unwrap(ar.create_application)()

        assert status_code == 201
        body = response.get_json()
        assert body["ok"] is True
        assert body["message"] == "Application submitted"
        assert body["data"]["job_id"] == 99
        assert body["data"]["resume_id"] == 15

        mocked_session.add.assert_called_once()
        mocked_session.commit.assert_called_once()


@pytest.mark.unit
class TestCheckApplicationRoute:
    def test_check_application_requires_integer_job_id(self, app, monkeypatch):
        monkeypatch.setattr(ar, "get_jwt_identity", lambda: "7")

        with app.test_request_context("/api/applications/check?job_id=abc", method="GET"):
            response, status_code = _unwrap(ar.check_application_for_job)()

        assert status_code == 400
        assert response.get_json()["message"] == "job_id must be an integer."

    def test_check_application_returns_has_applied_false(self, app, monkeypatch):
        monkeypatch.setattr(ar, "get_jwt_identity", lambda: "7")

        query = Mock()
        query.options.return_value.filter.return_value.first.return_value = None
        monkeypatch.setattr(ar.Application, "query", query)

        with app.test_request_context("/api/applications/check?job_id=23", method="GET"):
            response, status_code = _unwrap(ar.check_application_for_job)()

        assert status_code == 200
        body = response.get_json()
        assert body["ok"] is True
        assert body["data"]["job_id"] == 23
        assert body["data"]["has_applied"] is False
        assert body["data"]["application"] is None

    def test_check_application_returns_has_applied_true(self, app, monkeypatch):
        monkeypatch.setattr(ar, "get_jwt_identity", lambda: "7")

        found_application = Mock(id=88)
        query = Mock()
        query.options.return_value.filter.return_value.first.return_value = found_application
        monkeypatch.setattr(ar.Application, "query", query)
        monkeypatch.setattr(ar, "_application_to_dict", lambda application: {"id": application.id, "status": "submitted"})

        with app.test_request_context("/api/applications/check?job_id=23", method="GET"):
            response, status_code = _unwrap(ar.check_application_for_job)()

        assert status_code == 200
        body = response.get_json()
        assert body["ok"] is True
        assert body["data"]["job_id"] == 23
        assert body["data"]["has_applied"] is True
        assert body["data"]["application"]["id"] == 88
