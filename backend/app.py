from pathlib import Path
from flask import Flask, redirect, url_for, request, make_response
from flask_login import current_user
from flask_cors import CORS

from .api.registry import register_api_blueprints
from .web.registry import register_web_blueprints
from .core.config import Config
from .core.extensions import db, jwt, login_manager, mail, migrate
from .core.services.matching_service import warmup_embedding_model
from .repositories import get_user_by_id


def create_app():
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)

    # =========================
    # INIT EXTENSIONS
    # =========================
    db.init_app(app)
    migrate.init_app(app, db)
    mail.init_app(app)
    jwt.init_app(app)
    login_manager.init_app(app)

    # =========================
    # LOGIN LOADER
    # =========================
    @login_manager.user_loader
    def load_user(user_id):
        return get_user_by_id(int(user_id))

    # =========================
    # CORS CONFIG (FIX TRIỆT ĐỂ)
    # =========================
    FRONTEND = "https://qlda-frontend.onrender.com"

    CORS(
        app,
        resources={r"/api/*": {"origins": FRONTEND}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )

    # =========================
    # FORCE HEADERS (fix ngrok + missing header)
    # =========================
    @app.after_request
    def after_request(response):
        response.headers["Access-Control-Allow-Origin"] = FRONTEND
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        return response

    # =========================
    # HANDLE PRE-FLIGHT OPTIONS
    # =========================
    @app.before_request
    def handle_options():
        if request.method == "OPTIONS":
            resp = make_response()
            resp.headers["Access-Control-Allow-Origin"] = FRONTEND
            resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            resp.headers["Access-Control-Allow-Credentials"] = "true"
            return resp

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
    # INIT APP CONTEXT
    # =========================
    with app.app_context():
        Path(app.config["UPLOAD_FOLDER"]).mkdir(parents=True, exist_ok=True)
        db.create_all()

        if app.config.get("EMBEDDING_WARMUP_ON_START", True):
            warmup_embedding_model()

    return app