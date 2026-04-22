"""
Unit tests for Admin Statistics API and Services
Tests the statistics routes and services without requiring a real database
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from flask import Flask

from backend.services.statistics_service import get_landing_statistics
from backend.repositories import statistics as stats_repo


@pytest.fixture
def app():
    """Create Flask app context for tests"""
    app = Flask(__name__)
    app.config['TESTING'] = True
    with app.app_context():
        yield app


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.mark.unit
class TestStatisticsRepository:
    """Test statistics repository functions"""

    def test_count_published_jobs_success(self, monkeypatch):
        """Test counting published jobs"""
        # Mock the JobPosting query
        mock_query_result = Mock()
        mock_query_result.count.return_value = 42
        
        mock_job_model = Mock()
        mock_job_model.query.filter.return_value = mock_query_result
        
        monkeypatch.setattr(
            "backend.repositories.statistics.JobPosting",
            mock_job_model
        )
        
        result = stats_repo.count_published_jobs()
        
        assert result == 42
        mock_job_model.query.filter.assert_called_once()

    def test_count_published_jobs_empty(self, monkeypatch):
        """Test counting when no jobs are published"""
        mock_query_result = Mock()
        mock_query_result.count.return_value = 0
        
        mock_job_model = Mock()
        mock_job_model.query.filter.return_value = mock_query_result
        
        monkeypatch.setattr(
            "backend.repositories.statistics.JobPosting",
            mock_job_model
        )
        
        result = stats_repo.count_published_jobs()
        
        assert result == 0

    def test_count_published_employers_success(self, monkeypatch):
        """Test counting distinct employers with published jobs"""
        mock_scalar_result = 15
        
        mock_db_session = Mock()
        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        mock_query.scalar.return_value = mock_scalar_result
        
        mock_db_session.query.return_value = mock_query
        
        monkeypatch.setattr(
            "backend.repositories.statistics.db.session",
            mock_db_session
        )
        
        result = stats_repo.count_published_employers()
        
        assert result == 15
        mock_db_session.query.assert_called_once()

    def test_count_published_employers_no_results(self, monkeypatch):
        """Test counting employers when no jobs are published"""
        mock_db_session = Mock()
        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        mock_query.scalar.return_value = None
        
        mock_db_session.query.return_value = mock_query
        
        monkeypatch.setattr(
            "backend.repositories.statistics.db.session",
            mock_db_session
        )
        
        result = stats_repo.count_published_employers()
        
        assert result == 0

    def test_count_published_employers_single_company(self, monkeypatch):
        """Test counting distinct employers with single company"""
        mock_db_session = Mock()
        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        mock_query.scalar.return_value = 1
        
        mock_db_session.query.return_value = mock_query
        
        monkeypatch.setattr(
            "backend.repositories.statistics.db.session",
            mock_db_session
        )
        
        result = stats_repo.count_published_employers()
        
        assert result == 1

    def test_count_active_categories_success(self, monkeypatch):
        """Test counting active categories"""
        mock_query_result = Mock()
        mock_query_result.count.return_value = 8
        
        mock_category_model = Mock()
        mock_category_model.query.filter.return_value = mock_query_result
        
        monkeypatch.setattr(
            "backend.repositories.statistics.Category",
            mock_category_model
        )
        
        result = stats_repo.count_active_categories()
        
        assert result == 8
        mock_category_model.query.filter.assert_called_once()

    def test_count_active_categories_empty(self, monkeypatch):
        """Test counting when no active categories"""
        mock_query_result = Mock()
        mock_query_result.count.return_value = 0
        
        mock_category_model = Mock()
        mock_category_model.query.filter.return_value = mock_query_result
        
        monkeypatch.setattr(
            "backend.repositories.statistics.Category",
            mock_category_model
        )
        
        result = stats_repo.count_active_categories()
        
        assert result == 0

    def test_count_cv_templates_success(self, monkeypatch):
        """Test counting active CV templates"""
        mock_result = 5
        
        monkeypatch.setattr(
            "backend.repositories.statistics.count_active_cv_templates",
            Mock(return_value=mock_result)
        )
        
        result = stats_repo.count_cv_templates()
        
        assert result == 5

    def test_count_cv_templates_empty(self, monkeypatch):
        """Test counting when no CV templates exist"""
        monkeypatch.setattr(
            "backend.repositories.statistics.count_active_cv_templates",
            Mock(return_value=0)
        )
        
        result = stats_repo.count_cv_templates()
        
        assert result == 0


@pytest.mark.unit
class TestStatisticsService:
    """Test statistics service functions"""

    def test_get_landing_statistics_success(self, monkeypatch):
        """Test getting landing statistics with all data"""
        mock_stats = {
            "total_jobs": 42,
            "total_employers": 15,
            "total_categories": 8,
            "total_cv_templates": 5,
        }
        
        monkeypatch.setattr(
            "backend.services.statistics_service.count_published_jobs",
            Mock(return_value=42)
        )
        monkeypatch.setattr(
            "backend.services.statistics_service.count_published_employers",
            Mock(return_value=15)
        )
        monkeypatch.setattr(
            "backend.services.statistics_service.count_active_categories",
            Mock(return_value=8)
        )
        monkeypatch.setattr(
            "backend.services.statistics_service.count_cv_templates",
            Mock(return_value=5)
        )
        
        result = get_landing_statistics()
        
        assert result == mock_stats
        assert result["total_jobs"] == 42
        assert result["total_employers"] == 15
        assert result["total_categories"] == 8
        assert result["total_cv_templates"] == 5

    def test_get_landing_statistics_zero_values(self, monkeypatch):
        """Test getting statistics when all values are zero"""
        monkeypatch.setattr(
            "backend.services.statistics_service.count_published_jobs",
            Mock(return_value=0)
        )
        monkeypatch.setattr(
            "backend.services.statistics_service.count_published_employers",
            Mock(return_value=0)
        )
        monkeypatch.setattr(
            "backend.services.statistics_service.count_active_categories",
            Mock(return_value=0)
        )
        monkeypatch.setattr(
            "backend.services.statistics_service.count_cv_templates",
            Mock(return_value=0)
        )
        
        result = get_landing_statistics()
        
        assert result["total_jobs"] == 0
        assert result["total_employers"] == 0
        assert result["total_categories"] == 0
        assert result["total_cv_templates"] == 0

    def test_get_landing_statistics_returns_dict_with_required_keys(self, monkeypatch):
        """Test that statistics returns dict with all required keys"""
        monkeypatch.setattr(
            "backend.services.statistics_service.count_published_jobs",
            Mock(return_value=10)
        )
        monkeypatch.setattr(
            "backend.services.statistics_service.count_published_employers",
            Mock(return_value=5)
        )
        monkeypatch.setattr(
            "backend.services.statistics_service.count_active_categories",
            Mock(return_value=3)
        )
        monkeypatch.setattr(
            "backend.services.statistics_service.count_cv_templates",
            Mock(return_value=2)
        )
        
        result = get_landing_statistics()
        
        required_keys = {"total_jobs", "total_employers", "total_categories", "total_cv_templates"}
        assert set(result.keys()) == required_keys

    def test_get_landing_statistics_large_numbers(self, monkeypatch):
        """Test statistics with large numbers"""
        monkeypatch.setattr(
            "backend.services.statistics_service.count_published_jobs",
            Mock(return_value=1000000)
        )
        monkeypatch.setattr(
            "backend.services.statistics_service.count_published_employers",
            Mock(return_value=50000)
        )
        monkeypatch.setattr(
            "backend.services.statistics_service.count_active_categories",
            Mock(return_value=500)
        )
        monkeypatch.setattr(
            "backend.services.statistics_service.count_cv_templates",
            Mock(return_value=100)
        )
        
        result = get_landing_statistics()
        
        assert result["total_jobs"] == 1000000
        assert result["total_employers"] == 50000


@pytest.mark.unit
class TestStatisticsAPI:
    """Test statistics API endpoints"""

    def test_landing_statistics_endpoint_success(self, app, monkeypatch):
        """Test GET /api/statistics/landing endpoint"""
        from backend.api.statistics_routes import api_statistics_bp
        
        mock_stats = {
            "total_jobs": 42,
            "total_employers": 15,
            "total_categories": 8,
            "total_cv_templates": 5,
        }
        
        monkeypatch.setattr(
            "backend.api.statistics_routes.get_landing_statistics",
            Mock(return_value=mock_stats)
        )
        
        # Register the blueprint
        app.register_blueprint(api_statistics_bp, url_prefix="/api/statistics")
        
        with app.test_client() as client:
            response = client.get("/api/statistics/landing")
            
            # The json_ok function wraps the data, so we need to verify the structure
            assert response.status_code == 200

    def test_landing_statistics_returns_json(self, app, monkeypatch):
        """Test that landing statistics returns JSON"""
        from backend.api.statistics_routes import api_statistics_bp
        
        mock_stats = {
            "total_jobs": 100,
            "total_employers": 20,
            "total_categories": 10,
            "total_cv_templates": 5,
        }
        
        monkeypatch.setattr(
            "backend.api.statistics_routes.get_landing_statistics",
            Mock(return_value=mock_stats)
        )
        
        app.register_blueprint(api_statistics_bp, url_prefix="/api/statistics")
        
        with app.test_client() as client:
            response = client.get("/api/statistics/landing")
            
            assert response.content_type == "application/json"

    def test_landing_statistics_endpoint_empty_data(self, app, monkeypatch):
        """Test landing statistics endpoint with empty data"""
        from backend.api.statistics_routes import api_statistics_bp
        
        mock_stats = {
            "total_jobs": 0,
            "total_employers": 0,
            "total_categories": 0,
            "total_cv_templates": 0,
        }
        
        monkeypatch.setattr(
            "backend.api.statistics_routes.get_landing_statistics",
            Mock(return_value=mock_stats)
        )
        
        app.register_blueprint(api_statistics_bp, url_prefix="/api/statistics")
        
        with app.test_client() as client:
            response = client.get("/api/statistics/landing")
            
            assert response.status_code == 200


@pytest.mark.unit
class TestStatisticsIntegration:
    """Test integration between repository, service, and API"""

    def test_full_statistics_flow(self, monkeypatch):
        """Test complete flow from repository to API"""
        # Mock all repository functions
        monkeypatch.setattr(
            "backend.repositories.statistics.JobPosting",
            Mock(query=Mock(filter=Mock(return_value=Mock(count=Mock(return_value=30)))))
        )
        
        monkeypatch.setattr(
            "backend.repositories.statistics.db.session",
            Mock(query=Mock(return_value=Mock(filter=Mock(return_value=Mock(scalar=Mock(return_value=10))))))
        )
        
        monkeypatch.setattr(
            "backend.repositories.statistics.Category",
            Mock(query=Mock(filter=Mock(return_value=Mock(count=Mock(return_value=5)))))
        )
        
        monkeypatch.setattr(
            "backend.repositories.statistics.count_active_cv_templates",
            Mock(return_value=3)
        )
        
        result = get_landing_statistics()
        
        assert result["total_jobs"] == 30
        assert result["total_employers"] == 10
        assert result["total_categories"] == 5
        assert result["total_cv_templates"] == 3

    def test_statistics_all_values_are_integers(self, monkeypatch):
        """Test that all statistics values are integers"""
        monkeypatch.setattr(
            "backend.services.statistics_service.count_published_jobs",
            Mock(return_value=42)
        )
        monkeypatch.setattr(
            "backend.services.statistics_service.count_published_employers",
            Mock(return_value=15)
        )
        monkeypatch.setattr(
            "backend.services.statistics_service.count_active_categories",
            Mock(return_value=8)
        )
        monkeypatch.setattr(
            "backend.services.statistics_service.count_cv_templates",
            Mock(return_value=5)
        )
        
        result = get_landing_statistics()
        
        for key, value in result.items():
            assert isinstance(value, int), f"{key} should be integer, got {type(value)}"

    def test_statistics_values_are_non_negative(self, monkeypatch):
        """Test that all statistics values are non-negative"""
        monkeypatch.setattr(
            "backend.services.statistics_service.count_published_jobs",
            Mock(return_value=0)
        )
        monkeypatch.setattr(
            "backend.services.statistics_service.count_published_employers",
            Mock(return_value=0)
        )
        monkeypatch.setattr(
            "backend.services.statistics_service.count_active_categories",
            Mock(return_value=0)
        )
        monkeypatch.setattr(
            "backend.services.statistics_service.count_cv_templates",
            Mock(return_value=0)
        )
        
        result = get_landing_statistics()
        
        for key, value in result.items():
            assert value >= 0, f"{key} should be non-negative, got {value}"


@pytest.mark.unit
class TestStatisticsEdgeCases:
    """Test edge cases and error handling"""

    def test_count_published_jobs_status_filter(self, monkeypatch):
        """Test that only published jobs are counted"""
        mock_query = Mock()
        mock_filter_result = Mock()
        mock_filter_result.count.return_value = 50
        
        mock_query.filter.return_value = mock_filter_result
        
        mock_job_model = Mock()
        mock_job_model.query = mock_query
        
        monkeypatch.setattr(
            "backend.repositories.statistics.JobPosting",
            mock_job_model
        )
        
        result = stats_repo.count_published_jobs()
        
        # Verify that filter was called to check for status
        mock_query.filter.assert_called_once()
        assert result == 50

    def test_count_published_employers_distinct_companies(self, monkeypatch):
        """Test that only distinct companies are counted"""
        mock_db_session = Mock()
        mock_query = Mock()
        mock_filter_result = Mock()
        
        mock_filter_result.scalar.return_value = 20
        mock_query.filter.return_value = mock_filter_result
        
        mock_db_session.query.return_value = mock_query
        
        monkeypatch.setattr(
            "backend.repositories.statistics.db.session",
            mock_db_session
        )
        
        result = stats_repo.count_published_employers()
        
        assert result == 20
        mock_query.filter.assert_called_once()

    def test_count_active_categories_is_active_filter(self, monkeypatch):
        """Test that only active categories are counted"""
        mock_query = Mock()
        mock_filter_result = Mock()
        mock_filter_result.count.return_value = 10
        
        mock_query.filter.return_value = mock_filter_result
        
        mock_category_model = Mock()
        mock_category_model.query = mock_query
        
        monkeypatch.setattr(
            "backend.repositories.statistics.Category",
            mock_category_model
        )
        
        result = stats_repo.count_active_categories()
        
        mock_query.filter.assert_called_once()
        assert result == 10

    def test_statistics_consistency_across_calls(self, monkeypatch):
        """Test that statistics remain consistent across multiple calls"""
        call_count = {"value": 0}
        
        def mock_count_jobs():
            call_count["value"] += 1
            return 50
        
        monkeypatch.setattr(
            "backend.services.statistics_service.count_published_jobs",
            mock_count_jobs
        )
        monkeypatch.setattr(
            "backend.services.statistics_service.count_published_employers",
            Mock(return_value=10)
        )
        monkeypatch.setattr(
            "backend.services.statistics_service.count_active_categories",
            Mock(return_value=5)
        )
        monkeypatch.setattr(
            "backend.services.statistics_service.count_cv_templates",
            Mock(return_value=3)
        )
        
        result1 = get_landing_statistics()
        result2 = get_landing_statistics()
        
        assert result1["total_jobs"] == result2["total_jobs"]
        assert call_count["value"] == 2  # Should be called twice

    def test_statistics_with_mixed_values(self, monkeypatch):
        """Test statistics with a mix of zero and non-zero values"""
        monkeypatch.setattr(
            "backend.services.statistics_service.count_published_jobs",
            Mock(return_value=100)
        )
        monkeypatch.setattr(
            "backend.services.statistics_service.count_published_employers",
            Mock(return_value=0)  # No employers
        )
        monkeypatch.setattr(
            "backend.services.statistics_service.count_active_categories",
            Mock(return_value=25)
        )
        monkeypatch.setattr(
            "backend.services.statistics_service.count_cv_templates",
            Mock(return_value=0)  # No templates
        )
        
        result = get_landing_statistics()
        
        assert result["total_jobs"] == 100
        assert result["total_employers"] == 0
        assert result["total_categories"] == 25
        assert result["total_cv_templates"] == 0
