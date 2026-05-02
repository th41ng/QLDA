from .applications_routes import api_applications_bp
from .auth import api_auth_bp
from .companies_routes import api_companies_bp
from .jobs_routes import api_jobs_bp
from .notifications_routes import api_notifications_bp
from .profile_routes import api_profiles_bp
from .resume_routes import api_resumes_bp
from .statistics_routes import api_statistics_bp
from .tags_routes import api_tags_bp
from .users_routes import api_users_bp

API_ROOT_PREFIX = "/api"

API_PREFIXES = {
    "applications": "/api/applications",
    "auth": "/api/auth",
    "companies": "/api/companies",
    "jobs": "/api/jobs",
    "notifications": "/api/notifications",
    "resumes": "/api/resumes",
    "profiles": "/api/profiles",
    "statistics": "/api/statistics",
    "tags": "/api/tags",
    "users": "/api/users",
}

API_BLUEPRINTS = (
    (api_applications_bp, API_PREFIXES["applications"]),
    (api_auth_bp, API_PREFIXES["auth"]),
    (api_companies_bp, API_PREFIXES["companies"]),
    (api_jobs_bp, API_PREFIXES["jobs"]),
    (api_notifications_bp, API_PREFIXES["notifications"]),
    (api_resumes_bp, API_PREFIXES["resumes"]),
    (api_profiles_bp, API_PREFIXES["profiles"]),
    (api_statistics_bp, API_PREFIXES["statistics"]),
    (api_tags_bp, API_PREFIXES["tags"]),
    (api_users_bp, API_PREFIXES["users"]),
)


def register_api_blueprints(app):
    for blueprint, prefix in API_BLUEPRINTS:
        normalized = str(prefix or "").strip()
        if not normalized.startswith("/"):
            normalized = f"/{normalized}"
        if not normalized.startswith(API_ROOT_PREFIX + "/") and normalized != API_ROOT_PREFIX:
            # Ensure all API routes live under /api
            normalized = f"{API_ROOT_PREFIX}{normalized}"

        app.register_blueprint(blueprint, url_prefix=normalized)
