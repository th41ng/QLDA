from datetime import date, datetime


def _iso(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def tag_to_dict(tag):
    if not tag:
        return None
    return {
        "id": tag.id,
        "name": tag.name,
        "slug": tag.slug,
        "description": tag.description,
        "category": tag.category.slug if getattr(tag, "category", None) else None,
        "category_name": tag.category.name if getattr(tag, "category", None) else None,
    }


def profile_to_dict(profile):
    if not profile:
        return {}
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "dob": _iso(profile.dob),
        "gender": profile.gender,
        "address": profile.address,
        "headline": profile.headline,
        "summary": profile.summary,
        "current_title": profile.current_title,
        "years_experience": profile.years_experience,
        "expected_salary": profile.expected_salary,
        "desired_location": profile.desired_location,
        "education": profile.education,
        "experience": profile.experience,
        "created_at": _iso(profile.created_at),
        "updated_at": _iso(profile.updated_at),
    }


def cv_template_to_dict(template):
    if not template:
        return None
    return {
        "id": template.id,
        "name": template.name,
        "slug": template.slug,
        "summary": template.summary,
        "description": template.description,
        "thumbnail_url": template.thumbnail_url,
        "preview_url": template.preview_url,
        "file_format": template.file_format,
        "is_active": bool(template.is_active),
        "created_at": _iso(template.created_at),
    }


def resume_to_dict(resume):
    if not resume:
        return None

    return {
        "id": resume.id,
        "user_id": resume.user_id,
        "title": resume.title,
        "source_type": resume.source_type,
        "template_name": resume.template_name,
        "original_filename": resume.original_filename,
        "stored_path": resume.stored_path,
        "file_ext": resume.file_ext,
        "mime_type": resume.mime_type,
        "raw_text": resume.raw_text,
        "structured_json": resume.structured_json or {},
        "generated_pdf_path": resume.generated_pdf_path,
        "generated_docx_path": resume.generated_docx_path,
        "is_primary": bool(resume.is_primary),
        "tags": [tag_to_dict(tag) for tag in (resume.tags or [])],
        "created_at": _iso(resume.created_at),
        "updated_at": _iso(resume.updated_at),
    }
