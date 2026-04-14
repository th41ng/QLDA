from .auth import api_auth_bp
from .job_routes import api_jobs_bp
from .tag_routes import api_tags_bp

API_PREFIXES = {
    "auth": "/api/auth",
    "jobs": "/api/jobs",
    "tags": "/api/tags",
}

API_BLUEPRINTS = (
    (api_auth_bp, API_PREFIXES["auth"]),
    (api_jobs_bp, API_PREFIXES["jobs"]),
    (api_tags_bp, API_PREFIXES["tags"]),
)


def register_api_blueprints(app):
    for blueprint, prefix in API_BLUEPRINTS:
        app.register_blueprint(blueprint, url_prefix=prefix)
