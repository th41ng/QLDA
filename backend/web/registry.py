from .admin_routes import admin_bp

WEB_PREFIXES = {
    "admin": "/admin",
}

WEB_BLUEPRINTS = (
    (admin_bp, WEB_PREFIXES["admin"]),
)


def register_web_blueprints(app):
    for blueprint, prefix in WEB_BLUEPRINTS:
        app.register_blueprint(blueprint, url_prefix=prefix)
