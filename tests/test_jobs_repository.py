"""
Unit tests for Job Repository (backend/repositories/jobs.py).
Tests job filtering and search logic without using real database.
All dependencies are mocked - no real database used.
"""

import pytest
from unittest.mock import Mock

from backend.repositories.jobs import list_jobs


@pytest.mark.unit
class TestListJobs:
    """Test cases for list_jobs function."""

    def test_list_jobs_no_filters(self, monkeypatch):
        """Test list_jobs without any filters returns all published jobs."""
        # Mock job objects
        mock_job1 = Mock()
        mock_job1.id = 1
        mock_job1.title = "Frontend Developer"
        mock_job1.status = "published"
        mock_job1.is_featured = True

        mock_job2 = Mock()
        mock_job2.id = 2
        mock_job2.title = "Backend Developer"
        mock_job2.status = "published"
        mock_job2.is_featured = False

        # Mock query chain
        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        mock_query.options.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.all.return_value = [mock_job1, mock_job2]

        mock_job_query = Mock()
        mock_job_query.filter.return_value = mock_query
        mock_job_query.options.return_value = mock_query

        monkeypatch.setattr(
            "backend.repositories.jobs.get_job_query",
            lambda: mock_job_query,
        )

        result = list_jobs({})

        assert len(result) == 2
        assert result[0].title == "Frontend Developer"
        assert result[1].title == "Backend Developer"

    def test_list_jobs_filter_by_query(self, monkeypatch):
        """Test list_jobs filters by query keyword (title/description/requirements/summary)."""
        mock_job = Mock()
        mock_job.id = 1
        mock_job.title = "React Developer"
        mock_job.status = "published"

        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        mock_query.options.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.all.return_value = [mock_job]

        mock_job_query = Mock()
        mock_job_query.filter.return_value = mock_query
        mock_job_query.options.return_value = mock_query

        monkeypatch.setattr(
            "backend.repositories.jobs.get_job_query",
            lambda: mock_job_query,
        )

        result = list_jobs({"q": "react"})

        assert len(result) == 1
        assert result[0].title == "React Developer"

    def test_list_jobs_filter_by_location(self, monkeypatch):
        """Test list_jobs filters by location."""
        mock_job = Mock()
        mock_job.id = 1
        mock_job.title = "Developer"
        mock_job.location = "TP. Ho Chi Minh"
        mock_job.status = "published"

        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        mock_query.options.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.all.return_value = [mock_job]

        mock_job_query = Mock()
        mock_job_query.filter.return_value = mock_query
        mock_job_query.options.return_value = mock_query

        monkeypatch.setattr(
            "backend.repositories.jobs.get_job_query",
            lambda: mock_job_query,
        )

        result = list_jobs({"location": "hcm"})

        assert len(result) == 1
        assert result[0].location == "TP. Ho Chi Minh"


    def test_list_jobs_filter_by_tags(self, monkeypatch):
        """Test list_jobs filters by tags (comma-separated)."""
        mock_job = Mock()
        mock_job.id = 1
        mock_job.title = "Full Stack Developer"
        mock_job.status = "published"

        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        mock_query.options.return_value = mock_query
        mock_query.join.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.all.return_value = [mock_job]

        mock_job_query = Mock()
        mock_job_query.filter.return_value = mock_query
        mock_job_query.options.return_value = mock_query

        monkeypatch.setattr(
            "backend.repositories.jobs.get_job_query",
            lambda: mock_job_query,
        )

        result = list_jobs({"tags": "react,python"})

        assert len(result) == 1
        # Verify join was called for tags
        mock_query.join.assert_called()

    def test_list_jobs_filter_intentionally_fail(self, monkeypatch):
        """Test intentionally fails to demonstrate test failure."""
        mock_job = Mock()
        mock_job.id = 1
        mock_job.title = "Developer"
        mock_job.status = "published"

        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        mock_query.options.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.all.return_value = [mock_job]

        mock_job_query = Mock()
        mock_job_query.filter.return_value = mock_query
        mock_job_query.options.return_value = mock_query

        monkeypatch.setattr(
            "backend.repositories.jobs.get_job_query",
            lambda: mock_job_query,
        )

        result = list_jobs({})

        # Intentionally wrong assertion to demonstrate test failure
        assert len(result) == 999  # Should be 1, but we assert 999 to fail
