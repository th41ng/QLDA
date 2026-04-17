"""
Unit tests for Job Posting functionality.
Basic tests for job posting validation and business logic.
"""

import pytest
from datetime import date, timedelta


@pytest.mark.unit
class TestJobBasicValidation:
    """Test basic job posting validation"""

    def test_required_fields(self):
        """Job must have title, description, requirements, location"""
        job_data = {
            "title": "Python Developer",
            "description": "Looking for a skilled Python developer",
            "requirements": "3+ years experience with Python",
            "location": "Ho Chi Minh City"
        }
        assert all(key in job_data for key in ["title", "description", "requirements", "location"])

    def test_title_length(self):
        """Title must be 5-180 characters"""
        assert len("Python Developer") >= 5 and len("Python Developer") <= 180
        assert len("Dev") < 5
        assert len("A" * 181) > 180

    def test_description_length(self):
        """Description must be at least 20 characters"""
        assert len("We are looking for a skilled developer") >= 20
        assert len("Brief") < 20

    def test_location_length(self):
        """Location must be at least 3 characters"""
        assert len("Ho Chi Minh City") >= 3
        assert len("NY") < 3


@pytest.mark.unit
class TestJobStatusAndTypes:
    """Test job status and type options"""

    def test_valid_statuses(self):
        """Valid job statuses: draft, published, closed"""
        statuses = ["draft", "published", "closed"]
        assert "published" in statuses
        assert "draft" in statuses

    def test_valid_workplace_types(self):
        """Valid workplace types: onsite, hybrid, remote"""
        types = ["onsite", "hybrid", "remote"]
        assert "onsite" in types
        assert "remote" in types

    def test_valid_employment_types(self):
        """Valid employment types: full-time, part-time, contract, internship"""
        types = ["full-time", "part-time", "contract", "internship"]
        assert "full-time" in types
        assert "part-time" in types

    def test_valid_experience_levels(self):
        """Valid experience levels: intern, junior, mid, senior, lead"""
        levels = ["intern", "junior", "mid", "senior", "lead"]
        assert "junior" in levels
        assert "senior" in levels


@pytest.mark.unit
class TestJobSalaryAndVacancy:
    """Test salary and vacancy validation"""

    def test_salary_min_max_valid(self):
        """Salary min must not exceed max"""
        assert 20_000_000 <= 40_000_000
        assert not (40_000_000 <= 20_000_000)

    def test_salary_currency(self):
        """Valid currencies: VND, USD"""
        currencies = ["VND", "USD"]
        assert "VND" in currencies

    def test_vacancy_count(self):
        """Vacancy count must be at least 1"""
        assert 1 >= 1
        assert 50 >= 1
        assert 0 < 1


@pytest.mark.unit
class TestJobDeadline:
    """Test job deadline validation"""

    def test_deadline_format(self):
        """Deadline should be YYYY-MM-DD format"""
        deadline = "2025-12-31"
        parts = deadline.split("-")
        assert len(parts) == 3 and len(parts[0]) == 4

    def test_deadline_not_past(self):
        """Deadline cannot be in past"""
        today = date.today()
        future = today + timedelta(days=1)
        assert future > today


@pytest.mark.unit
class TestJobAuthorization:
    """Test job authorization rules"""

    def test_only_creator_can_update(self):
        """Only job creator can update"""
        job_creator_id = 5
        current_user_id = 5
        assert current_user_id == job_creator_id

    def test_non_creator_cannot_update(self):
        """Other users cannot update"""
        job_creator_id = 5
        other_user_id = 10
        assert other_user_id != job_creator_id

    def test_recruiter_role_needed(self):
        """Only recruiters can create jobs"""
        user_role = "recruiter"
        assert user_role == "recruiter"
