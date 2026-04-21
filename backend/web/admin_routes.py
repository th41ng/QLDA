import json
from datetime import datetime
from pathlib import Path
from functools import wraps

from flask import Blueprint, current_app, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required, login_user, logout_user
from sqlalchemy import func, or_
from sqlalchemy.orm import joinedload, selectinload
from werkzeug.utils import secure_filename

from ..core.extensions import db
from ..core.security import hash_password, slugify, verify_password
from ..core.services.storage_service import upload_image
from ..models import Application, CandidateProfile, Category, Company, CvTemplate, JobPosting, Resume, Tag, User, job_tags

admin_bp = Blueprint("admin", __name__, template_folder="../templates")


ROLE_OPTIONS = ["admin", "recruiter", "candidate"]
USER_STATUS_OPTIONS = ["active", "locked"]
JOB_STATUS_OPTIONS = ["draft", "published", "closed"]
APPLICATION_STATUS_OPTIONS = ["submitted", "reviewing", "interview", "accepted", "rejected"]
FILE_FORMAT_OPTIONS = ["both", "pdf", "docx"]
CHART_COLORS = {
    "admin": "#2458f2",
    "recruiter": "#0f766e",
    "candidate": "#d97706",
    "active": "#059669",
    "locked": "#dc2626",
    "draft": "#64748b",
    "published": "#2563eb",
    "closed": "#7c3aed",
    "submitted": "#2563eb",
    "reviewing": "#0f766e",
    "interview": "#d97706",
    "accepted": "#059669",
    "rejected": "#dc2626",
}
CHART_PALETTE = ["#2458f2", "#0f766e", "#d97706", "#7c3aed", "#dc2626", "#0891b2", "#64748b"]


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated or current_user.role != "admin":
            return redirect(url_for("admin.login"))
        return fn(*args, **kwargs)

    return wrapper


def _to_int(value, default=None):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _to_bool(value):
    return str(value).lower() in {"1", "true", "on", "yes"}


def _parse_date(value):
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


def _commit(message, category="success"):
    db.session.commit()
    flash(message, category)


def _load_user_or_none(user_id):
    return db.session.get(User, user_id) if user_id else None


def _load_company_or_none(company_id):
    return db.session.get(Company, company_id) if company_id else None


def _load_category_or_none(category_id):
    return db.session.get(Category, category_id) if category_id else None


def _load_tag_or_none(tag_id):
    return db.session.get(Tag, tag_id) if tag_id else None


def _load_job_or_none(job_id):
    return db.session.get(JobPosting, job_id) if job_id else None


def _load_application_or_none(application_id):
    return db.session.get(Application, application_id) if application_id else None


def _load_template_or_none(template_id):
    return db.session.get(CvTemplate, template_id) if template_id else None


def _load_resume_or_none(resume_id):
    return db.session.get(Resume, resume_id) if resume_id else None


def _company_choices():
    return Company.query.order_by(Company.company_name.asc()).all()


def _recruiter_choices():
    return User.query.filter_by(role="recruiter").order_by(User.full_name.asc()).all()


def _category_choices():
    return Category.query.order_by(Category.name.asc()).all()


def _tag_choices():
    return Tag.query.join(Tag.category).order_by(Category.name.asc(), Tag.name.asc()).all()


def _save_admin_avatar(file_storage, user_id):
    if not file_storage or not getattr(file_storage, "filename", ""):
        return None

    uploaded = upload_image(file_storage, folder="jobportal/admin-avatars", public_id=f"admin-{user_id}")
    if uploaded:
        return uploaded.url

    static_folder = Path(current_app.static_folder) / "uploads" / "admin-avatars"
    static_folder.mkdir(parents=True, exist_ok=True)
    safe_name = secure_filename(file_storage.filename) or "avatar.png"
    stamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    filename = f"admin-{user_id}-{stamp}-{safe_name}"
    target = static_folder / filename
    file_storage.save(target)
    return url_for("static", filename=f"uploads/admin-avatars/{filename}")


def _delete_resume_files(resume):
    for file_path in (resume.stored_path, resume.generated_pdf_path, resume.generated_docx_path):
        if not file_path:
            continue
        try:
            path = Path(file_path)
            if path.exists() and path.is_file():
                path.unlink()
        except Exception:
            pass


def _build_chart_rows(items):
    total = sum(item[2] for item in items) or 1
    rows = []
    for index, (key, label, count) in enumerate(items):
        rows.append(
            {
                "key": key,
                "label": label,
                "count": count,
                "percent": round((count / total) * 100, 1),
                "color": CHART_COLORS.get(key, CHART_PALETTE[index % len(CHART_PALETTE)]),
            }
        )
    return rows


def _build_donut_chart(rows):
    total = sum(row["count"] for row in rows) or 1
    segments = []
    start = 0
    for row in rows:
        sweep = (row["count"] / total) * 360
        end = start + sweep
        segments.append(f"{row['color']} {start:.2f}deg {end:.2f}deg")
        start = end
    return {
        "total": sum(row["count"] for row in rows),
        "gradient": f"conic-gradient({', '.join(segments)})" if segments else "conic-gradient(#dbe4ff 0deg 360deg)",
    }


def _build_category_job_rows(limit=6):
    rows = (
        db.session.query(
            Category.id,
            Category.name,
            func.count(func.distinct(JobPosting.id)).label("job_count"),
        )
        .outerjoin(Tag, Tag.category_id == Category.id)
        .outerjoin(job_tags, job_tags.c.tag_id == Tag.id)
        .outerjoin(JobPosting, JobPosting.id == job_tags.c.job_id)
        .filter(Category.is_active.is_(True))
        .group_by(Category.id, Category.name)
        .order_by(func.count(func.distinct(JobPosting.id)).desc(), Category.name.asc())
        .all()
    )

    items = [(f"category-{category_id}", name, int(job_count or 0)) for category_id, name, job_count in rows if int(job_count or 0) > 0]
    if len(items) > limit:
        visible = items[:limit]
        remaining = sum(item[2] for item in items[limit:])
        if remaining:
            visible.append(("category-other", "Khac", remaining))
        items = visible
    return _build_chart_rows(items)


def _build_tag_job_rows(limit=6):
    rows = (
        db.session.query(
            Tag.id,
            Tag.name,
            func.count(func.distinct(job_tags.c.job_id)).label("job_count"),
        )
        .join(job_tags, job_tags.c.tag_id == Tag.id)
        .group_by(Tag.id, Tag.name)
        .order_by(func.count(func.distinct(job_tags.c.job_id)).desc(), Tag.name.asc())
        .all()
    )

    items = [(f"tag-{tag_id}", name, int(job_count or 0)) for tag_id, name, job_count in rows if int(job_count or 0) > 0]
    if len(items) > limit:
        visible = items[:limit]
        remaining = sum(item[2] for item in items[limit:])
        if remaining:
            visible.append(("tag-other", "Khac", remaining))
        items = visible
    return _build_chart_rows(items)


def _build_experience_level_rows():
    rows = (
        db.session.query(
            JobPosting.experience_level,
            func.count(JobPosting.id).label("job_count"),
        )
        .group_by(JobPosting.experience_level)
        .all()
    )

    items = [(level or "unknown", (level or "Unknown").title(), int(job_count or 0)) for level, job_count in rows if int(job_count or 0) > 0]
    return _build_chart_rows(items)


def _build_employment_type_rows():
    rows = (
        db.session.query(
            JobPosting.employment_type,
            func.count(JobPosting.id).label("job_count"),
        )
        .group_by(JobPosting.employment_type)
        .all()
    )

    items = [(emp_type or "unknown", (emp_type or "Unknown").title(), int(job_count or 0)) for emp_type, job_count in rows if int(job_count or 0) > 0]
    return _build_chart_rows(items)


def _build_monthly_job_trend(months=6):
    now = datetime.utcnow()
    month_starts = []
    for offset in range(months - 1, -1, -1):
        month = now.month - offset
        year = now.year
        while month <= 0:
            month += 12
            year -= 1
        month_starts.append(datetime(year, month, 1))

    counts = {(item.year, item.month): 0 for item in month_starts}
    jobs = JobPosting.query.filter(JobPosting.created_at >= month_starts[0]).all()
    for job in jobs:
        if not job.created_at:
            continue
        key = (job.created_at.year, job.created_at.month)
        if key in counts:
            counts[key] += 1

    rows = [
        {
            "label": item.strftime("%m/%Y"),
            "count": counts[(item.year, item.month)],
        }
        for item in month_starts
    ]
    max_count = max((row["count"] for row in rows), default=0) or 1
    width = 460
    height = 220
    padding_x = 28
    padding_y = 24
    usable_width = width - (padding_x * 2)
    usable_height = height - (padding_y * 2)
    point_step = usable_width / max(len(rows) - 1, 1)

    points = []
    for index, row in enumerate(rows):
        x = padding_x + index * point_step
        y = height - padding_y - ((row["count"] / max_count) * usable_height)
        row["x"] = round(x, 2)
        row["y"] = round(y, 2)
        points.append(f"{row['x']},{row['y']}")

    return {
        "rows": rows,
        "points": " ".join(points),
        "width": width,
        "height": height,
        "padding_x": padding_x,
        "padding_y": padding_y,
        "max_count": max_count,
    }


@admin_bp.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated and current_user.role == "admin":
        return redirect(url_for("admin.dashboard"))
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        user = User.query.filter_by(email=email, role="admin").first()
        if user and user.status == "active" and verify_password(user.password_hash, password):
            login_user(user)
            return redirect(url_for("admin.dashboard"))
        flash("Sai tÃ i khoáº£n hoáº·c máº­t kháº©u admin.", "error")
    return render_template("admin/login.html")


@admin_bp.route("/logout")
def logout():
    logout_user()
    return redirect(url_for("admin.login"))


@admin_bp.route("/")
@login_required
@admin_required
def dashboard():
    stats = {
        "users": User.query.count(),
        "admins": User.query.filter_by(role="admin").count(),
        "recruiters": User.query.filter_by(role="recruiter").count(),
        "candidates": User.query.filter_by(role="candidate").count(),
        "jobs": JobPosting.query.count(),
        "companies": Company.query.count(),
        "applications": Application.query.count(),
        "categories": Category.query.count(),
        "tags": Tag.query.count(),
        "templates": CvTemplate.query.count(),
    }
    recent_users = User.query.order_by(User.updated_at.desc()).limit(6).all()
    recent_jobs = JobPosting.query.order_by(JobPosting.updated_at.desc()).limit(6).all()
    recent_apps = Application.query.order_by(Application.updated_at.desc()).limit(6).all()
    recent_templates = CvTemplate.query.order_by(CvTemplate.created_at.desc()).limit(6).all()
    users_by_role = _build_chart_rows(
        [
            ("admin", "Admin", stats["admins"]),
            ("recruiter", "Recruiter", stats["recruiters"]),
            ("candidate", "Candidate", stats["candidates"]),
        ]
    )
    users_by_status = _build_chart_rows(
        [
            ("active", "Active", User.query.filter_by(status="active").count()),
            ("locked", "Locked", User.query.filter_by(status="locked").count()),
        ]
    )
    jobs_by_status = _build_chart_rows(
        [
            ("draft", "Draft", JobPosting.query.filter_by(status="draft").count()),
            ("published", "Published", JobPosting.query.filter_by(status="published").count()),
            ("closed", "Closed", JobPosting.query.filter_by(status="closed").count()),
        ]
    )
    applications_by_status = _build_chart_rows(
        [
            ("submitted", "Submitted", Application.query.filter_by(status="submitted").count()),
            ("reviewing", "Reviewing", Application.query.filter_by(status="reviewing").count()),
            ("interview", "Interview", Application.query.filter_by(status="interview").count()),
            ("accepted", "Accepted", Application.query.filter_by(status="accepted").count()),
            ("rejected", "Rejected", Application.query.filter_by(status="rejected").count()),
        ]
    )
    company_job_counts = (
        db.session.query(
            Company.id,
            Company.company_name,
            func.count(JobPosting.id).label("job_count"),
        )
        .outerjoin(JobPosting, JobPosting.company_id == Company.id)
        .group_by(Company.id)
        .order_by(func.count(JobPosting.id).desc(), Company.company_name.asc())
        .limit(6)
        .all()
    )
    top_companies = [
        {
            "name": name,
            "count": count,
            "percent": round((count / (company_job_counts[0].job_count or 1)) * 100, 1) if company_job_counts else 0,
        }
        for _, name, count in company_job_counts
    ]
    tag_job_distribution = _build_tag_job_rows()
    experience_level_distribution = _build_experience_level_rows()
    employment_type_distribution = _build_employment_type_rows()
    monthly_job_trend = _build_monthly_job_trend()
    return render_template(
        "admin/dashboard.html",
        stats=stats,
        recent_users=recent_users,
        recent_jobs=recent_jobs,
        recent_apps=recent_apps,
        recent_templates=recent_templates,
        charts={
            "tag_job_distribution": tag_job_distribution,
            "tag_job_donut": _build_donut_chart(tag_job_distribution),
            "experience_level_distribution": experience_level_distribution,
            "experience_level_donut": _build_donut_chart(experience_level_distribution),
            "employment_type_distribution": employment_type_distribution,
            "employment_type_donut": _build_donut_chart(employment_type_distribution),
            "monthly_job_trend": monthly_job_trend,
            "users_by_role": users_by_role,
            "users_by_status": users_by_status,
            "jobs_by_status": jobs_by_status,
            "applications_by_status": applications_by_status,
            "applications_by_status_donut": _build_donut_chart(applications_by_status),
            "top_companies": top_companies,
        },
    )


@admin_bp.route("/users", methods=["GET", "POST"])
@login_required
@admin_required
def users():
    edit_id = request.args.get("edit", type=int)
    edit_user = _load_user_or_none(edit_id)
    page = request.args.get("page", 1, type=int)
    per_page = 6

    if request.method == "POST":
        action = request.form.get("action", "save")
        user_id = _to_int(request.form.get("user_id"))
        user = _load_user_or_none(user_id)

        if action == "toggle" and user:
            if user.id == current_user.id:
                flash("KhÃ´ng thá»ƒ khÃ³a chÃ­nh tÃ i khoáº£n admin Ä‘ang Ä‘Äƒng nháº­p.", "error")
            else:
                user.status = "locked" if user.status == "active" else "active"
                _commit("ÄÃ£ cáº­p nháº­t tráº¡ng thÃ¡i tÃ i khoáº£n.")
            return redirect(url_for("admin.users", page=page))

        if action == "delete" and user:
            if user.id == current_user.id:
                flash("KhÃ´ng thá»ƒ xÃ³a chÃ­nh tÃ i khoáº£n admin Ä‘ang Ä‘Äƒng nháº­p.", "error")
            elif user.role == "admin" and User.query.filter_by(role="admin").count() <= 1:
                flash("Pháº£i giá»¯ láº¡i Ã­t nháº¥t má»™t tÃ i khoáº£n admin.", "error")
            else:
                db.session.delete(user)
                _commit("ÄÃ£ xÃ³a tÃ i khoáº£n.")
            return redirect(url_for("admin.users", page=page))

        full_name = request.form.get("full_name", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        role = request.form.get("role", "candidate").strip() or "candidate"
        status = request.form.get("status", "active").strip() or "active"
        phone = request.form.get("phone", "").strip() or None
        auth_method_preference = request.form.get("auth_method_preference", "password").strip() or "password"
        email_verified = _to_bool(request.form.get("email_verified"))
        avatar_file = request.files.get("avatar_file")

        if not full_name or not email or role not in ROLE_OPTIONS:
            flash("Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ tÃªn, email vÃ  vai trÃ².", "error")
            return redirect(url_for("admin.users", edit=user_id, page=page) if user_id else url_for("admin.users", page=page))

        existing = User.query.filter(User.email == email, User.id != (user.id if user else 0)).first()
        if existing:
            flash("Email nÃ y Ä‘Ã£ tá»“n táº¡i.", "error")
            return redirect(url_for("admin.users", edit=user.id if user else None, page=page))

        if user:
            user.full_name = full_name
            user.email = email
            user.role = role
            user.status = status if status in USER_STATUS_OPTIONS else user.status
            user.phone = phone
            user.auth_method_preference = auth_method_preference
            user.email_verified = email_verified
            avatar_url = _save_admin_avatar(avatar_file, user.id)
            if avatar_url:
                user.avatar_url = avatar_url
            if password:
                user.password_hash = hash_password(password)
            _commit("ÄÃ£ cáº­p nháº­t tÃ i khoáº£n.")
        else:
            if not password:
                flash("Máº­t kháº©u lÃ  báº¯t buá»™c khi táº¡o tÃ i khoáº£n.", "error")
                return redirect(url_for("admin.users", page=page))
            new_user = User(
                full_name=full_name,
                email=email,
                password_hash=hash_password(password),
                role=role,
                status=status if status in USER_STATUS_OPTIONS else "active",
                phone=phone,
                auth_method_preference=auth_method_preference,
                email_verified=email_verified,
            )
            db.session.add(new_user)
            db.session.flush()
            avatar_url = _save_admin_avatar(avatar_file, new_user.id)
            if avatar_url:
                new_user.avatar_url = avatar_url
            _commit("ÄÃ£ táº¡o tÃ i khoáº£n má»›i.")
        return redirect(url_for("admin.users", page=page))

    pagination = User.query.order_by(User.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    rows = pagination.items
    role_counts = {
        "admin": User.query.filter_by(role="admin").count(),
        "recruiter": User.query.filter_by(role="recruiter").count(),
        "candidate": User.query.filter_by(role="candidate").count(),
        "active": User.query.filter_by(status="active").count(),
        "locked": User.query.filter_by(status="locked").count(),
    }
    return render_template(
        "admin/users.html",
        users=rows,
        edit_user=edit_user,
        role_options=ROLE_OPTIONS,
        status_options=USER_STATUS_OPTIONS,
        total_users=pagination.total,
        role_counts=role_counts,
        pagination=pagination,
    )


@admin_bp.route("/resumes", methods=["GET", "POST"])
@login_required
@admin_required
def resumes():
    page = request.args.get("page", 1, type=int)
    view_id = request.args.get("view", type=int)
    q = request.args.get("q", "").strip()
    source_type = request.args.get("source_type", "").strip()
    primary_filter = request.args.get("primary", "").strip()
    role_filter = request.args.get("role", "").strip()
    per_page = 6

    if request.method == "POST":
        action = request.form.get("action", "").strip()
        resume_id = _to_int(request.form.get("resume_id"))
        resume = _load_resume_or_none(resume_id)

        if not resume:
            flash("Không tìm thấy hồ sơ CV.", "error")
            return redirect(url_for("admin.resumes", page=page, view=view_id))

        if action == "delete":
            was_primary = bool(resume.is_primary)
            user_id = resume.user_id
            _delete_resume_files(resume)
            db.session.delete(resume)
            db.session.flush()
            if was_primary:
                fallback = (
                    Resume.query.filter(Resume.user_id == user_id, Resume.id != resume_id)
                    .order_by(Resume.created_at.desc())
                    .first()
                )
                if fallback:
                    Resume.query.filter_by(user_id=user_id, is_primary=True).update({"is_primary": False})
                    fallback.is_primary = True
            _commit("Đã xóa hồ sơ CV.")
            return redirect(url_for("admin.resumes", page=page))

        if action == "primary":
            Resume.query.filter_by(user_id=resume.user_id, is_primary=True).update({"is_primary": False})
            resume.is_primary = True
            _commit("Đã đặt CV chính.")
            return redirect(url_for("admin.resumes", page=page, view=resume.id))

        flash("Hành động không hợp lệ.", "error")
        return redirect(url_for("admin.resumes", page=page, view=view_id))

    query = (
        Resume.query.options(
            joinedload(Resume.user).joinedload(User.candidate_profile),
            selectinload(Resume.tags),
            selectinload(Resume.applications),
            selectinload(Resume.match_scores),
        )
        .join(User)
    )

    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                Resume.title.ilike(like),
                Resume.template_name.ilike(like),
                Resume.original_filename.ilike(like),
                User.full_name.ilike(like),
                User.email.ilike(like),
            )
        )

    if source_type in {"manual", "upload", "generated"}:
        query = query.filter(Resume.source_type == source_type)

    if primary_filter == "primary":
        query = query.filter(Resume.is_primary.is_(True))
    elif primary_filter == "secondary":
        query = query.filter(Resume.is_primary.is_(False))

    if role_filter in ROLE_OPTIONS:
        query = query.filter(User.role == role_filter)

    pagination = query.order_by(Resume.is_primary.desc(), Resume.updated_at.desc()).paginate(
        page=page,
        per_page=per_page,
        error_out=False,
    )
    rows = pagination.items
    selected_resume = _load_resume_or_none(view_id) if view_id else None
    if selected_resume:
        selected_resume = (
            Resume.query.options(
                joinedload(Resume.user).joinedload(User.candidate_profile),
                selectinload(Resume.tags),
                selectinload(Resume.applications),
                selectinload(Resume.match_scores),
            )
            .filter_by(id=selected_resume.id)
            .first()
        )

    selected_json = ""
    if selected_resume:
        selected_json = json.dumps(selected_resume.structured_json or {}, ensure_ascii=False, indent=2)

    return render_template(
        "admin/resumes.html",
        resumes=rows,
        pagination=pagination,
        selected_resume=selected_resume,
        selected_json=selected_json,
        total_resumes=Resume.query.count(),
        primary_resumes=Resume.query.filter_by(is_primary=True).count(),
        manual_resumes=Resume.query.filter_by(source_type="manual").count(),
        upload_resumes=Resume.query.filter_by(source_type="upload").count(),
        candidate_resumes=db.session.query(func.count(func.distinct(Resume.user_id))).scalar() or 0,
        q=q,
        source_type=source_type,
        primary_filter=primary_filter,
        role_filter=role_filter,
        resume_source_options=["manual", "upload", "generated"],
        role_options=ROLE_OPTIONS,
    )


@admin_bp.route("/companies", methods=["GET", "POST"])
@login_required
@admin_required
def companies():
    edit_id = request.args.get("edit", type=int)
    edit_company = _load_company_or_none(edit_id)
    recruiters = _recruiter_choices()

    if request.method == "POST":
        action = request.form.get("action", "save")
        company_id = _to_int(request.form.get("company_id"))
        company = _load_company_or_none(company_id)

        if action == "delete" and company:
            db.session.delete(company)
            _commit("ÄÃ£ xÃ³a cÃ´ng ty.")
            return redirect(url_for("admin.companies"))

        recruiter_user_id = _to_int(request.form.get("recruiter_user_id"))
        company_name = request.form.get("company_name", "").strip()
        tax_code = request.form.get("tax_code", "").strip() or None
        website = request.form.get("website", "").strip() or None
        address = request.form.get("address", "").strip() or None
        description = request.form.get("description", "").strip() or None
        logo_url = request.form.get("logo_url", "").strip() or None
        industry = request.form.get("industry", "").strip() or None

        if not recruiter_user_id or not company_name:
            flash("Vui lÃ²ng chá»n recruiter vÃ  nháº­p tÃªn cÃ´ng ty.", "error")
            return redirect(url_for("admin.companies", edit=company_id) if company_id else url_for("admin.companies"))

        recruiter = _load_user_or_none(recruiter_user_id)
        if not recruiter or recruiter.role != "recruiter":
            flash("Recruiter khÃ´ng há»£p lá»‡.", "error")
            return redirect(url_for("admin.companies", edit=company_id) if company_id else url_for("admin.companies"))

        duplicate = Company.query.filter(Company.recruiter_user_id == recruiter_user_id, Company.id != (company.id if company else 0)).first()
        if duplicate:
            flash("Recruiter nÃ y Ä‘Ã£ cÃ³ cÃ´ng ty rá»“i.", "error")
            return redirect(url_for("admin.companies", edit=company.id if company else None))

        if company:
            company.recruiter_user_id = recruiter_user_id
            company.company_name = company_name
            company.tax_code = tax_code
            company.website = website
            company.address = address
            company.description = description
            company.logo_url = logo_url
            company.industry = industry
            _commit("ÄÃ£ cáº­p nháº­t cÃ´ng ty.")
        else:
            db.session.add(
                Company(
                    recruiter_user_id=recruiter_user_id,
                    company_name=company_name,
                    tax_code=tax_code,
                    website=website,
                    address=address,
                    description=description,
                    logo_url=logo_url,
                    industry=industry,
                )
            )
            _commit("ÄÃ£ táº¡o cÃ´ng ty má»›i.")
        return redirect(url_for("admin.companies"))

    rows = Company.query.order_by(Company.created_at.desc()).all()
    return render_template(
        "admin/companies.html",
        companies=rows,
        recruiters=recruiters,
        edit_company=edit_company,
        total_companies=len(rows),
    )


@admin_bp.route("/jobs", methods=["GET", "POST"])
@login_required
@admin_required
def jobs():
    edit_id = request.args.get("edit", type=int)
    edit_job = _load_job_or_none(edit_id)
    companies = _company_choices()
    tags = _tag_choices()
    filter_q = request.args.get("q", "").strip()
    filter_status = request.args.get("status", "").strip()
    filter_company_id = _to_int(request.args.get("company_id"))
    filter_tag_id = _to_int(request.args.get("tag_id"))
    filter_featured = request.args.get("featured", "").strip()

    if request.method == "POST":
        action = request.form.get("action", "save")
        job_id = _to_int(request.form.get("job_id"))
        job = _load_job_or_none(job_id)

        if action == "delete" and job:
            db.session.delete(job)
            _commit("ÄÃ£ xÃ³a job.")
            return redirect(url_for("admin.jobs"))

        company_id = _to_int(request.form.get("company_id"))
        company = _load_company_or_none(company_id)
        title = request.form.get("title", "").strip()
        slug_value = request.form.get("slug", "").strip()
        summary = request.form.get("summary", "").strip() or None
        description = request.form.get("description", "").strip()
        requirements = request.form.get("requirements", "").strip()
        responsibilities = request.form.get("responsibilities", "").strip() or None
        location = request.form.get("location", "").strip()
        workplace_type = request.form.get("workplace_type", "onsite").strip()
        employment_type = request.form.get("employment_type", "full-time").strip()
        experience_level = request.form.get("experience_level", "junior").strip()
        salary_currency = request.form.get("salary_currency", "VND").strip()
        salary_min = _to_int(request.form.get("salary_min"))
        salary_max = _to_int(request.form.get("salary_max"))
        vacancy_count = _to_int(request.form.get("vacancy_count"), 1) or 1
        deadline = _parse_date(request.form.get("deadline", "").strip())
        status = request.form.get("status", "draft").strip()
        is_featured = _to_bool(request.form.get("is_featured"))
        tag_ids = [_to_int(value) for value in request.form.getlist("tag_ids")]
        tag_ids = [value for value in tag_ids if value]

        if not company or not title or not description or not requirements or not location:
            flash("Vui lÃ²ng chá»n cÃ´ng ty vÃ  Ä‘iá»n cÃ¡c trÆ°á»ng báº¯t buá»™c.", "error")
            return redirect(url_for("admin.jobs", edit=job_id) if job_id else url_for("admin.jobs"))

        recruiter_user_id = company.recruiter_user_id
        slug_value = slug_value or slugify(title)
        if job:
            slug_conflict = JobPosting.query.filter(JobPosting.slug == slug_value, JobPosting.id != job.id).first()
        else:
            slug_conflict = JobPosting.query.filter_by(slug=slug_value).first()
        if slug_conflict:
            flash("Slug job Ä‘Ã£ tá»“n táº¡i.", "error")
            return redirect(url_for("admin.jobs", edit=job.id if job else None))

        if job:
            job.recruiter_user_id = recruiter_user_id
            job.company_id = company.id
            job.title = title
            job.slug = slug_value
            job.summary = summary
            job.description = description
            job.requirements = requirements
            job.responsibilities = responsibilities
            job.location = location
            job.workplace_type = workplace_type
            job.employment_type = employment_type
            job.experience_level = experience_level
            job.salary_min = salary_min
            job.salary_max = salary_max
            job.salary_currency = salary_currency
            job.vacancy_count = vacancy_count
            job.deadline = deadline
            job.status = status if status in JOB_STATUS_OPTIONS else job.status
            job.is_featured = is_featured
            job.tags = Tag.query.filter(Tag.id.in_(tag_ids)).all() if tag_ids else []
            if job.status == "published" and not job.published_at:
                job.published_at = datetime.utcnow()
            _commit("ÄÃ£ cáº­p nháº­t job.")
        else:
            job = JobPosting(
                recruiter_user_id=recruiter_user_id,
                company_id=company.id,
                title=title,
                slug=slug_value,
                summary=summary,
                description=description,
                requirements=requirements,
                responsibilities=responsibilities,
                location=location,
                workplace_type=workplace_type,
                employment_type=employment_type,
                experience_level=experience_level,
                salary_min=salary_min,
                salary_max=salary_max,
                salary_currency=salary_currency,
                vacancy_count=vacancy_count,
                deadline=deadline,
                status=status if status in JOB_STATUS_OPTIONS else "draft",
                is_featured=is_featured,
                published_at=datetime.utcnow() if status == "published" else None,
            )
            db.session.add(job)
            db.session.flush()
            job.tags = Tag.query.filter(Tag.id.in_(tag_ids)).all() if tag_ids else []
            _commit("ÄÃ£ táº¡o job má»›i.")
        return redirect(url_for("admin.jobs"))

    query = JobPosting.query.options(
        joinedload(JobPosting.company).joinedload(Company.recruiter),
        selectinload(JobPosting.tags),
    )
    if filter_q:
        like_q = f"%{filter_q}%"
        query = query.filter(
            or_(
                JobPosting.title.ilike(like_q),
                JobPosting.slug.ilike(like_q),
                JobPosting.location.ilike(like_q),
                JobPosting.summary.ilike(like_q),
                JobPosting.description.ilike(like_q),
            )
        )
    if filter_status in JOB_STATUS_OPTIONS:
        query = query.filter(JobPosting.status == filter_status)
    if filter_company_id:
        query = query.filter(JobPosting.company_id == filter_company_id)
    if filter_tag_id:
        query = query.join(JobPosting.tags).filter(Tag.id == filter_tag_id)
    if filter_featured == "1":
        query = query.filter(JobPosting.is_featured.is_(True))
    elif filter_featured == "0":
        query = query.filter(JobPosting.is_featured.is_(False))

    rows = query.order_by(JobPosting.created_at.desc()).distinct().all()
    return render_template(
        "admin/jobs.html",
        jobs=rows,
        companies=companies,
        tags=tags,
        edit_job=edit_job,
        job_status_options=JOB_STATUS_OPTIONS,
        total_jobs=len(rows),
        filter_q=filter_q,
        filter_status=filter_status,
        filter_company_id=filter_company_id,
        filter_tag_id=filter_tag_id,
        filter_featured=filter_featured,
    )


@admin_bp.route("/applications", methods=["GET", "POST"])
@login_required
@admin_required
def applications():
    edit_id = request.args.get("edit", type=int)
    edit_application = _load_application_or_none(edit_id)

    if request.method == "POST":
        action = request.form.get("action", "save")
        application_id = _to_int(request.form.get("application_id"))
        app_row = _load_application_or_none(application_id)

        if action == "delete" and app_row:
            db.session.delete(app_row)
            _commit("ÄÃ£ xÃ³a application.")
            return redirect(url_for("admin.applications"))

        if not app_row:
            flash("KhÃ´ng tÃ¬m tháº¥y há»“ sÆ¡ á»©ng tuyá»ƒn.", "error")
            return redirect(url_for("admin.applications"))

        status = request.form.get("status", app_row.status).strip()
        recruiter_note = request.form.get("recruiter_note", "").strip() or None
        app_row.status = status if status in APPLICATION_STATUS_OPTIONS else app_row.status
        app_row.recruiter_note = recruiter_note
        _commit("ÄÃ£ cáº­p nháº­t há»“ sÆ¡ á»©ng tuyá»ƒn.")
        return redirect(url_for("admin.applications"))

    rows = Application.query.order_by(Application.applied_at.desc()).all()
    return render_template(
        "admin/applications.html",
        applications=rows,
        edit_application=edit_application,
        application_status_options=APPLICATION_STATUS_OPTIONS,
        total_applications=len(rows),
    )


@admin_bp.route("/categories", methods=["GET", "POST"])
@login_required
@admin_required
def categories():
    edit_id = request.args.get("edit", type=int)
    edit_category = _load_category_or_none(edit_id)

    if request.method == "POST":
        action = request.form.get("action", "save")
        category_id = _to_int(request.form.get("category_id"))
        category = _load_category_or_none(category_id)

        if action == "delete" and category:
            db.session.delete(category)
            _commit("ÄÃ£ xÃ³a category.")
            return redirect(url_for("admin.categories"))

        if action == "toggle" and category:
            category.is_active = not bool(category.is_active)
            _commit("ÄÃ£ cáº­p nháº­t tráº¡ng thÃ¡i category.")
            return redirect(url_for("admin.categories"))

        name = request.form.get("name", "").strip()
        slug_value = request.form.get("slug", "").strip()
        description = request.form.get("description", "").strip() or None
        is_active = _to_bool(request.form.get("is_active"))
        slug_value = slug_value or slugify(name)
        if not name:
            flash("TÃªn category lÃ  báº¯t buá»™c.", "error")
            return redirect(url_for("admin.categories", edit=category.id if category else None))

        conflict = Category.query.filter(Category.slug == slug_value, Category.id != (category.id if category else 0)).first()
        if conflict:
            flash("Slug category Ä‘Ã£ tá»“n táº¡i.", "error")
            return redirect(url_for("admin.categories", edit=category.id if category else None))

        if category:
            category.name = name
            category.slug = slug_value
            category.description = description
            category.is_active = is_active
            _commit("ÄÃ£ cáº­p nháº­t category.")
        else:
            db.session.add(Category(name=name, slug=slug_value, description=description, is_active=is_active))
            _commit("ÄÃ£ táº¡o category má»›i.")
        return redirect(url_for("admin.categories"))

    rows = Category.query.order_by(Category.name.asc()).all()
    return render_template(
        "admin/categories.html",
        categories=rows,
        edit_category=edit_category,
        total_categories=len(rows),
    )


@admin_bp.route("/tags", methods=["GET", "POST"])
@login_required
@admin_required
def tags():
    edit_id = request.args.get("edit", type=int)
    edit_tag = _load_tag_or_none(edit_id)
    categories = _category_choices()

    if request.method == "POST":
        action = request.form.get("action", "save")
        tag_id = _to_int(request.form.get("tag_id"))
        tag = _load_tag_or_none(tag_id)

        if action == "delete" and tag:
            db.session.delete(tag)
            _commit("ÄÃ£ xÃ³a tag.")
            return redirect(url_for("admin.tags"))

        if action == "toggle" and tag:
            tag.is_active = not bool(tag.is_active)
            _commit("ÄÃ£ cáº­p nháº­t tráº¡ng thÃ¡i tag.")
            return redirect(url_for("admin.tags"))

        name = request.form.get("name", "").strip()
        slug_value = request.form.get("slug", "").strip()
        description = request.form.get("description", "").strip() or None
        category_id = _to_int(request.form.get("category_id"))
        is_active = _to_bool(request.form.get("is_active"))
        category = _load_category_or_none(category_id)

        if not name or not category:
            flash("Vui lÃ²ng nháº­p tÃªn tag vÃ  chá»n category.", "error")
            return redirect(url_for("admin.tags", edit=tag.id if tag else None))

        slug_value = slug_value or slugify(name)
        conflict = Tag.query.filter(Tag.slug == slug_value, Tag.id != (tag.id if tag else 0)).first()
        if conflict:
            flash("Slug tag Ä‘Ã£ tá»“n táº¡i.", "error")
            return redirect(url_for("admin.tags", edit=tag.id if tag else None))

        if tag:
            tag.name = name
            tag.slug = slug_value
            tag.description = description
            tag.category = category
            tag.is_active = is_active
            _commit("ÄÃ£ cáº­p nháº­t tag.")
        else:
            db.session.add(Tag(name=name, slug=slug_value, description=description, category=category, is_active=is_active))
            _commit("ÄÃ£ táº¡o tag má»›i.")
        return redirect(url_for("admin.tags"))

    rows = Tag.query.join(Tag.category).order_by(Category.name.asc(), Tag.name.asc()).all()
    return render_template(
        "admin/tags.html",
        tags=rows,
        categories=categories,
        edit_tag=edit_tag,
        total_tags=len(rows),
    )


@admin_bp.route("/cv-templates", methods=["GET", "POST"])
@login_required
@admin_required
def cv_templates():
    edit_id = request.args.get("edit", type=int)
    edit_template = _load_template_or_none(edit_id)

    if request.method == "POST":
        action = request.form.get("action", "save")
        template_id = _to_int(request.form.get("template_id"))
        template = _load_template_or_none(template_id)

        if action == "delete" and template:
            db.session.delete(template)
            _commit("ÄÃ£ xÃ³a template CV.")
            return redirect(url_for("admin.cv_templates"))

        if action == "toggle" and template:
            template.is_active = not bool(template.is_active)
            _commit("ÄÃ£ cáº­p nháº­t tráº¡ng thÃ¡i template.")
            return redirect(url_for("admin.cv_templates"))

        name = request.form.get("name", "").strip()
        slug_value = request.form.get("slug", "").strip()
        summary = request.form.get("summary", "").strip() or None
        description = request.form.get("description", "").strip() or None
        thumbnail_url = request.form.get("thumbnail_url", "").strip() or None
        preview_url = request.form.get("preview_url", "").strip() or None
        file_format = request.form.get("file_format", "both").strip() or "both"
        is_active = _to_bool(request.form.get("is_active"))
        slug_value = slug_value or slugify(name)

        if not name:
            flash("TÃªn template lÃ  báº¯t buá»™c.", "error")
            return redirect(url_for("admin.cv_templates", edit=template.id if template else None))

        if file_format not in FILE_FORMAT_OPTIONS:
            file_format = "both"

        conflict = CvTemplate.query.filter(CvTemplate.slug == slug_value, CvTemplate.id != (template.id if template else 0)).first()
        if conflict:
            flash("Slug template Ä‘Ã£ tá»“n táº¡i.", "error")
            return redirect(url_for("admin.cv_templates", edit=template.id if template else None))

        if template:
            template.name = name
            template.slug = slug_value
            template.summary = summary
            template.description = description
            template.thumbnail_url = thumbnail_url
            template.preview_url = preview_url
            template.file_format = file_format
            template.is_active = is_active
            _commit("ÄÃ£ cáº­p nháº­t template CV.")
        else:
            db.session.add(
                CvTemplate(
                    name=name,
                    slug=slug_value,
                    summary=summary,
                    description=description,
                    thumbnail_url=thumbnail_url,
                    preview_url=preview_url,
                    file_format=file_format,
                    is_active=is_active,
                )
            )
            _commit("ÄÃ£ táº¡o template CV má»›i.")
        return redirect(url_for("admin.cv_templates"))

    rows = CvTemplate.query.order_by(CvTemplate.created_at.desc()).all()
    return render_template(
        "admin/cv_templates.html",
        templates=rows,
        edit_template=edit_template,
        file_format_options=FILE_FORMAT_OPTIONS,
        total_templates=len(rows),
    )
