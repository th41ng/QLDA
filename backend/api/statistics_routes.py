from flask import Blueprint

from . import json_ok
from ..services.statistics_service import get_landing_statistics

api_statistics_bp = Blueprint("api_statistics", __name__)


@api_statistics_bp.get("/landing")
def landing_statistics():
    return json_ok(get_landing_statistics())