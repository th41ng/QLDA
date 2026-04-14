from flask import Blueprint, request

from . import json_ok
from ..repositories import list_active_categories, list_active_tags
from .serializers import category_to_dict, tag_to_dict

api_tags_bp = Blueprint("api_tags", __name__)


@api_tags_bp.get("")
def list_tags():
    category = request.args.get("category")
    tags = list_active_tags(category)
    return json_ok([tag_to_dict(tag) for tag in tags])


@api_tags_bp.get("/categories")
def list_categories():
    categories = list_active_categories()
    return json_ok([category_to_dict(category) for category in categories])
