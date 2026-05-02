from pathlib import Path
from flask import Flask, redirect, url_for, request
from flask_login import current_user
from flask_cors import CORS   # ← Thêm dòng này

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
    # CORS CONFIGURATION (ĐÃ SỬA)
    # =========================
    CORS(
        app,
        resources={r"/api/*": {"origins": [
            "https://qlda-frontend.onrender.com",   # Production
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
        ]}},
        supports_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
        expose_headers=["Content-Type", "Authorization"],
        max_age=86400
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

    # =========================
    # INIT CONTEXT
    # =========================
    with app.app_context():
        Path(app.config["UPLOAD_FOLDER"]).mkdir(parents=True, exist_ok=True)
        db.create_all()

        if app.config.get("EMBEDDING_WARMUP_ON_START", True):
            warmup_embedding_model()

    return app
