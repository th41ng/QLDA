from ..models import Category, Tag


def list_active_tags(category=None):
    query = Tag.query.filter(Tag.is_active.is_(True)).join(Tag.category)
    if category:
        query = query.filter(Category.slug == category)
    return query.order_by(Category.name.asc(), Tag.name.asc()).all()


def list_active_categories():
    return Category.query.filter(Category.is_active.is_(True)).order_by(Category.name.asc()).all()
