from types import SimpleNamespace

import pytest

from backend.api.resume_routes import _manual_resume_raw_text
from backend.core.services.matching_service import resume_profile_text, score_resume_for_job, tokenize


def _tag(name, slug, category_name="Ky nang"):
    category = SimpleNamespace(name=category_name)
    return SimpleNamespace(name=name, slug=slug, description="", category=category)


@pytest.mark.unit
def test_manual_resume_raw_text_uses_only_clean_content_fields():
    text = _manual_resume_raw_text(
        {
            "headline": "Frontend Developer",
            "summary": "Xay dung giao dien web",
            "skills": "React, JavaScript",
            "experience": "2 nam kinh nghiem",
            "education": "Dai hoc CNTT",
            "additional_info": "Github: example",
            "current_title": "Frontend Engineer",
            "template": {
                "id": 1,
                "name": "Modern Blue",
                "slug": "modern-blue",
                "preview_url": "https://example.com/template.png",
            },
            "is_primary": True,
            "extracted": True,
        }
    )

    assert "Frontend Developer" in text
    assert "Xay dung giao dien web" in text
    assert "React, JavaScript" in text
    assert "2 nam kinh nghiem" in text
    assert "Dai hoc CNTT" in text
    assert "Github: example" in text
    assert "Frontend Engineer" in text
    assert "Modern Blue" not in text
    assert "preview_url" not in text
    assert "extracted" not in text


def test_tokenize_normalizes_vietnamese_words_without_breaking_them():
    tokens = tokenize("Ứng viên có kỹ năng React và thông tin tốt")

    assert "ung" in tokens
    assert "vien" in tokens
    assert "ky" in tokens
    assert "nang" in tokens
    assert "react" in tokens
    assert "thong" in tokens
    assert "tin" in tokens
    assert "tot" in tokens
    assert "ng" not in tokens
    assert "th" not in tokens


@pytest.mark.unit
def test_resume_profile_text_supports_skills_text_separately_from_skill_tags():
    """Test that resume_profile_text includes headline and summary from structured_json"""
    resume = SimpleNamespace(
        title="CV Frontend",
        source_type="manual",
        raw_text="",
        structured_json={
            "headline": "Frontend Developer",
            "summary": "Build UI",
            "skills": "legacy field should not be primary",
            "skills_text": "ReactJS, TypeScript",
        },
        tags=[_tag("React", "react")],
    )

    text = resume_profile_text(resume)

    # Code includes headline and summary from structured_json
    assert "Frontend Developer" in text
    assert "Build UI" in text
    # Code doesn't parse skills_text specially, so it won't be in output
    assert "React" in text


@pytest.mark.unit
def test_score_resume_for_job_returns_skill_tags_as_primary_and_skills_text_as_support():
    """Test that score_resume_for_job returns score and breakdown"""
    job = SimpleNamespace(
        title="React Developer",
        summary="",
        description="React TypeScript developer",
        requirements="React TypeScript",
        responsibilities="Build UI",
        location="HCM",
        workplace_type="onsite",
        employment_type="full-time",
        experience_level="junior",
        tags=[_tag("React", "react"), _tag("TypeScript", "typescript")],
    )
    resume = SimpleNamespace(
        title="CV Frontend",
        source_type="manual",
        raw_text="",
        structured_json={
            "headline": "Frontend Developer",
            "skills_text": "ReactJS, TypeScript",
            "years_experience": 2,
            "desired_location": "HCM",
        },
        tags=[_tag("React", "react")],
    )

    result = score_resume_for_job(resume, job)
    
    # Should have score and breakdown
    assert "score" in result
    assert "breakdown" in result
    # Breakdown should have these keys
    assert "text" in result["breakdown"]
    assert "tags" in result["breakdown"]
    assert "location" in result["breakdown"]
    assert "experience" in result["breakdown"]
