from pathlib import Path
import os
import logging

from flask import Flask, redirect, url_for, request, jsonify
from flask_login import current_user
from flask_cors import CORS
from sqlalchemy.exc import OperationalError

from .api.registry import register_api_blueprints
from .web.registry import register_web_blueprints
from .core.config import Config
from .core.extensions import db, jwt, login_manager, mail, migrate
from .core.services.matching_service import warmup_embedding_model
from .repositories import get_user_by_id


def create_app():
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)

    # Tránh redirect trailing slash gây lỗi CORS
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
    # CORS CONFIGURATION
    # =========================
    extra_origins = [
        origin.strip()
        for origin in (app.config.get("FRONTEND_URLS") or "").split(",")
        if origin.strip()
    ]
    cors_origins = [
        app.config.get("FRONTEND_URL"),
        *extra_origins,
        # Local dev
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]
    cors_origins = [o for o in cors_origins if o]

    CORS(
        app,
        resources={r"/api/*": {"origins": cors_origins}},
        supports_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
        expose_headers=["Content-Type", "Authorization"],
        max_age=86400,
    )

    # =========================
    # LOGIN
    # =========================
    @login_manager.user_loader
    def load_user(user_id):
        return get_user_by_id(int(user_id))

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

    @app.get("/healthz")
    def healthz():
        return jsonify({"status": "ok"}), 200

    # =========================
    # INIT CONTEXT
    # =========================
    with app.app_context():
        Path(app.config["UPLOAD_FOLDER"]).mkdir(parents=True, exist_ok=True)

        # In production (Railway), we must have DATABASE_URL set.
        # Otherwise the app falls back to localhost and crashes with connection refused.
        flask_env = (os.getenv("FLASK_ENV") or "").lower()
        database_url_env = os.getenv("DATABASE_URL")
        if flask_env == "production" and not database_url_env:
            raise RuntimeError(
                "Missing DATABASE_URL environment variable. "
                "On Railway: add a PostgreSQL plugin and set the backend service variable DATABASE_URL "
                "to the plugin's connection string (or reference it)."
            )

        try:
            db.create_all()
        except OperationalError as exc:
            # Provide a clearer hint for the most common misconfiguration.
            uri = (app.config.get("SQLALCHEMY_DATABASE_URI") or "").strip()
            if "127.0.0.1" in uri or "localhost" in uri:
                logging.exception("Database connection failed (looks like localhost fallback): %s", uri)
                raise RuntimeError(
                    "Database connection failed. It looks like SQLALCHEMY_DATABASE_URI is pointing to localhost. "
                    "Ensure Railway backend service has DATABASE_URL set to the Railway Postgres connection string."
                ) from exc
            raise

        if app.config.get("EMBEDDING_WARMUP_ON_START", True):
            warmup_embedding_model()

    return app
