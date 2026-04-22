import re
import os
import copy
from collections import Counter

try:
    from sentence_transformers import SentenceTransformer
except Exception:  # pragma: no cover - optional dependency
    SentenceTransformer = None

from ...models import JobPosting, MatchScore, Resume, Tag

STOPWORDS = {
    "and", "or", "the", "of", "to", "in", "with", "a", "an", "for", "on", "at",
    "và", "cho", "của", "với", "là", "from", "by", "job", "work",
}

_EMBEDDING_MODEL = None
_SCREENING_CACHE: dict[tuple, dict] = {}
_EMBEDDING_VECTOR_CACHE: dict[tuple, object] = {}


def _cache_limit(env_name: str, default_value: int) -> int:
    raw = os.getenv(env_name, str(default_value))
    try:
        limit = int(raw)
    except (TypeError, ValueError):
        return default_value
    return max(100, limit)


def _cache_put(cache: dict, key: tuple, value, limit: int):
    if key in cache:
        cache.pop(key, None)
    cache[key] = value
    while len(cache) > limit:
        cache.pop(next(iter(cache)))


def _get_embedding_model():
    global _EMBEDDING_MODEL
    if _EMBEDDING_MODEL is not None:
        return _EMBEDDING_MODEL
    if SentenceTransformer is None:
        return None
    model_name = (os.getenv("EMBEDDING_MODEL_NAME") or "paraphrase-multilingual-MiniLM-L12-v2").strip()
    try:
        _EMBEDDING_MODEL = SentenceTransformer(model_name)
    except Exception:
        _EMBEDDING_MODEL = None
    return _EMBEDDING_MODEL


def warmup_embedding_model() -> dict:
    model = _get_embedding_model()
    model_name = (os.getenv("EMBEDDING_MODEL_NAME") or "paraphrase-multilingual-MiniLM-L12-v2").strip()
    if not model:
        return {
            "ready": False,
            "provider": "heuristic",
            "model": model_name,
            "reason": "SentenceTransformer unavailable or model load failed",
        }

    try:
        model.encode(["warmup screening"], normalize_embeddings=True)
    except Exception:
        return {
            "ready": False,
            "provider": "sentence-transformers",
            "model": model_name,
            "reason": "Model loaded but warmup encode failed",
        }

    return {
        "ready": True,
        "provider": "sentence-transformers",
        "model": model_name,
        "reason": "Model warmed up",
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


def screen_resume_for_job_with_ai(resume: Resume, job: JobPosting) -> dict:
    """Hybrid screening: rule-based score + SentenceTransformer semantic similarity."""
    cache_key = _screening_cache_key(resume, job)
    cached = _SCREENING_CACHE.get(cache_key)
    if cached is not None:
        result = copy.deepcopy(cached)
        result.setdefault("engine", {})["cached"] = True
        return result

    base = score_resume_for_job(resume, job)

    embedding_score = _embedding_similarity_score(resume, job)
    has_embedding = embedding_score is not None
    if has_embedding:
        embedding_weight = _clamp_number(os.getenv("EMBEDDING_SCORE_WEIGHT", "0.35"), 0.1, 0.7, 0.35)
        blended_score = round((base["score"] * (1 - embedding_weight)) + (embedding_score * embedding_weight), 1)
    else:
        blended_score = base["score"]

    hybrid_breakdown = dict(base["breakdown"])
    hybrid_breakdown["semantic"] = round(embedding_score if has_embedding else 0, 1)

    fallback = {
        "score": blended_score,
        "breakdown": hybrid_breakdown,
        "insights": _build_hybrid_insights(resume, job, base, embedding_score),
        "engine": {
            "provider": "sentence-transformers" if has_embedding else "heuristic",
            "model": (os.getenv("EMBEDDING_MODEL_NAME") or "paraphrase-multilingual-MiniLM-L12-v2") if has_embedding else "rule-based-v1",
            "used_ai": bool(has_embedding),
            "used_embedding": bool(has_embedding),
            "cached": False,
        },
    }

    _cache_put(
        _SCREENING_CACHE,
        cache_key,
        copy.deepcopy(fallback),
        _cache_limit("SCREENING_CACHE_SIZE", 2000),
    )
    return fallback


def _build_hybrid_insights(resume: Resume, job: JobPosting, base: dict, embedding_score: float | None) -> dict:
    resume_tag_slugs = {tag.slug for tag in (resume.tags or []) if tag.slug}
    job_tag_slugs = {tag.slug for tag in (job.tags or []) if tag.slug}
    overlap = sorted(resume_tag_slugs & job_tag_slugs)

    strengths = []
    concerns = []
    recommendation = "Can xem xet them truoc khi moi phong van."

    score = float(base.get("score", 0) or 0)
    if overlap:
        strengths.append(f"Trung khop {len(overlap)} ky nang/tag voi job.")
    if score >= 85:
        strengths.append("Muc do phu hop tong the cao so voi mo ta cong viec.")
        recommendation = "Nen uu tien moi phong van vong dau."
    elif score >= 70:
        strengths.append("Ho so co nhieu diem phu hop voi nhu cau tuyen dung.")
        recommendation = "Nen dua vao danh sach can nhac phong van."
    else:
        concerns.append("Muc do phu hop tong the chua cao theo bo tieu chi hien tai.")

    desired_location = ((resume.structured_json or {}).get("desired_location") or "").strip().lower()
    job_location = (job.location or "").strip().lower()
    if job_location and desired_location and job_location not in desired_location:
        concerns.append("Dia diem mong muon cua ung vien co the chua phu hop voi job.")

    years = (resume.structured_json or {}).get("years_experience", 0) or 0
    if years < _experience_floor(job.experience_level):
        concerns.append("So nam kinh nghiem co the thap hon muc yeu cau.")
    else:
        strengths.append("Kinh nghiem lam viec dat nguong yeu cau co ban.")

    if not strengths:
        strengths.append("Ho so da co du lieu co ban de tiep tuc danh gia.")
    if not concerns:
        concerns.append("Chua phat hien rui ro lon tu du lieu CV hien tai.")

    if embedding_score is None:
        concerns.append("Chua co semantic embedding do thieu package/model.")
    elif embedding_score >= 82:
        strengths.append("Noi dung CV co do tuong dong ngu nghia cao voi mo ta job.")
    elif embedding_score >= 65:
        strengths.append("Noi dung CV co tuong dong ngu nghia muc trung binh-kha.")
    else:
        concerns.append("Do tuong dong ngu nghia thap, can doc ky kinh nghiem lien quan.")

    return {
        "strengths": strengths[:3],
        "concerns": concerns[:3],
        "recommendation": recommendation,
    }


def _embedding_similarity_score(resume: Resume, job: JobPosting) -> float | None:
    model = _get_embedding_model()
    if not model:
        return None
    resume_text = resume_profile_text(resume)
    job_text = job_profile_text(job)
    if not resume_text.strip() or not job_text.strip():
        return None

    model_name = (os.getenv("EMBEDDING_MODEL_NAME") or "paraphrase-multilingual-MiniLM-L12-v2").strip()
    resume_key = (
        "resume",
        resume.id,
        getattr(resume, "updated_at", None).isoformat() if getattr(resume, "updated_at", None) else "",
        model_name,
    )
    job_key = (
        "job",
        job.id,
        getattr(job, "updated_at", None).isoformat() if getattr(job, "updated_at", None) else "",
        model_name,
    )
    vector_cache_limit = _cache_limit("EMBEDDING_VECTOR_CACHE_SIZE", 4000)

    try:
        resume_vector = _EMBEDDING_VECTOR_CACHE.get(resume_key)
        if resume_vector is None:
            resume_vector = model.encode([resume_text], normalize_embeddings=True)[0]
            _cache_put(_EMBEDDING_VECTOR_CACHE, resume_key, resume_vector, vector_cache_limit)

        job_vector = _EMBEDDING_VECTOR_CACHE.get(job_key)
        if job_vector is None:
            job_vector = model.encode([job_text], normalize_embeddings=True)[0]
            _cache_put(_EMBEDDING_VECTOR_CACHE, job_key, job_vector, vector_cache_limit)

        similarity = float((resume_vector * job_vector).sum())
    except Exception:
        return None
    # Cosine similarity in [-1, 1] mapped to [0, 100].
    return round(max(0.0, min(100.0, ((similarity + 1) / 2) * 100)), 1)


def _screening_cache_key(resume: Resume, job: JobPosting) -> tuple:
    model_name = (os.getenv("EMBEDDING_MODEL_NAME") or "paraphrase-multilingual-MiniLM-L12-v2").strip()
    score_weight = _clamp_number(os.getenv("EMBEDDING_SCORE_WEIGHT", "0.35"), 0.1, 0.7, 0.35)
    resume_stamp = getattr(resume, "updated_at", None)
    job_stamp = getattr(job, "updated_at", None)
    return (
        int(getattr(resume, "id", 0) or 0),
        resume_stamp.isoformat() if resume_stamp else "",
        int(getattr(job, "id", 0) or 0),
        job_stamp.isoformat() if job_stamp else "",
        model_name,
        round(score_weight, 3),
    )


def _clamp_number(value, minimum: float, maximum: float, fallback: float) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return fallback
    return max(minimum, min(maximum, number))


def _normalize_breakdown(ai_breakdown, fallback_breakdown: dict) -> dict:
    if not isinstance(ai_breakdown, dict):
        return fallback_breakdown
    keys = ["text", "tags", "location", "experience", "semantic"]
    normalized = {}
    for key in keys:
        fallback_value = float(fallback_breakdown.get(key, 0) or 0)
        normalized[key] = round(_clamp_number(ai_breakdown.get(key), 0.0, 100.0, fallback_value), 1)
    return normalized


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
