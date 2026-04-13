from .auth import api_auth_bp

API_PREFIXES = {
    "auth": "/api/auth",
}

API_BLUEPRINTS = (
    (api_auth_bp, API_PREFIXES["auth"]),
)


def register_api_blueprints(app):
    for blueprint, prefix in API_BLUEPRINTS:
        app.register_blueprint(blueprint, url_prefix=prefix)
