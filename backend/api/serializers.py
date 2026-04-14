def category_to_dict(category):
    return {
        "id": category.id,
        "name": category.name,
        "slug": category.slug,
        "description": category.description,
        "is_active": category.is_active,
    }


def tag_to_dict(tag):
    return {
        "id": tag.id,
        "name": tag.name,
        "slug": tag.slug,
        "category_id": tag.category_id,
        "category": tag.category.slug if tag.category else None,
        "category_name": tag.category.name if tag.category else None,
        "description": tag.description,
        "is_active": tag.is_active,
    }


def company_to_dict(company):
    if not company:
        return None
    return {
        "id": company.id,
        "recruiter_user_id": company.recruiter_user_id,
        "company_name": company.company_name,
        "tax_code": company.tax_code,
        "website": company.website,
        "address": company.address,
        "description": company.description,
        "logo_url": company.logo_url,
        "industry": company.industry,
    }


def job_to_dict(job):
    return {
        "id": job.id,
        "recruiter_user_id": job.recruiter_user_id,
        "company": company_to_dict(job.company),
        "title": job.title,
        "slug": job.slug,
        "summary": job.summary,
        "description": job.description,
        "requirements": job.requirements,
        "responsibilities": job.responsibilities,
        "location": job.location,
        "workplace_type": job.workplace_type,
        "employment_type": job.employment_type,
        "experience_level": job.experience_level,
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
        "salary_currency": job.salary_currency,
        "vacancy_count": job.vacancy_count,
        "deadline": job.deadline.isoformat() if job.deadline else None,
        "status": job.status,
        "is_featured": job.is_featured,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "updated_at": job.updated_at.isoformat() if job.updated_at else None,
        "tags": [tag_to_dict(tag) for tag in job.tags],
    }
