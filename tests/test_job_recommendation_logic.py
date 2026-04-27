from types import SimpleNamespace

import pytest

from backend.api.resume_routes import _manual_resume_raw_text
from backend.core.services.matching_service import (
    _experience_floor,
    _location_match_score,
    _normalize_final_score,
    _required_skill_penalty,
    _semantic_gate_factor,
    _tag_score,
    resume_profile_text,
    score_resume_for_job,
    tokenize,
)


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


@pytest.mark.unit
def test_experience_floor_prioritizes_senior_when_level_contains_mid_and_senior():
    assert _experience_floor("mid-senior") == 5


@pytest.mark.unit
def test_experience_floor_handles_lead_as_stricter_than_senior():
    assert _experience_floor("lead") == 6


@pytest.mark.unit
def test_location_match_score_is_partial_for_non_exact_containment():
    score = _location_match_score("TP. Ho Chi Minh", "HCM remote", "onsite")
    assert score < 1.0
    assert score > 0.0


@pytest.mark.unit
def test_semantic_gate_factor_keeps_semantic_signal_strong():
    factor = _semantic_gate_factor(0.9, 0.8)

    assert factor == pytest.approx(0.93)


@pytest.mark.unit
def test_semantic_gate_factor_penalizes_weak_lexical_evidence():
    factor = _semantic_gate_factor(0.2, 0.4)

    assert factor == pytest.approx(0.64)


@pytest.mark.unit
def test_tag_score_reaches_full_at_threshold_of_four_matches():
    assert _tag_score(4) == 1.0
    assert _tag_score(6) == 1.0
    assert _tag_score(2) == pytest.approx(0.5)


@pytest.mark.unit
def test_required_skill_penalty_applies_for_missing_required_tags(monkeypatch):
    monkeypatch.setenv("REQUIRED_TAG_COUNT", "3")
    monkeypatch.setenv("REQUIRED_TAG_PENALTY_WEIGHT", "0.25")

    job = SimpleNamespace(
        title="Backend Engineer",
        summary="",
        description="Node.js SQL Payment",
        requirements="Node.js SQL Payment",
        responsibilities="",
        tags=[_tag("Node.js", "nodejs"), _tag("SQL", "sql"), _tag("Payment", "payment")],
    )
    resume = SimpleNamespace(
        title="CV Backend",
        raw_text="Node.js",
        structured_json={"summary": "Node.js backend"},
        tags=[_tag("Node.js", "nodejs")],
    )

    result = _required_skill_penalty(resume, job)
    assert result["required_count"] == 3
    assert result["matched_required"] == 1
    assert result["missing_required"] == 2
    assert result["missing_ratio"] == pytest.approx(2 / 3, rel=1e-6)
    assert result["penalty_multiplier"] == pytest.approx(1 - ((2 / 3) * 0.25), rel=1e-6)


@pytest.mark.unit
def test_required_skill_penalty_zero_when_all_required_skills_matched(monkeypatch):
    monkeypatch.setenv("REQUIRED_TAG_COUNT", "3")
    monkeypatch.setenv("REQUIRED_TAG_PENALTY_WEIGHT", "0.25")

    job = SimpleNamespace(
        title="Backend Engineer",
        summary="",
        description="Node.js SQL Payment",
        requirements="Node.js SQL Payment",
        responsibilities="",
        tags=[_tag("Node.js", "nodejs"), _tag("SQL", "sql"), _tag("Payment", "payment")],
    )
    resume = SimpleNamespace(
        title="CV Backend",
        raw_text="Node.js SQL Payment",
        structured_json={"summary": "Node.js SQL Payment"},
        tags=[_tag("Node.js", "nodejs"), _tag("SQL", "sql"), _tag("Payment", "payment")],
    )

    result = _required_skill_penalty(resume, job)
    assert result["missing_required"] == 0
    assert result["missing_ratio"] == pytest.approx(0.0)
    assert result["penalty_multiplier"] == pytest.approx(1.0)
    assert result["penalty_points"] == 0.0


@pytest.mark.unit
def test_normalize_final_score_keeps_raw_values():
    raw_score = 72.4
    raw_breakdown = {
        "semantic": 16.1,
        "tags": 16.7,
        "text": 9.6,
        "experience": 15.0,
        "location": 15.0,
    }

    score, breakdown, meta = _normalize_final_score(raw_score, raw_breakdown)

    assert score == 72.4
    assert breakdown == raw_breakdown
    assert meta["scale"] == pytest.approx(1.0, rel=1e-6)
