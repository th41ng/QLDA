import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "jobportal-secret-key-change-me-to-a-long-random-string")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jobportal-jwt-secret-key-change-me-to-a-long-random-string")
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql://jobportal_user:JobPortal123%21@127.0.0.1:5432/job_portal",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JSON_SORT_KEYS = False
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "instance/uploads")
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", 5 * 1024 * 1024))
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173")
    FRONTEND_URLS = os.getenv("FRONTEND_URLS", "")

    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.getenv("MAIL_PORT", 587))
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "true").lower() == "true"
    MAIL_USERNAME = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_USERNAME")
    OTP_EXPIRES_MINUTES = int(os.getenv("OTP_EXPIRES_MINUTES", 5))
    OTP_RESEND_SECONDS = int(os.getenv("OTP_RESEND_SECONDS", 60))
    OTP_MAX_ATTEMPTS = int(os.getenv("OTP_MAX_ATTEMPTS", 5))
    OTP_MAX_SENDS_PER_HOUR = int(os.getenv("OTP_MAX_SENDS_PER_HOUR", 5))

    CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
    CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
    CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

    EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "intfloat/multilingual-e5-base")
    EMBEDDING_SCORE_WEIGHT = float(os.getenv("EMBEDDING_SCORE_WEIGHT", 0.30))
    RULE_TEXT_WEIGHT = float(os.getenv("RULE_TEXT_WEIGHT", 0.40))
    RULE_TAG_WEIGHT = float(os.getenv("RULE_TAG_WEIGHT", 0.30))
    RULE_LOCATION_WEIGHT = float(os.getenv("RULE_LOCATION_WEIGHT", 0.15))
    RULE_EXPERIENCE_WEIGHT = float(os.getenv("RULE_EXPERIENCE_WEIGHT", 0.15))
    FINAL_SEMANTIC_WEIGHT = float(os.getenv("FINAL_SEMANTIC_WEIGHT", 0.45))
    FINAL_TAG_WEIGHT = float(os.getenv("FINAL_TAG_WEIGHT", 0.20))
    FINAL_TEXT_WEIGHT = float(os.getenv("FINAL_TEXT_WEIGHT", 0.15))
    FINAL_EXPERIENCE_WEIGHT = float(os.getenv("FINAL_EXPERIENCE_WEIGHT", 0.10))
    FINAL_LOCATION_WEIGHT = float(os.getenv("FINAL_LOCATION_WEIGHT", 0.10))
    NORMALIZED_SCORE_MAX = float(os.getenv("NORMALIZED_SCORE_MAX", 100))
    TAG_FULL_MATCH_COUNT = int(os.getenv("TAG_FULL_MATCH_COUNT", 4))
    REQUIRED_TAG_COUNT = int(os.getenv("REQUIRED_TAG_COUNT", 3))
    REQUIRED_TAG_PENALTY = float(os.getenv("REQUIRED_TAG_PENALTY", 7))
    REQUIRED_TAG_PENALTY_WEIGHT = float(os.getenv("REQUIRED_TAG_PENALTY_WEIGHT", 0.25))
    EMBEDDING_WARMUP_ON_START = os.getenv("EMBEDDING_WARMUP_ON_START", "true").lower() == "true"
    SCREENING_CACHE_SIZE = int(os.getenv("SCREENING_CACHE_SIZE", 2000))
    EMBEDDING_VECTOR_CACHE_SIZE = int(os.getenv("EMBEDDING_VECTOR_CACHE_SIZE", 4000))

    SEED_DATA = os.getenv("SEED_DATA", "true").lower() == "true"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=int(os.getenv("JWT_ACCESS_TOKEN_DAYS", 7)))
