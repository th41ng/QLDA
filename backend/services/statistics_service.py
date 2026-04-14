from ..repositories import (
    count_active_categories,
    count_cv_templates,
    count_published_employers,
    count_published_jobs,
)


def get_landing_statistics():
    return {
        "total_jobs": count_published_jobs(),
        "total_employers": count_published_employers(),
        "total_categories": count_active_categories(),
        "total_cv_templates": count_cv_templates(),
    }
