import re
import os
import copy
import unicodedata
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

TERM_ALIASES = {
    "backend": {"backend", "back end", "server side", "api"},
    "frontend": {"frontend", "front end", "ui", "ux", "react", "vue", "angular"},
    "nodejs": {"nodejs", "node js", "node", "express", "nestjs"},
    "sql": {"sql", "mysql", "postgres", "postgresql", "mssql", "database", "db"},
    "ecommerce": {"ecommerce", "e commerce", "thuong mai dien tu", "commerce"},
    "api": {"api", "rest", "rest api", "graphql"},
    "payment": {"payment", "thanh toan", "paypal", "stripe", "momo", "vnpay"},
    "order": {"order", "don hang", "checkout", "cart"},
    "middle": {"middle", "mid", "mid-level", "2 nam", "3 nam"},
    "junior": {"junior", "fresher", "intern", "entry"},
    "senior": {"senior", "lead", "5 nam", "6 nam"},
}

_EMBEDDING_MODEL = None
_SCREENING_CACHE: dict[tuple, dict] = {}
_EMBEDDING_VECTOR_CACHE: dict[tuple, object] = {}
_DEFAULT_EMBEDDING_MODEL = "intfloat/multilingual-e5-base"


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
    model_name = (os.getenv("EMBEDDING_MODEL_NAME") or _DEFAULT_EMBEDDING_MODEL).strip()
    try:
        _EMBEDDING_MODEL = SentenceTransformer(model_name)
    except Exception:
        _EMBEDDING_MODEL = None
    return _EMBEDDING_MODEL


def warmup_embedding_model() -> dict:
    model = _get_embedding_model()
    model_name = (os.getenv("EMBEDDING_MODEL_NAME") or _DEFAULT_EMBEDDING_MODEL).strip()
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
    normalized = _normalize_text_for_matching(text)
    words = re.findall(r"[a-z0-9_+#.]+", normalized)
    return [w for w in words if w not in STOPWORDS and len(w) > 1]


def _normalize_text_for_matching(text: str) -> str:
    normalized = str(text or "").lower()

    normalized = unicodedata.normalize("NFKD", normalized)
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))

    replacements = {
        "rest api": "rest_api",
        "node js": "nodejs",
        "e-commerce": "ecommerce",
        "e commerce": "ecommerce",
        "ho chi minh": "hcm",
        "tp hcm": "hcm",
        "tp. hcm": "hcm",
        "tp ho chi minh": "hcm",
        "tp. ho chi minh": "hcm",
        "thanh pho ho chi minh": "hcm",
    }

    for old, new in replacements.items():
        normalized = normalized.replace(old, new)

    normalized = re.sub(r"[^a-z0-9_+#\s]", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()

    return normalized


def _normalize_location(value: str) -> str:
    text = str(value or "").strip().lower()
    if not text:
        return ""

    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.replace("thanh pho", "tp")
    text = text.replace("ho-chi-minh", "ho chi minh")
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()

    compact = text.replace(" ", "")
    if compact in {"tphochiminh", "tphcm", "hochiminh", "hcm"}:
        return "hcm"

    return text


def _location_match_score(job_location: str, resume_location: str, workplace_type: str = "") -> float:
    """Return graded location match score in [0, 1].

    Exact/canonical city matches get full score.
    Broader partial matches get partial credit to avoid over-scoring location.
    """
    normalized_job_location = _normalize_location(job_location)
    normalized_resume_location = _normalize_location(resume_location)
    normalized_workplace = _normalize_text_for_matching(workplace_type or "")

    if normalized_workplace == "remote":
        if not normalized_resume_location:
            return 0.7
        return 1.0

    if not normalized_job_location or not normalized_resume_location:
        return 0.0

    if normalized_job_location == normalized_resume_location:
        return 1.0

    if normalized_job_location in normalized_resume_location or normalized_resume_location in normalized_job_location:
        return 0.7

    job_tokens = {token for token in normalized_job_location.split() if token}
    resume_tokens = {token for token in normalized_resume_location.split() if token}
    if not job_tokens or not resume_tokens:
        return 0.0

    overlap = len(job_tokens & resume_tokens)
    if overlap <= 0:
        return 0.0

    # Keep non-exact token overlap below full points.
    return round(min(0.6, max(0.4, overlap / max(len(job_tokens), 1))), 3)


def _rule_weights() -> tuple[float, float, float, float]:
    text_weight = _clamp_number(os.getenv("RULE_TEXT_WEIGHT", "0.40"), 0.0, 1.0, 0.40)
    tag_weight = _clamp_number(os.getenv("RULE_TAG_WEIGHT", "0.30"), 0.0, 1.0, 0.30)
    location_weight = _clamp_number(os.getenv("RULE_LOCATION_WEIGHT", "0.15"), 0.0, 1.0, 0.15)
    experience_weight = _clamp_number(os.getenv("RULE_EXPERIENCE_WEIGHT", "0.15"), 0.0, 1.0, 0.15)

    total = text_weight + tag_weight + location_weight + experience_weight
    if total <= 0:
        return 0.40, 0.30, 0.15, 0.15
    return (
        text_weight / total,
        tag_weight / total,
        location_weight / total,
        experience_weight / total,
    )


def _final_weights() -> tuple[float, float, float, float, float]:
    semantic_weight = _clamp_number(os.getenv("FINAL_SEMANTIC_WEIGHT", "0.45"), 0.0, 1.0, 0.45)
    tag_weight = _clamp_number(os.getenv("FINAL_TAG_WEIGHT", "0.20"), 0.0, 1.0, 0.20)
    text_weight = _clamp_number(os.getenv("FINAL_TEXT_WEIGHT", "0.15"), 0.0, 1.0, 0.15)
    experience_weight = _clamp_number(os.getenv("FINAL_EXPERIENCE_WEIGHT", "0.10"), 0.0, 1.0, 0.10)
    location_weight = _clamp_number(os.getenv("FINAL_LOCATION_WEIGHT", "0.10"), 0.0, 1.0, 0.10)

    total = semantic_weight + tag_weight + text_weight + experience_weight + location_weight
    if total <= 0:
        return 0.45, 0.20, 0.15, 0.10, 0.10
    return (
        semantic_weight / total,
        tag_weight / total,
        text_weight / total,
        experience_weight / total,
        location_weight / total,
    )


def _semantic_gate_factor(tag_factor: float, text_factor: float) -> float:
    """Gate semantic similarity by concrete skill/text evidence.

    Strong CVs keep most semantic signal.
    Weak lexical evidence applies a meaningful penalty.
    """
    tag = _clamp_number(tag_factor, 0.0, 1.0, 0.0)
    text = _clamp_number(text_factor, 0.0, 1.0, 0.0)
    gate = 0.5 + (0.3 * tag) + (0.2 * text)
    return _clamp_number(gate, 0.0, 1.0, 0.0)


def _normalize_final_score(raw_score: float, raw_breakdown: dict) -> tuple[float, dict, dict]:
    normalize_max = _clamp_number(os.getenv("NORMALIZED_SCORE_MAX", "100"), 1.0, 500.0, 100.0)
    scale = 1.0

    normalized_score = round(raw_score, 1)
    normalized_breakdown = {
        key: round(float(value or 0), 1)
        for key, value in (raw_breakdown or {}).items()
    }
    return normalized_score, normalized_breakdown, {
        "raw_score": round(raw_score, 1),
        "normalize_max": round(normalize_max, 3),
        "scale": round(scale, 6),
    }


def tag_text(tag: Tag) -> str:
    category_name = tag.category.name if getattr(tag, "category", None) else ""
    return " ".join(filter(None, [tag.name, category_name, tag.description]))


def _tag_keys(tag: Tag) -> set[str]:
    keys = set()
    if getattr(tag, "id", None):
        keys.add(f"id:{tag.id}")
    slug = str(getattr(tag, "slug", "") or "").strip().lower()
    if slug:
        keys.add(f"slug:{slug}")
    name = str(getattr(tag, "name", "") or "").strip().lower()
    if name:
        keys.add(f"name:{name}")
    return keys


def _match_job_tags_in_resume_text(resume: Resume, job: JobPosting) -> int:
    """Best-effort tag matching from CV content when explicit resume.tags is missing/incomplete."""
    source_text_raw = " ".join(
        filter(
            None,
            [
                resume.title,
                resume.raw_text,
                str((resume.structured_json or {}).get("skills") or ""),
                str((resume.structured_json or {}).get("headline") or ""),
                str((resume.structured_json or {}).get("summary") or ""),
                str((resume.structured_json or {}).get("experience") or ""),
            ],
        )
    )
    source_text = _normalize_text_for_matching(source_text_raw)
    source_tokens = set(tokenize(source_text))

    hits = 0
    for tag in (job.tags or []):
        candidates = _tag_candidates(tag)
        if any((candidate in source_tokens) or (candidate in source_text) for candidate in candidates):
            hits += 1
    return hits


def _tag_candidates(tag: Tag) -> set[str]:
    candidates = set()
    slug = _normalize_text_for_matching(getattr(tag, "slug", "") or "")
    name = _normalize_text_for_matching(getattr(tag, "name", "") or "")
    if slug:
        candidates.add(slug)
    if name:
        candidates.add(name)
    for value in list(candidates):
        if value in TERM_ALIASES:
            candidates.update({_normalize_text_for_matching(alias) for alias in TERM_ALIASES[value]})
    return {item for item in candidates if item}


def _tag_score(tag_match: int) -> float:
    full_match_count = _clamp_number(os.getenv("TAG_FULL_MATCH_COUNT", "4"), 1.0, 20.0, 4.0)
    ratio = max(0.0, float(tag_match or 0) / full_match_count)
    return min(1.0, ratio)


def _required_skill_penalty(resume: Resume, job: JobPosting) -> dict:
    required_count_limit = int(_clamp_number(os.getenv("REQUIRED_TAG_COUNT", "3"), 0.0, 20.0, 3.0))
    penalty_weight = _clamp_number(os.getenv("REQUIRED_TAG_PENALTY_WEIGHT", "0.25"), 0.0, 1.0, 0.25)
    if required_count_limit <= 0 or penalty_weight <= 0 or not (job.tags or []):
        return {
            "required_count": 0,
            "matched_required": 0,
            "missing_required": 0,
            "missing_ratio": 0.0,
            "penalty_weight": round(penalty_weight, 3),
            "penalty_multiplier": 1.0,
            "penalty_points": 0.0,
            "required_tags": [],
            "missing_tags": [],
        }

    title_req_text = _normalize_text_for_matching(" ".join(filter(None, [job.title, job.requirements])))
    all_job_text = _normalize_text_for_matching(
        " ".join(filter(None, [job.title, job.summary, job.description, job.requirements, job.responsibilities]))
    )

    ranked_tags = []
    for tag in (job.tags or []):
        candidates = _tag_candidates(tag)
        priority = 0
        for candidate in candidates:
            priority += title_req_text.count(candidate) * 2
            priority += all_job_text.count(candidate)
        ranked_tags.append(
            (
                priority,
                str(getattr(tag, "name", "") or "").lower(),
                tag,
            )
        )

    ranked_tags.sort(key=lambda item: (-item[0], item[1]))
    required_tags = [item[2] for item in ranked_tags[:required_count_limit]]

    resume_slug_set = {
        _normalize_text_for_matching(getattr(tag, "slug", "") or "")
        for tag in (resume.tags or [])
        if getattr(tag, "slug", None)
    }
    resume_name_set = {
        _normalize_text_for_matching(getattr(tag, "name", "") or "")
        for tag in (resume.tags or [])
        if getattr(tag, "name", None)
    }
    resume_text = _normalize_text_for_matching(resume_profile_text(resume))
    resume_tokens = set(tokenize(resume_text))

    matched_required = 0
    missing_tags = []
    required_names = []
    for tag in required_tags:
        required_names.append(getattr(tag, "name", "") or getattr(tag, "slug", "") or "")
        candidates = _tag_candidates(tag)
        matched = bool(
            (candidates & resume_slug_set)
            or (candidates & resume_name_set)
            or any((candidate in resume_tokens) or (candidate in resume_text) for candidate in candidates)
        )
        if matched:
            matched_required += 1
        else:
            missing_tags.append(getattr(tag, "name", "") or getattr(tag, "slug", "") or "")

    required_count = len(required_tags)
    missing_required = max(0, required_count - matched_required)
    missing_ratio = (missing_required / required_count) if required_count > 0 else 0.0
    penalty_multiplier = max(0.0, 1.0 - (missing_ratio * penalty_weight))

    return {
        "required_count": required_count,
        "matched_required": matched_required,
        "missing_required": missing_required,
        "missing_ratio": round(missing_ratio, 6),
        "penalty_weight": round(penalty_weight, 3),
        "penalty_multiplier": round(penalty_multiplier, 6),
        "penalty_points": 0.0,
        "required_tags": required_names,
        "missing_tags": missing_tags,
    }


def _explicit_tag_match_count(resume: Resume, job: JobPosting) -> int:
    resume_slug_set = {
        _normalize_text_for_matching(getattr(tag, "slug", "") or "")
        for tag in (resume.tags or [])
        if getattr(tag, "slug", None)
    }
    resume_name_set = {
        _normalize_text_for_matching(getattr(tag, "name", "") or "")
        for tag in (resume.tags or [])
        if getattr(tag, "name", None)
    }
    hits = 0
    for job_tag in (job.tags or []):
        candidates = _tag_candidates(job_tag)
        if candidates & resume_slug_set or candidates & resume_name_set:
            hits += 1
    return hits


def _job_keyword_bonus(resume: Resume, job: JobPosting) -> float:
    resume_text = _normalize_text_for_matching(resume_profile_text(resume))
    resume_tokens = set(tokenize(resume_text))
    if not resume_tokens:
        return 0.0

    job_keywords = set()
    for tag in (job.tags or []):
        job_keywords.update(_tag_candidates(tag))

    headline_title = _normalize_text_for_matching(" ".join(filter(None, [job.title, job.summary])))
    for token in tokenize(headline_title):
        if len(token) > 2 and token not in STOPWORDS:
            job_keywords.add(token)

    if not job_keywords:
        return 0.0

    matched = 0
    for kw in job_keywords:
        if kw in resume_tokens or kw in resume_text:
            matched += 1
    ratio = matched / max(len(job_keywords), 1)
    return min(0.35, ratio * 0.35)


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


def _resume_text_fields(resume: Resume) -> dict:
    """Build normalized resume text buckets for matching/scoring.

    Primary fields are stronger signals (headline/summary/experience and skill tags).
    Support fields add context (raw text, free-form skills text, education, etc.).
    """
    structured = resume.structured_json or {}
    skill_tag_blob = " ".join(tag_text(tag) for tag in (resume.tags or []))

    skills_raw = structured.get("skills")
    if isinstance(skills_raw, list):
        skills_text = " ".join(str(item) for item in skills_raw if str(item).strip())
    else:
        skills_text = str(skills_raw or "")

    primary = [
        resume.title,
        structured.get("headline"),
        structured.get("summary"),
        structured.get("experience"),
        skill_tag_blob,
    ]
    support = [
        resume.raw_text,
        skills_text,
        structured.get("education"),
        structured.get("additional_info"),
        structured.get("current_title"),
    ]

    return {
        "primary": [str(item).strip() for item in primary if str(item or "").strip()],
        "support": [str(item).strip() for item in support if str(item or "").strip()],
        "skill_tags": skill_tag_blob,
        "skills_text": skills_text,
    }


def resume_profile_text(resume: Resume) -> str:
    fields = _resume_text_fields(resume)
    # Duplicate primary signals once so explicit skill tags/structured core fields dominate.
    return " ".join(fields["primary"] + fields["primary"] + fields["support"])


def score_resume_for_job(resume: Resume, job: JobPosting) -> dict:
    resume_tokens = Counter(tokenize(resume_profile_text(resume)))
    job_tokens = Counter(tokenize(job_profile_text(job)))
    if not resume_tokens or not job_tokens:
        return {"score": 0, "breakdown": {"tags": 0, "text": 0, "location": 0, "experience": 0}}

    shared = set(resume_tokens) & set(job_tokens)
    coverage_score = sum(min(resume_tokens[t], job_tokens[t]) for t in shared) / max(sum(job_tokens.values()), 1)
    keyword_bonus = _job_keyword_bonus(resume, job)
    text_score = min(1.0, (coverage_score * 0.8) + keyword_bonus)

    explicit_tag_match = _explicit_tag_match_count(resume, job)

    inferred_tag_match = _match_job_tags_in_resume_text(resume, job)
    job_tag_count = len(job.tags or [])
    # Keep tag matching bounded by number of required job tags.
    tag_match = min(max(explicit_tag_match, inferred_tag_match), job_tag_count)
    tag_score = _tag_score(tag_match)
    desired_location = (resume.structured_json or {}).get("desired_location", "")
    normalized_job_location = _normalize_location(job.location or "")
    normalized_resume_location = _normalize_location(desired_location)
    location_score = _location_match_score(job.location or "", desired_location, job.workplace_type or "")
    required_years = _experience_floor(job.experience_level)
    years = float((resume.structured_json or {}).get("years_experience", 0) or 0)
    if required_years <= 0:
        experience_score = 1.0
    else:
        experience_score = max(0.0, min(years / required_years, 1.0))

    text_weight, tag_weight, location_weight, experience_weight = _rule_weights()

    score = round(
        min(
            100,
            (text_score * (text_weight * 100))
            + (tag_score * (tag_weight * 100))
            + (location_score * (location_weight * 100))
            + (experience_score * (experience_weight * 100)),
        ),
        1,
    )
    breakdown = {
        "text": round(text_score * (text_weight * 100), 1),
        "tags": round(tag_score * (tag_weight * 100), 1),
        "location": round(location_score * (location_weight * 100), 1),
        "experience": round(experience_score * (experience_weight * 100), 1),
    }
    factors = {
        "text": round(text_score, 6),
        "tags": round(tag_score, 6),
        "location": round(location_score, 6),
        "experience": round(experience_score, 6),
    }
    debug = {
        "text": {
            "shared_tokens": len(shared),
            "coverage_score": round(coverage_score, 6),
            "keyword_bonus": round(keyword_bonus, 6),
        },
        "tags": {
            "job_tag_count": job_tag_count,
            "explicit_match": explicit_tag_match,
            "inferred_match": inferred_tag_match,
            "final_match": tag_match,
            "full_match_count": int(_clamp_number(os.getenv("TAG_FULL_MATCH_COUNT", "4"), 1.0, 20.0, 4.0)),
            "score_ratio": round(tag_score, 6),
        },
        "location": {
            "job_normalized": normalized_job_location,
            "resume_normalized": normalized_resume_location,
            "matched": bool(location_score),
            "score_ratio": round(location_score, 6),
        },
        "experience": {
            "required_years": required_years,
            "resume_years": round(years, 2),
            "score_ratio": round(experience_score, 6),
        },
    }
    return {"score": score, "breakdown": breakdown, "factors": factors, "debug": debug}


def screen_resume_for_job_with_ai(resume: Resume, job: JobPosting) -> dict:
    """Hybrid screening: rule-based score + SentenceTransformer semantic similarity."""
    cache_key = _screening_cache_key(resume, job)
    cached = _SCREENING_CACHE.get(cache_key)
    if cached is not None:
        result = copy.deepcopy(cached)
        result.setdefault("engine", {})["cached"] = True
        return result

    base = score_resume_for_job(resume, job)

    factors = base.get("factors") or {}
    text_factor = _clamp_number(factors.get("text", 0), 0.0, 1.0, 0.0)
    tag_factor = _clamp_number(factors.get("tags", 0), 0.0, 1.0, 0.0)
    location_factor = _clamp_number(factors.get("location", 0), 0.0, 1.0, 0.0)
    experience_factor = _clamp_number(factors.get("experience", 0), 0.0, 1.0, 0.0)

    embedding_score_raw = _embedding_similarity_score(resume, job)
    embedding_score = _calibrate_semantic_score(embedding_score_raw, base)
    has_embedding = embedding_score is not None

    semantic_factor = max(0.0, min(1.0, (embedding_score or 0) / 100.0))
    lexical_gate = max(0.0, min(1.0, (tag_factor * 0.6) + (text_factor * 0.4)))
    semantic_gate = _semantic_gate_factor(tag_factor, text_factor)
    semantic_effective = semantic_factor * semantic_gate

    final_semantic_w, final_tag_w, final_text_w, final_exp_w, final_location_w = _final_weights()
    base_raw_score = round(
        (
            (semantic_effective * (final_semantic_w * 100))
            + (tag_factor * (final_tag_w * 100))
            + (text_factor * (final_text_w * 100))
            + (experience_factor * (final_exp_w * 100))
            + (location_factor * (final_location_w * 100))
        ),
        1,
    )
    penalty_info = _required_skill_penalty(resume, job)
    penalty_multiplier = _clamp_number(penalty_info.get("penalty_multiplier", 1.0), 0.0, 1.0, 1.0)
    raw_final_score = round(max(0.0, base_raw_score * penalty_multiplier), 1)
    penalty_points = round(max(0.0, base_raw_score - raw_final_score), 1)

    raw_breakdown = {
        "semantic": round(semantic_effective * (final_semantic_w * 100), 1),
        "tags": round(tag_factor * (final_tag_w * 100), 1),
        "text": round(text_factor * (final_text_w * 100), 1),
        "experience": round(experience_factor * (final_exp_w * 100), 1),
        "location": round(location_factor * (final_location_w * 100), 1),
    }
    if penalty_points > 0:
        raw_breakdown["penalty"] = round(-penalty_points, 1)

    blended_score, hybrid_breakdown, normalization_meta = _normalize_final_score(raw_final_score, raw_breakdown)

    fallback = {
        "score": blended_score,
        "breakdown": hybrid_breakdown,
        "breakdown_normalized": hybrid_breakdown,
        "breakdown_raw": {key: round(float(value or 0), 1) for key, value in raw_breakdown.items()},
        "insights": _build_hybrid_insights(resume, job, base, embedding_score),
        "debug": {
            "base": base.get("debug", {}),
            "semantic": {
                "raw": round(embedding_score_raw or 0, 1),
                "calibrated": round(embedding_score or 0, 1),
                "gate": round(semantic_gate, 6),
                "lexical_gate": round(lexical_gate, 6),
                "effective_ratio": round(semantic_effective, 6),
            },
            "required_skill_penalty": {
                **penalty_info,
                "penalty_points": penalty_points,
                "base_raw_score": base_raw_score,
                "final_raw_score": raw_final_score,
            },
            "normalization": normalization_meta,
            "final_weights": {
                "semantic": round(final_semantic_w, 6),
                "tags": round(final_tag_w, 6),
                "text": round(final_text_w, 6),
                "experience": round(final_exp_w, 6),
                "location": round(final_location_w, 6),
            },
        },
        "engine": {
            "provider": "sentence-transformers" if has_embedding else "heuristic",
            "model": (os.getenv("EMBEDDING_MODEL_NAME") or _DEFAULT_EMBEDDING_MODEL) if has_embedding else "rule-based-v1",
            "used_ai": bool(has_embedding),
            "used_embedding": bool(has_embedding),
            "cached": False,
            "semantic_raw": round(embedding_score_raw or 0, 1),
            "semantic_calibrated": round(embedding_score or 0, 1),
            "semantic_gate": round(semantic_gate, 3),
            "required_skill_penalty": round(penalty_points, 1),
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
    recommendation = "Cần xem xét thêm trước khi mời phỏng vấn."

    score = float(base.get("score", 0) or 0)
    if overlap:
        strengths.append(f"Trùng khớp {len(overlap)} kỹ năng/tag với job.")
    if score >= 85:
        strengths.append("Mức độ phù hợp tổng thể cao so với mô tả công việc.")
        recommendation = "Nên ưu tiên mời phỏng vấn vòng đầu."
    elif score >= 70:
        strengths.append("Hồ sơ có nhiều điểm phù hợp với nhu cầu tuyển dụng.")
        recommendation = "Nên đưa vào danh sách cân nhắc phỏng vấn."
    else:
        concerns.append("Mức độ phù hợp tổng thể chưa cao theo bộ tiêu chí hiện tại.")

    desired_location = _normalize_location((resume.structured_json or {}).get("desired_location", ""))
    job_location = _normalize_location(job.location or "")
    if job_location and desired_location and job_location not in desired_location and desired_location not in job_location:
        concerns.append("Địa điểm trong CV chưa trùng khớp rõ ràng với vị trí tuyển dụng.")

    years = (resume.structured_json or {}).get("years_experience", 0) or 0
    if years < _experience_floor(job.experience_level):
        concerns.append("Số năm kinh nghiệm có thể thấp hơn mức yêu cầu.")
    else:
        strengths.append("Kinh nghiệm làm việc đạt ngưỡng yêu cầu cơ bản.")

    if not strengths:
        strengths.append("Hồ sơ đã có dữ liệu cơ bản để tiếp tục đánh giá.")
    if not concerns:
        concerns.append("Chưa phát hiện rủi ro lớn từ dữ liệu CV hiện tại.")

    if embedding_score is None:
        concerns.append("Chưa có semantic embedding do thiếu package/model.")
    elif embedding_score >= 82:
        strengths.append("Nội dung CV có độ tương đồng ngữ nghĩa cao với mô tả job.")
    elif embedding_score >= 65:
        strengths.append("Nội dung CV có tương đồng ngữ nghĩa mức trung bình-khá.")
    else:
        concerns.append("Độ tương đồng ngữ nghĩa thấp, cần đọc kỹ kinh nghiệm liên quan.")

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

    model_name = (os.getenv("EMBEDDING_MODEL_NAME") or _DEFAULT_EMBEDDING_MODEL).strip()
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


def _calibrate_semantic_score(raw_score: float | None, base: dict) -> float | None:
    if raw_score is None:
        return None

    # Stretch useful range and suppress generic "same domain" similarities.
    stretched = max(0.0, min(100.0, ((raw_score - 35.0) / 65.0) * 100.0))

    breakdown = base.get("breakdown") or {}
    lexical_quality = float((breakdown.get("text", 0) or 0) + (breakdown.get("tags", 0) or 0))
    lexical_ratio = max(0.0, min(1.0, lexical_quality / 70.0))
    gated = stretched * (0.55 + (0.45 * lexical_ratio))
    return round(max(0.0, min(100.0, gated)), 1)


def _screening_cache_key(resume: Resume, job: JobPosting) -> tuple:
    model_name = (os.getenv("EMBEDDING_MODEL_NAME") or _DEFAULT_EMBEDDING_MODEL).strip()
    score_weight = _clamp_number(os.getenv("EMBEDDING_SCORE_WEIGHT", "0.30"), 0.1, 0.7, 0.30)
    normalized_score_max = _clamp_number(os.getenv("NORMALIZED_SCORE_MAX", "100"), 1.0, 500.0, 100.0)
    tag_full_match_count = _clamp_number(os.getenv("TAG_FULL_MATCH_COUNT", "4"), 1.0, 20.0, 4.0)
    required_tag_count = _clamp_number(os.getenv("REQUIRED_TAG_COUNT", "3"), 0.0, 20.0, 3.0)
    required_tag_penalty_weight = _clamp_number(os.getenv("REQUIRED_TAG_PENALTY_WEIGHT", "0.25"), 0.0, 1.0, 0.25)
    text_weight, tag_weight, location_weight, experience_weight = _rule_weights()
    final_semantic_w, final_tag_w, final_text_w, final_exp_w, final_location_w = _final_weights()
    resume_stamp = getattr(resume, "updated_at", None)
    job_stamp = getattr(job, "updated_at", None)
    return (
        int(getattr(resume, "id", 0) or 0),
        resume_stamp.isoformat() if resume_stamp else "",
        int(getattr(job, "id", 0) or 0),
        job_stamp.isoformat() if job_stamp else "",
        model_name,
        round(score_weight, 3),
        round(normalized_score_max, 3),
        round(tag_full_match_count, 3),
        round(required_tag_count, 3),
        round(required_tag_penalty_weight, 3),
        round(text_weight, 3),
        round(tag_weight, 3),
        round(location_weight, 3),
        round(experience_weight, 3),
        round(final_semantic_w, 3),
        round(final_tag_w, 3),
        round(final_text_w, 3),
        round(final_exp_w, 3),
        round(final_location_w, 3),
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
    level = _normalize_text_for_matching(experience_level or "")
    if not level:
        return 1

    # Evaluate all detected level markers and use the strictest requirement.
    aliases = {
        "intern": "intern",
        "fresher": "fresher",
        "junior": "junior",
        "entry": "junior",
        "middle": "middle",
        "mid": "middle",
        "intermediate": "middle",
        "senior": "senior",
        "lead": "lead",
        "principal": "lead",
        "staff": "lead",
    }
    floors = {
        "intern": 0,
        "fresher": 0,
        "junior": 1,
        "middle": 3,
        "senior": 5,
        "lead": 6,
    }

    tokens = {token for token in re.split(r"[\s/_-]+", level) if token}
    detected = []
    for token in tokens:
        mapped = aliases.get(token)
        if mapped:
            detected.append(mapped)

    if "mid" in level and "senior" in level:
        detected.append("senior")

    if not detected:
        return 1
    return max(floors[item] for item in detected)


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
