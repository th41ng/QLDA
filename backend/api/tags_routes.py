from flask import Blueprint, request

from . import json_ok
from ..models import Category, Tag
from ..schemas import tag_to_dict

api_tags_bp = Blueprint("api_tags", __name__)


def _category_to_dict(category: Category):
    return {
        "id": category.id,
        "name": category.name,
        "slug": category.slug,
        "description": category.description,
        "is_active": bool(category.is_active),
    }


@api_tags_bp.get("")
def list_tags():
    category_filter = (request.args.get("category") or "").strip().lower()
    query = Tag.query.join(Category).filter(Tag.is_active.is_(True))
    if category_filter:
        query = query.filter((Category.slug == category_filter) | (Category.name.ilike(category_filter)))
    tags = query.order_by(Tag.name.asc()).all()
    return json_ok([tag_to_dict(tag) for tag in tags])


@api_tags_bp.get("/categories")
def list_categories():
    categories = Category.query.filter(Category.is_active.is_(True)).order_by(Category.name.asc()).all()
    return json_ok([_category_to_dict(category) for category in categories])