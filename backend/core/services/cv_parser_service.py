import re
import unicodedata
from typing import Optional


SECTION_KEYWORDS = {
    "summary": (
        "summary",
        "profile",
        "objective",
        "career objective",
        "professional summary",
        "tom tat",
        "muc tieu",
        "muc tieu nghe nghiep",
        "gioi thieu",
    ),
    "experience": (
        "experience",
        "work experience",
        "employment history",
        "professional experience",
        "projects",
        "personal projects",
        "kinh nghiem",
        "kinh nghiem lam viec",
        "qua trinh lam viec",
        "cong viec",
        "du an",
        "du an hoc tap",
    ),
    "education": (
        "education",
        "academic background",
        "hoc van",
        "trinh do",
        "trinh do hoc van",
        "qua trinh hoc tap",
    ),
    "skills": (
        "skills",
        "technical skills",
        "core skills",
        "expertise",
        "ky nang",
        "ki nang",
        "ky nang mem",
        "ki nang mem",
        "ky nang chuyen mon",
        "ki nang chuyen mon",
        "ky nang chuyen mon",
        "chuyen mon",
    ),
    "additional_info": (
        "projects",
        "certifications",
        "awards",
        "activities",
        "chung chi",
        "giai thuong",
        "hoat dong",
        "thong tin them",
    ),
}

SECTION_LABELS = tuple(label for labels in SECTION_KEYWORDS.values() for label in labels)


def _normalize(text: str) -> str:
    value = unicodedata.normalize("NFD", str(text or ""))
    value = "".join(char for char in value if unicodedata.category(char) != "Mn")
    value = value.replace("Đ", "D").replace("đ", "d")
    value = re.sub(r"[^a-zA-Z0-9+#./\s-]", " ", value)
    return re.sub(r"\s+", " ", value).strip().lower()


def _repair_fragmented_lines(text: str) -> str:
    """Join PDF-extracted text fragments where every character was put on its own line."""
    normalized_text = str(text or "").replace("\r\n", "\n")
    all_lines = normalized_text.splitlines()
    all_meaningful_lines = [line for line in all_lines if line.strip()]
    if all_meaningful_lines:
        all_lengths = [len(re.sub(r"\s+", "", line)) for line in all_meaningful_lines]
        all_short_ratio = sum(1 for length in all_lengths if length <= 2) / len(all_lengths)
        all_average_length = sum(all_lengths) / len(all_lengths)
        if len(all_meaningful_lines) >= 10 and all_short_ratio >= 0.75 and all_average_length <= 2:
            return "".join(all_lines).strip()

    paragraphs = re.split(r"\n[ \t]*\n", normalized_text)
    repaired = []

    for paragraph in paragraphs:
        raw_lines = paragraph.splitlines()
        meaningful_lines = [line for line in raw_lines if line.strip()]
        if not meaningful_lines:
            continue

        lengths = [len(re.sub(r"\s+", "", line)) for line in meaningful_lines]
        short_ratio = sum(1 for length in lengths if length <= 2) / max(len(lengths), 1)
        average_length = sum(lengths) / max(len(lengths), 1)

        if len(meaningful_lines) >= 4 and short_ratio >= 0.75 and average_length <= 2:
            first_line = meaningful_lines[0].strip()
            if any(_normalize(first_line).startswith(label) for label in SECTION_LABELS):
                remaining = raw_lines[1:]
                repaired.append(f"{first_line}\n{''.join(remaining).strip()}")
                continue
            repaired.append("".join(raw_lines).strip())
        else:
            repaired.append("\n".join(line.strip() for line in meaningful_lines))

    return "\n\n".join(repaired)


def _insert_section_breaks(text: str) -> str:
    accented_headers = (
        "THÔNG TIN CÁ NHÂN",
        "HỌC VẤN",
        "MỤC TIÊU",
        "MỤC TIÊU NGHỀ NGHIỆP",
        "KỸ NĂNG",
        "KĨ NĂNG",
        "KỸ NĂNG MỀM",
        "KĨ NĂNG MỀM",
        "KỸ NĂNG CHUYÊN MÔN",
        "KĨ NĂNG CHUYÊN MÔN",
        "KỸ NĂNG CHUYÊN",
        "KĨ NĂNG CHUYÊN",
        "DỰ ÁN",
        "DỰ ÁN HỌC TẬP",
        "KINH NGHIỆM",
        "KINH NGHIỆM LÀM VIỆC",
    )
    ascii_headers = sorted(set(SECTION_LABELS + ("thong tin ca nhan",)), key=len, reverse=True)
    accented_headers = sorted(set(accented_headers), key=len, reverse=True)
    value = str(text or "")
    for header in accented_headers:
        pattern = r"(" + r"\s+".join(re.escape(part) for part in header.split()) + r")"
        value = re.sub(pattern, r"\n\1\n", value)
    for header in ascii_headers:
        pattern = r"(?<!\w)(" + r"\s+".join(re.escape(part) for part in header.split()) + r")(?!\w)"
        value = re.sub(pattern, r"\n\1\n", value, flags=re.IGNORECASE)
    return re.sub(r"\n{3,}", "\n\n", value).strip()


def _clean_text(text: str, limit: int | None = None) -> str:
    value = _repair_fragmented_lines(text)
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value).strip()
    return value[:limit].strip() if limit else value


def _clean_text_without_repair(text: str) -> str:
    value = re.sub(r"[ \t]+", " ", str(text or "").replace("\r\n", "\n"))
    return re.sub(r"\n{3,}", "\n\n", value).strip()


def _fix_glued_text(text: str) -> str:
    value = str(text or "")
    if not value:
        return ""

    # Generic glue fixes caused by PDF text streams losing visual spacing.
    value = re.sub(r"([a-zà-ỹ])([A-ZĐ])", r"\1 \2", value)
    value = re.sub(r"([A-Za-zÀ-ỹ])(\d{2}/\d{4})", r"\1 \2", value)
    value = re.sub(r"([A-Za-zÀ-ỹ])((?:19|20)\d{2})", r"\1 \2", value)
    value = re.sub(r"((?:19|20)\d{2})([A-Za-zÀ-ỹ])", r"\1 \2", value)
    value = re.sub(r"([.!?])([A-ZÀ-ỸĐ])", r"\1 \2", value)
    value = re.sub(r"([,;:])([A-Za-zÀ-ỹĐ])", r"\1 \2", value)
    value = re.sub(r"([a-zà-ỹ])(\()", r"\1 \2", value)
    value = re.sub(r"(\))([A-Za-zÀ-ỹĐ])", r"\1 \2", value)

    phrase_fixes = {
        "phát triểnphần": "phát triển phần",
        "kỹnăng": "kỹ năng",
        "antoàn": "an toàn",
        "chấmcông": "chấm công",
        "xuấtbảng": "xuất bảng",
        "thống kêtheo": "thống kê theo",
        "dự ánTư": "dự án\nTư",
        "phân tíchTiếng": "phân tích\nTiếng",
        "lập trìnhPython": "lập trình\nPython",
        "DevelopmentAndroid": "Development\nAndroid",
        "DevelopmentDjango": "Development\nDjango",
        "Frontend)API": "Frontend)\nAPI",
        "APIDatabase": "API\nDatabase",
        "FirebaseDỰ": "Firebase\nDỰ",
        "CHAT10/": "CHAT\n10/",
        "VIÊN10/": "VIÊN\n10/",
        "Bay\xa010/": "Bay\n10/",
        "My SQL": "MySQL",
        "React JS": "ReactJS",
        "MỀ M": "MỀM",
        "HỌ C TẬ P": "HỌC TẬP",
        "Ứ NG DỤ NG": "ỨNG DỤNG",
        "HỆ THỐ NG": "HỆ THỐNG",
        "QUẢ N LÝ": "QUẢN LÝ",
        "Đ IỂ M": "ĐIỂM",
        "LUYỆ N": "LUYỆN",
        "Web\nQuản": "Web Quản",
        "Nhân Viên7/": "Nhân Viên\n7/",
    }
    for old, new in phrase_fixes.items():
        value = value.replace(old, new)

    line_markers = (
        "Ngôn ngữ lập trình",
        "Mobile Development",
        "Web Development",
        "Database",
        "ỨNG DỤNG",
        "HỆ THỐNG",
        "Web Bán",
        "Web Quản",
        "Web Chấm",
        "Phát triển",
        "Tích hợp",
        "Thiết kế",
        "Xây dựng",
        "Sử dụng",
        "Sinh viên",
        "Chuyên ngành",
        "GPA",
        "Đã đạt",
    )
    for marker in line_markers:
        value = re.sub(rf"(?<!^)(?<!\n)({re.escape(marker)})", r"\n\1", value)

    value = re.sub(r"(?<!\n)(\d{2}/\d{4}\s*-\s*\d{2}/\d{4})", r"\n\1", value)
    value = re.sub(r"(\d{2}/\d{4}\s*-\s*\d{2}/\d{4})([A-Za-zÀ-ỹĐ])", r"\1\n\2", value)
    value = value.replace("Web\nQuản", "Web Quản")
    value = value.replace("Database MySQL", "Database\nMySQL")
    value = re.sub(r"\n{3,}", "\n\n", value)
    value = re.sub(r"[ \t]{2,}", " ", value)
    return value.strip()


def _clean_section_value(text: str, limit: int | None = None) -> str:
    value = _fix_glued_text(_clean_text(text))
    noise_labels = {
        "mem",
        "me m",
        "chuyen",
        "hoc tap",
        "ho c ta p",
        "chuyen mon",
        "thong tin ca nhan",
    }
    lines = []
    for line in value.splitlines():
        line = line.strip()
        if not line:
            continue
        if _normalize(line).strip(":.- ") in noise_labels:
            continue
        lines.append(line)
    value = _clean_text("\n".join(lines))
    return value[:limit].strip() if limit else value


def extract_email(text: str) -> Optional[str]:
    match = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.(?:com|vn|net|org|edu|io|co)(?:\.vn)?", text or "", re.IGNORECASE)
    return match.group(0) if match else None


def extract_phone(text: str) -> Optional[str]:
    patterns = [
        r"(?:\+84|84|0)(?:[\s.\-]?\d){8,10}",
        r"\b0\d{1,2}[\s.\-]?\d{3,4}[\s.\-]?\d{3,4}\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text or "")
        if match:
            return re.sub(r"\s+", " ", match.group(0)).strip()
    return None


def _line_has_section_label(line: str) -> bool:
    normalized = _normalize(line).strip(":.- ")
    return any(label in normalized for label in SECTION_LABELS)


def extract_name(text: str) -> Optional[str]:
    lines = [line.strip() for line in str(text or "").splitlines() if line.strip()]
    for line in lines[:8]:
        normalized_line = _normalize(line)
        for marker in ("thuc tap", "intern", "developer", "engineer", "designer", "analyst", "manager"):
            marker_index = normalized_line.find(marker)
            if marker_index > 3:
                line = line[:marker_index].strip()
                normalized_line = _normalize(line)
                break
        normalized = _normalize(line)
        if not (3 < len(line) < 80):
            continue
        if "@" in line or re.search(r"(?:\+84|84|0)(?:[\s.\-]?\d){8,10}", line):
            continue
        if _line_has_section_label(line):
            continue
        if any(token in normalized for token in ("curriculum vitae", "resume", "cv ")):
            continue
        if len(re.findall(r"[A-Za-z]", normalized)) < 3:
            continue
        return line
    return None


def _detect_section(line: str) -> Optional[str]:
    normalized = _normalize(line).strip(":.- ")
    if not normalized or len(normalized) > 90:
        return None

    for section, labels in SECTION_KEYWORDS.items():
        for label in labels:
            if normalized == label or normalized.startswith(f"{label}:") or normalized.startswith(f"{label} "):
                return section
    return None


def split_by_section_keywords(text: str) -> dict:
    sections = {
        "headline": "",
        "summary": "",
        "experience": "",
        "education": "",
        "skills": "",
        "additional_info": "",
    }

    current_section = None
    buckets = {key: [] for key in sections}

    for raw_line in str(text or "").splitlines():
        line = raw_line.strip()
        if not line:
            if current_section:
                buckets[current_section].append("")
            continue

        detected = _detect_section(line)
        if detected:
            current_section = detected
            inline_content = re.sub(r"^[^:]{1,80}:\s*", "", line).strip()
            if inline_content and _normalize(inline_content) != _normalize(line):
                buckets[current_section].append(inline_content)
            continue

        if current_section:
            buckets[current_section].append(line)

    for section, lines in buckets.items():
        sections[section] = _clean_text("\n".join(lines))

    if not any(sections.values()):
        sections["summary"] = _clean_text(text, 700)

    return sections


def extract_headline(text: str, full_name: str = "") -> Optional[str]:
    title_keywords = (
        "developer",
        "engineer",
        "manager",
        "designer",
        "analyst",
        "specialist",
        "coordinator",
        "executive",
        "intern",
        "tester",
        "accountant",
        "marketing",
        "sales",
        "nhan vien",
        "chuyen vien",
        "ky su",
        "lap trinh",
        "phan tich",
        "thiet ke",
    )
    skipped_name = _normalize(full_name)
    for line in [item.strip() for item in str(text or "").splitlines()[:12] if item.strip()]:
        normalized = _normalize(line)
        if normalized == skipped_name or "@" in line or _line_has_section_label(line):
            continue
        if re.search(r"(?:\+84|84|0)(?:[\s.\-]?\d){8,10}", line):
            continue
        words = line.split()
        if 1 <= len(words) <= 8 and len(line) < 90 and any(keyword in normalized for keyword in title_keywords):
            return line
    return None


def extract_skills(text: str, sections: dict) -> Optional[str]:
    skills_section = sections.get("skills", "")
    if skills_section:
        return _clean_text(skills_section, 700)

    skill_keywords = [
        "python",
        "javascript",
        "typescript",
        "java",
        "c++",
        "react",
        "vue",
        "angular",
        "node",
        "sql",
        "mysql",
        "postgresql",
        "mongodb",
        "git",
        "docker",
        "kubernetes",
        "aws",
        "gcp",
        "azure",
        "figma",
        "photoshop",
        "excel",
        "power bi",
        "communication",
        "leadership",
        "teamwork",
        "problem solving",
    ]
    normalized = _normalize(text)
    found_skills = [skill for skill in skill_keywords if re.search(rf"\b{re.escape(skill)}\b", normalized)]
    return ", ".join(found_skills) if found_skills else None


def extract_labeled_value(text: str, labels: tuple[str, ...]) -> Optional[str]:
    for line in str(text or "").splitlines():
        normalized = _normalize(line)
        for label in labels:
            if normalized.startswith(label):
                value = re.sub(r"^[^:：-]{1,40}[:：-]\s*", "", line).strip()
                if value and _normalize(value) != normalized:
                    return value
    return None


def estimate_years_experience(text: str) -> int:
    normalized = _normalize(text)
    matches = re.findall(r"(\d{1,2})\s*(?:\+?\s*)?(?:years?|nam)\s*(?:experience|kinh nghiem)?", normalized)
    if matches:
        return max(int(match) for match in matches)
    years = [int(year) for year in re.findall(r"\b(20\d{2}|19\d{2})\b", normalized)]
    if len(years) >= 2:
        return max(0, min(40, max(years) - min(years)))
    return 0


def parse_cv_to_structured(raw_text: str, user_data: dict = None) -> dict:
    user_data = user_data or {}
    text = _clean_text_without_repair(raw_text)
    repaired_text = _insert_section_breaks(_clean_text(raw_text))

    sections = split_by_section_keywords(repaired_text)
    full_name = extract_name(repaired_text) or user_data.get("full_name", "")
    headline = extract_headline(repaired_text, full_name) or ""
    skills = extract_skills(repaired_text, sections) or ""

    structured = {
        "full_name": full_name,
        "email": extract_email(repaired_text) or user_data.get("email", ""),
        "phone": extract_phone(repaired_text) or user_data.get("phone", ""),
        "headline": headline,
        "summary": _clean_section_value(sections.get("summary", ""), 700),
        "experience": _clean_section_value(sections.get("experience", ""), 2000),
        "education": _clean_section_value(sections.get("education", ""), 1000),
        "skills": _clean_section_value(skills, 1000),
        "additional_info": _clean_section_value(sections.get("additional_info", ""), 700),
        "dob": extract_labeled_value(repaired_text, ("dob", "date of birth", "ngay sinh")),
        "gender": extract_labeled_value(repaired_text, ("gender", "gioi tinh")),
        "address": extract_labeled_value(repaired_text, ("address", "dia chi")),
        "current_title": headline,
        "years_experience": estimate_years_experience(sections.get("experience", "") or repaired_text),
        "expected_salary": None,
        "desired_location": None,
    }

    return structured
