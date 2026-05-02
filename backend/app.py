from pathlib import Path
from urllib.parse import urlparse
from flask import Flask
from sqlalchemy import inspect, text

from .api.registry import register_api_blueprints
from .web.registry import register_web_blueprints
from .core.config import Config
from .core.extensions import cors, db, jwt, login_manager, mail, migrate
from .core.services.matching_service import warmup_embedding_model
from .repositories import get_user_by_id


def create_app():
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)
    mail.init_app(app)
    jwt.init_app(app)
    login_manager.init_app(app)
    frontend_origins = _build_frontend_origins(
        app.config["FRONTEND_URL"],
        app.config.get("FRONTEND_URLS", ""),
    )
    cors.init_app(app, resources={r"/*": {"origins": frontend_origins}}, supports_credentials=True)

    @login_manager.user_loader
    def load_user(user_id):
        return get_user_by_id(int(user_id))

    register_api_blueprints(app)
    register_web_blueprints(app)

    @app.route("/")
    def index():
        return {"ok": True, "message": "Auth API is running"}

    with app.app_context():
        Path(app.config["UPLOAD_FOLDER"]).mkdir(parents=True, exist_ok=True)
        db.create_all()
        _ensure_otp_schema()
        if app.config.get("EMBEDDING_WARMUP_ON_START", True):
            warmup_status = warmup_embedding_model()
            if warmup_status.get("ready"):
                app.logger.info(
                    "Embedding model warmed up: provider=%s model=%s",
                    warmup_status.get("provider"),
                    warmup_status.get("model"),
                )
            else:
                app.logger.warning(
                    "Embedding warmup skipped/fallback: provider=%s model=%s reason=%s",
                    warmup_status.get("provider"),
                    warmup_status.get("model"),
                    warmup_status.get("reason"),
                )

    return app


def _build_frontend_origins(primary_origin, extra_origins=None):
    origins = set()
    candidates = [primary_origin]

    if isinstance(extra_origins, str):
        candidates.extend([item.strip() for item in extra_origins.split(",") if item.strip()])
    elif isinstance(extra_origins, (list, tuple, set)):
        candidates.extend([str(item).strip() for item in extra_origins if str(item).strip()])

    for origin in candidates:
        clean_origin = str(origin or "").strip().rstrip("/")
        if not clean_origin:
            continue
        origins.add(clean_origin)

        parsed = urlparse(clean_origin)
        if parsed.scheme and parsed.hostname in {"127.0.0.1", "localhost"}:
            host_variants = {"127.0.0.1", "localhost"}
            port_variants = {parsed.port or 5173, 5173, 5174}
            for host in host_variants:
                for port in port_variants:
                    origins.add(f"{parsed.scheme}://{host}:{port}")

    # Always allow common local frontend dev origins to avoid CORS issues when Vite auto-increments port.
    for host in {"127.0.0.1", "localhost"}:
        for port in {3000, 5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180}:
            origins.add(f"http://{host}:{port}")

    return sorted(origins)


def _ensure_otp_schema():
    inspector = inspect(db.engine)
    if "otp_codes" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("otp_codes")}
    statements = []
    if "resend_available_at" not in columns:
        statements.append(
            "ALTER TABLE otp_codes ADD COLUMN resend_available_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
        )
    if "max_attempts" not in columns:
        statements.append("ALTER TABLE otp_codes ADD COLUMN max_attempts INT NOT NULL DEFAULT 5")
    if "request_ip" not in columns:
        statements.append("ALTER TABLE otp_codes ADD COLUMN request_ip VARCHAR(64)")

    for statement in statements:
        db.session.execute(text(statement))
    if statements:
        db.session.commit()
