from pathlib import Path
from flask import Flask, make_response, redirect, request, url_for
from flask_login import current_user

from .api.registry import register_api_blueprints
from .web.registry import register_web_blueprints
from .core.config import Config
from .core.extensions import db, jwt, login_manager, mail, migrate
from .core.services.matching_service import warmup_embedding_model
from .repositories import get_user_by_id


def create_app():
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)

    # Avoid 308/301 redirects caused by trailing slashes.
    # Redirects can break browser CORS preflight (OPTIONS) requests.
    app.url_map.strict_slashes = False

    # =========================
    # INIT EXTENSIONS
    # =========================
    db.init_app(app)
    migrate.init_app(app, db)
    mail.init_app(app)
    jwt.init_app(app)
    login_manager.init_app(app)

    # =========================
    # LOGIN
    # =========================
    @login_manager.user_loader
    def load_user(user_id):
        return get_user_by_id(int(user_id))

    # =========================
    # CORS (GLOBAL - ALWAYS SEND)
    # =========================
    # Production frontend (Render)
    FRONTEND_ORIGIN = "https://qlda-frontend.onrender.com"

    # Allow local dev origins too.
    DEV_ORIGINS = {
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5174",
        "http://localhost:5174",
    }
    ALLOWED_ORIGINS = {FRONTEND_ORIGIN, *DEV_ORIGINS}

    CORS_ALLOW_METHODS = "GET, POST, PUT, DELETE, OPTIONS"
    CORS_ALLOW_HEADERS_DEFAULT = "Authorization, Content-Type"

    @app.before_request
    def _handle_cors_preflight():
        # Respond to ANY OPTIONS request (including missing routes) so preflight
        # never fails due to 404/405 or redirect behavior.
        if request.method == "OPTIONS":
            return make_response("", 204)

    @app.after_request
    def _add_cors_headers(response):
        # Always attach CORS headers so the browser never sees a response
        # without them (including errors/redirects).
        request_origin = request.headers.get("Origin")
        allow_origin = request_origin if request_origin in ALLOWED_ORIGINS else FRONTEND_ORIGIN

        response.headers["Access-Control-Allow-Origin"] = allow_origin
        response.headers["Vary"] = "Origin"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = CORS_ALLOW_METHODS

        requested_headers = request.headers.get("Access-Control-Request-Headers")
        response.headers["Access-Control-Allow-Headers"] = requested_headers or CORS_ALLOW_HEADERS_DEFAULT
        response.headers["Access-Control-Max-Age"] = "86400"
        return response

    # =========================
    # BLUEPRINTS
    # =========================
    register_api_blueprints(app)
    register_web_blueprints(app)

    # =========================
    # ROOT ROUTE
    # =========================
    @app.route("/")
    def index():
        if current_user.is_authenticated:
            return redirect(url_for("admin.dashboard"))
        return redirect(url_for("admin.login"))

    # =========================
    # INIT CONTEXT
    # =========================
    with app.app_context():
        Path(app.config["UPLOAD_FOLDER"]).mkdir(parents=True, exist_ok=True)
        db.create_all()

        if app.config.get("EMBEDDING_WARMUP_ON_START", True):
            warmup_embedding_model()

    return app