import re
from collections import Counter

from ...models import JobPosting, MatchScore, Resume, Tag

STOPWORDS = {
    "and", "or", "the", "of", "to", "in", "with", "a", "an", "for", "on", "at",
    "và", "cho", "của", "với", "là", "from", "by", "job", "work",
}


def tokenize(text: str) -> list[str]:
    words = re.findall(r"[a-z0-9+#.]+", (text or "").lower())
    return [w for w in words if w not in STOPWORDS and len(w) > 1]


def tag_text(tag: Tag) -> str:
    category_name = tag.category.name if getattr(tag, "category", None) else ""
    return " ".join(filter(None, [tag.name, category_name, tag.description]))


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
    extra = " ".join(str(value) for value in structured.values())
    return " ".join(
        filter(
            None,
            [
                resume.title,
                resume.raw_text,
                extra,
                tag_blob,
            ],
        )
    )


def score_resume_for_job(resume: Resume, job: JobPosting) -> dict:
    resume_tokens = Counter(tokenize(resume_profile_text(resume)))
    job_tokens = Counter(tokenize(job_profile_text(job)))
    if not resume_tokens or not job_tokens:
        return {"score": 0, "breakdown": {"tags": 0, "text": 0, "location": 0, "experience": 0}}

    shared = set(resume_tokens) & set(job_tokens)
    text_score = sum(min(resume_tokens[t], job_tokens[t]) for t in shared) / max(sum(job_tokens.values()), 1)
    tag_match = len({tag.slug for tag in resume.tags} & {tag.slug for tag in job.tags})
    tag_score = tag_match / max(len(job.tags), 1)
    location_score = 1 if (job.location or "").lower() in (resume.structured_json or {}).get("desired_location", "").lower() else 0
    experience_score = 1 if (resume.structured_json or {}).get("years_experience", 0) >= _experience_floor(job.experience_level) else 0

    score = round(min(100, (text_score * 45) + (tag_score * 35) + (location_score * 10) + (experience_score * 10)), 1)
    breakdown = {
        "text": round(text_score * 45, 1),
        "tags": round(tag_score * 35, 1),
        "location": round(location_score * 10, 1),
        "experience": round(experience_score * 10, 1),
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
