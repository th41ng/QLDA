import re
import unicodedata
from collections import Counter

from ...models import JobPosting, MatchScore, Resume, Tag

RESUME_TEXT_FIELDS = (
    "headline",
    "summary",
    "experience",
    "education",
    "additional_info",
    "current_title",
)

STOPWORDS = {
    "and", "or", "the", "of", "to", "in", "with", "a", "an", "for", "on", "at",
    "va", "cho", "cua", "voi", "la", "from", "by", "job", "work",
}


def _normalize_text(text: str) -> str:
    value = str(text or "").lower()
    value = value.replace("đ", "d").replace("Đ", "d")
    value = value.replace("Ä‘", "d").replace("Ä", "d")
    value = unicodedata.normalize("NFD", value)
    value = "".join(char for char in value if unicodedata.category(char) != "Mn")
    return unicodedata.normalize("NFC", value)


def tokenize(text: str) -> list[str]:
    words = re.findall(r"[a-z0-9+#.]+", _normalize_text(text))
    return [w for w in words if w not in STOPWORDS and len(w) > 1]


def tag_text(tag: Tag) -> str:
    category_name = tag.category.name if getattr(tag, "category", None) else ""
    return " ".join(filter(None, [tag.name, category_name, tag.description]))


def _resume_text_fields(structured: dict | None) -> list[str]:
    structured = structured or {}
    values = []
    for field in RESUME_TEXT_FIELDS:
        value = structured.get(field)
        if value is None:
            continue
        if isinstance(value, list):
            values.append(" ".join(str(item) for item in value if item))
            continue
        if isinstance(value, (dict, tuple, set)):
            continue
        text = str(value).strip()
        if text:
            values.append(text)
    return values


def _skills_text(structured: dict | None) -> str:
    structured = structured or {}
    value = structured.get("skills_text")
    if value in (None, ""):
        value = structured.get("skills")
    if isinstance(value, list):
        return " ".join(str(item) for item in value if item)
    if isinstance(value, (dict, tuple, set)):
        return ""
    return str(value or "").strip()


def job_profile_text(job: JobPosting) -> str:
    tag_blob = " ".join(tag_text(tag) for tag in job.tags)
    return " ".join(
        filter(
            None,
            [
                job.title,
                job.summary,
                job.description,
                job.requirements,
                job.responsibilities,
                job.location,
                job.workplace_type,
                job.employment_type,
                job.experience_level,
                tag_blob,
            ],
        )
    )


def resume_profile_text(resume: Resume) -> str:
    tag_blob = " ".join(tag_text(tag) for tag in resume.tags)
    structured = resume.structured_json or {}
    content_fields = _resume_text_fields(structured)
    skills_text = _skills_text(structured)
    raw_text = ""
    if (resume.source_type or "").lower() == "upload":
        raw_text = (resume.raw_text or "").strip()
    return " ".join(
        filter(
            None,
            [
                resume.title,
                raw_text,
                *content_fields,
                skills_text,
                tag_blob,
            ],
        )
    )


def _get_desired_location(resume: Resume) -> str:
    desired = (resume.structured_json or {}).get("desired_location") or ""
    if not desired:
        profile = getattr(getattr(resume, "user", None), "candidate_profile", None)
        if profile:
            desired = profile.desired_location or ""
    return desired.strip() if isinstance(desired, str) else ""


def _get_years_experience(resume: Resume) -> int:
    years = (resume.structured_json or {}).get("years_experience")
    if years is None:
        profile = getattr(getattr(resume, "user", None), "candidate_profile", None)
        if profile and profile.years_experience:
            return int(profile.years_experience)
        return 0
    try:
        return int(years or 0)
    except (TypeError, ValueError):
        return 0


def _location_score(resume: Resume, job: JobPosting) -> float:
    if (job.workplace_type or "").lower() == "remote":
        return 1.0
    job_loc = (job.location or "").strip().lower()
    desired = _get_desired_location(resume).lower()
    if not job_loc or not desired:
        return 0.0
    if job_loc in desired or desired in job_loc:
        return 1.0
    job_words = set(tokenize(job_loc))
    desired_words = set(tokenize(desired))
    if job_words and desired_words and (job_words & desired_words):
        return 1.0
    return 0.0


def score_resume_for_job(resume: Resume, job: JobPosting) -> dict:
    resume_tokens = Counter(tokenize(resume_profile_text(resume)))
    job_tokens = Counter(tokenize(job_profile_text(job)))
    if not resume_tokens or not job_tokens:
        return {"score": 0, "breakdown": {"tags": 0, "text": 0, "location": 0, "experience": 0, "detail": {}}}

    shared = set(resume_tokens) & set(job_tokens)
    text_score = sum(min(resume_tokens[t], job_tokens[t]) for t in shared) / max(sum(job_tokens.values()), 1)

    job_slug_set = {tag.slug for tag in job.tags}
    matched_tag_names = [tag.name for tag in resume.tags if tag.slug in job_slug_set]
    tag_score = len(matched_tag_names) / max(len(job.tags), 1)
    matched_tag_tokens = set(tokenize(" ".join(matched_tag_names)))
    skill_tokens = set(tokenize(_skills_text(resume.structured_json or {})))
    matched_skill_terms = sorted((skill_tokens & set(job_tokens)) - matched_tag_tokens)[:8]

    loc_score = _location_score(resume, job)
    resume_years = _get_years_experience(resume)
    required_years = _experience_floor(job.experience_level)
    experience_score = 1 if resume_years >= required_years else 0

    matched_keywords = sorted(shared, key=lambda t: min(resume_tokens[t], job_tokens[t]), reverse=True)[:8]

    score = round(min(100, (text_score * 35) + (tag_score * 45) + (loc_score * 10) + (experience_score * 10)), 1)
    breakdown = {
        "text": round(text_score * 35, 1),
        "tags": round(tag_score * 45, 1),
        "location": round(loc_score * 10, 1),
        "experience": round(experience_score * 10, 1),
        "detail": {
            "matched_keywords": matched_keywords,
            "matched_tags": matched_tag_names,
            "matched_skill_terms": matched_skill_terms,
            "skills_text": _skills_text(resume.structured_json or {}),
            "resume_years": resume_years,
            "required_years": required_years,
            "desired_location": _get_desired_location(resume),
            "job_location": job.location or "",
            "is_remote": (job.workplace_type or "").lower() == "remote",
        },
    }
    return {"score": score, "breakdown": breakdown}


def _experience_floor(experience_level: str) -> int:
    level = (experience_level or "").lower()
    if "senior" in level:
        return 5
    if "middle" in level or "mid" in level:
        return 3
    if "junior" in level or "fresher" in level:
        return 0
    return 1


def recommend_jobs_for_resume(resume: Resume, limit: int = 5):
    jobs = JobPosting.query.filter(JobPosting.status == "published").all()
    ranked = []
    for job in jobs:
        result = score_resume_for_job(resume, job)
        ranked.append((result["score"], job, result["breakdown"]))
    ranked.sort(key=lambda item: item[0], reverse=True)
    return ranked[:limit]


def store_match_score(resume: Resume, job: JobPosting, candidate_user_id: int) -> MatchScore:
    result = score_resume_for_job(resume, job)
    record = MatchScore(
        job_id=job.id,
        resume_id=resume.id,
        candidate_user_id=candidate_user_id,
        score=result["score"],
        breakdown_json=result["breakdown"],
    )
    return record
