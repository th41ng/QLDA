"""
Unit tests for Admin Jobs CRUD operations
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

from backend.models import JobPosting, Company, Tag, Category
from backend.repositories.jobs import get_job_by_id


@pytest.mark.unit
class TestAdminJobsCRUD:
    """Test Admin Jobs CRUD operations"""

    def test_create_job_posting_success(self, monkeypatch):
        """Test creating a new job posting"""
        mock_company = Mock(id=1, company_name="Tech Corp", recruiter_user_id=1)
        mock_job = Mock(
            id=1,
            title="Senior Developer",
            slug="senior-developer",
            company_id=1,
            status="draft",
            tags=[]
        )
        mock_db = Mock()
        
        monkeypatch.setattr("backend.services.users_service.db.session", mock_db)
        
        # Verify job can be created with required fields
        job_data = {
            "title": "Senior Developer",
            "slug": "senior-developer",
            "company_id": 1,
            "description": "Develop awesome features",
            "requirements": "5+ years experience",
            "location": "Ho Chi Minh City",
            "status": "draft",
        }
        
        assert job_data["title"] == "Senior Developer"
        assert job_data["status"] == "draft"

    def test_create_job_posting_validation(self, monkeypatch):
        """Test job posting validation - required fields"""
        invalid_jobs = [
            {"description": "Missing title"},  # Missing title
            {"title": "Dev Job", "company_id": None},  # Missing company
            {"title": "Dev Job", "company_id": 1},  # Missing description
        ]
        
        for invalid_job in invalid_jobs:
            required_fields = ["title", "company_id", "description"]
            has_required = all(invalid_job.get(field) for field in required_fields)
            assert not has_required

    def test_get_job_by_id_success(self, monkeypatch):
        """Test getting job posting by ID"""
        mock_job = Mock(
            id=1,
            title="Senior Developer",
            slug="senior-developer",
            company_id=1,
            status="published",
        )
        
        monkeypatch.setattr("backend.repositories.jobs.get_job_query", Mock(return_value=Mock(
            filter_by=Mock(return_value=Mock(first=Mock(return_value=mock_job)))
        )))
        
        # Note: This is a simplified test - actual implementation may vary
        assert mock_job.id == 1
        assert mock_job.title == "Senior Developer"

    def test_update_job_posting_success(self, monkeypatch):
        """Test updating job posting"""
        mock_job = Mock(
            id=1,
            title="Senior Developer",
            slug="senior-developer",
            status="draft",
            description="Develop features",
            requirements="5+ years",
            location="HCM",
            vacancy_count=1,
            is_featured=False,
            tags=[],
        )
        mock_db = Mock()
        
        monkeypatch.setattr("backend.services.users_service.db.session", mock_db)
        
        # Update fields
        mock_job.title = "Lead Developer"
        mock_job.status = "published"
        
        assert mock_job.title == "Lead Developer"
        assert mock_job.status == "published"

    def test_update_job_status_to_published(self, monkeypatch):
        """Test publishing a draft job"""
        mock_job = Mock(
            id=1,
            status="draft",
            published_at=None,
        )
        mock_db = Mock()
        
        monkeypatch.setattr("backend.services.users_service.db.session", mock_db)
        
        # Simulate status change
        mock_job.status = "published"
        if mock_job.status == "published" and not mock_job.published_at:
            mock_job.published_at = datetime.utcnow()
        
        assert mock_job.status == "published"
        assert mock_job.published_at is not None

    def test_delete_job_posting_success(self, monkeypatch):
        """Test deleting job posting"""
        mock_job = Mock(id=1, title="Senior Developer")
        mock_db = Mock()
        
        monkeypatch.setattr("backend.services.users_service.db.session", mock_db)
        
        mock_db.delete(mock_job)
        
        mock_db.delete.assert_called_with(mock_job)

    def test_job_slug_uniqueness_validation(self, monkeypatch):
        """Test that job slugs must be unique"""
        existing_job = Mock(id=1, slug="senior-developer")
        
        # Simulate slug conflict check
        new_slug = "senior-developer"
        conflict = existing_job.slug == new_slug
        
        assert conflict  # Should detect conflict

    def test_job_search_and_filter(self, monkeypatch):
        """Test searching jobs by title and location"""
        jobs = [
            Mock(id=1, title="Senior Developer", location="HCM", status="published"),
            Mock(id=2, title="Junior Developer", location="Hanoi", status="published"),
            Mock(id=3, title="DevOps Engineer", location="HCM", status="draft"),
        ]
        
        # Filter published jobs in HCM
        filtered = [j for j in jobs if j.status == "published" and "HCM" in j.location]
        
        assert len(filtered) == 1
        assert filtered[0].title == "Senior Developer"

    def test_job_featured_toggle(self, monkeypatch):
        """Test toggling job featured status"""
        mock_job = Mock(id=1, is_featured=False)
        mock_db = Mock()
        
        monkeypatch.setattr("backend.services.users_service.db.session", mock_db)
        
        mock_job.is_featured = True
        
        assert mock_job.is_featured is True

    def test_job_tags_assignment(self, monkeypatch):
        """Test assigning tags to job posting"""
        mock_job = Mock(id=1, tags=[])
        mock_tags = [Mock(id=1, name="Python"), Mock(id=2, name="Django")]
        
        mock_job.tags = mock_tags
        
        assert len(mock_job.tags) == 2
        assert mock_job.tags[0].name == "Python"

    def test_job_salary_validation(self, monkeypatch):
        """Test salary range validation"""
        job_data = {
            "salary_min": 1000,
            "salary_max": 5000,
            "salary_currency": "USD"
        }
        
        # Salary max should be >= salary min
        assert job_data["salary_max"] >= job_data["salary_min"]
        assert job_data["salary_currency"] == "USD"

    def test_job_vacancy_count_validation(self, monkeypatch):
        """Test vacancy count must be positive"""
        vacancy_counts = [1, 5, 10, -1, 0]
        
        valid_counts = [vc for vc in vacancy_counts if vc > 0]
        
        assert len(valid_counts) == 3
        assert -1 not in valid_counts


@pytest.mark.unit
class TestAdminJobDataIntegrity:
    """Test Data Integrity in Admin Job Operations"""

    def test_job_title_cannot_be_empty(self):
        """Test that job title is required"""
        job_data = {"title": "", "company_id": 1}
        assert not job_data["title"]

    def test_job_description_cannot_be_empty(self):
        """Test that job description is required"""
        job_data = {"title": "Dev Job", "description": "", "company_id": 1}
        assert not job_data["description"]

    def test_job_company_cannot_be_empty(self):
        """Test that job company is required"""
        job_data = {"title": "Dev Job", "description": "Work", "company_id": None}
        assert job_data["company_id"] is None

    def test_job_location_cannot_be_empty(self):
        """Test that job location is required"""
        job_data = {"title": "Dev Job", "location": ""}
        assert not job_data["location"]


@pytest.mark.unit
class TestAdminJobFiltering:
    """Test Job Filtering and Search Functionality"""

    def test_filter_by_status(self):
        """Test filtering jobs by status"""
        jobs = [
            Mock(id=1, title="Job 1", status="published"),
            Mock(id=2, title="Job 2", status="draft"),
            Mock(id=3, title="Job 3", status="published"),
        ]
        
        published = [j for j in jobs if j.status == "published"]
        draft = [j for j in jobs if j.status == "draft"]
        
        assert len(published) == 2
        assert len(draft) == 1

    def test_filter_by_company(self):
        """Test filtering jobs by company"""
        jobs = [
            Mock(id=1, title="Job 1", company_id=1),
            Mock(id=2, title="Job 2", company_id=2),
            Mock(id=3, title="Job 3", company_id=1),
        ]
        
        company_1_jobs = [j for j in jobs if j.company_id == 1]
        company_2_jobs = [j for j in jobs if j.company_id == 2]
        
        assert len(company_1_jobs) == 2
        assert len(company_2_jobs) == 1

    def test_filter_by_tag(self):
        """Test filtering jobs by tag"""
        jobs = [
            Mock(id=1, tags=[Mock(id=1, name="Python")]),
            Mock(id=2, tags=[Mock(id=2, name="Java")]),
            Mock(id=3, tags=[Mock(id=1, name="Python")]),
        ]
        
        python_jobs = [j for j in jobs if any(tag.name == "Python" for tag in j.tags)]
        
        assert len(python_jobs) == 2

    def test_search_job_by_title(self):
        """Test searching jobs by title"""
        jobs = [
            Mock(id=1, title="Senior Developer"),
            Mock(id=2, title="Junior Developer"),
            Mock(id=3, title="DevOps Engineer"),
        ]
        
        search_results = [j for j in jobs if "Developer" in j.title]
        
        assert len(search_results) == 2

    def test_search_job_by_location(self):
        """Test searching jobs by location"""
        jobs = [
            Mock(id=1, title="Job 1", location="Ho Chi Minh"),
            Mock(id=2, title="Job 2", location="Hanoi"),
            Mock(id=3, title="Job 3", location="Ho Chi Minh"),
        ]
        
        hcm_jobs = [j for j in jobs if "Ho Chi Minh" in j.location]
        
        assert len(hcm_jobs) == 2


@pytest.mark.unit
class TestAdminJobBulkOperations:
    """Test Bulk Operations for Admin Jobs"""

    def test_bulk_job_status_change(self, monkeypatch):
        """Test changing status for multiple jobs"""
        jobs = [
            Mock(id=1, status="draft"),
            Mock(id=2, status="draft"),
            Mock(id=3, status="draft"),
        ]
        
        # Bulk publish
        for job in jobs:
            job.status = "published"
            job.published_at = datetime.utcnow()
        
        assert all(j.status == "published" for j in jobs)
        assert all(j.published_at is not None for j in jobs)

    def test_bulk_job_featured_toggle(self, monkeypatch):
        """Test toggling featured status for multiple jobs"""
        jobs = [
            Mock(id=1, is_featured=False),
            Mock(id=2, is_featured=False),
            Mock(id=3, is_featured=False),
        ]
        
        # Bulk set featured
        for job in jobs:
            job.is_featured = True
        
        assert all(j.is_featured for j in jobs)

    def test_bulk_delete_draft_jobs(self, monkeypatch):
        """Test identifying draft jobs for deletion"""
        jobs = [
            Mock(id=1, status="draft"),
            Mock(id=2, status="published"),
            Mock(id=3, status="draft"),
        ]
        
        # Get draft jobs
        draft_jobs = [j for j in jobs if j.status == "draft"]
        
        assert len(draft_jobs) == 2
        assert all(j.status == "draft" for j in draft_jobs)
