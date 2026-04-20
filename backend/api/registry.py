from .applications_routes import api_applications_bp
from .auth import api_auth_bp
from .companies_routes import api_companies_bp
from .jobs_routes import api_jobs_bp
from .profile_routes import api_profiles_bp
from .resume_routes import api_resumes_bp
from .statistics_routes import api_statistics_bp
from .tags_routes import api_tags_bp
from .users_routes import api_users_bp

API_PREFIXES = {
    "applications": "/api/applications",
    "auth": "/api/auth",
    "companies": "/api/companies",
    "jobs": "/api/jobs",
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
    (api_resumes_bp, API_PREFIXES["resumes"]),
    (api_profiles_bp, API_PREFIXES["profiles"]),
    (api_statistics_bp, API_PREFIXES["statistics"]),
    (api_tags_bp, API_PREFIXES["tags"]),
    (api_users_bp, API_PREFIXES["users"]),
)


def register_api_blueprints(app):
    for blueprint, prefix in API_BLUEPRINTS:
        app.register_blueprint(blueprint, url_prefix=prefix)
