from __future__ import annotations

import importlib
from pathlib import Path

from werkzeug.utils import secure_filename


ALLOWED_RESUME_EXTENSIONS = {".pdf", ".doc", ".docx"}


def allowed_resume_file(filename: str) -> bool:
	return Path(filename or "").suffix.lower() in ALLOWED_RESUME_EXTENSIONS


def save_uploaded_file(file_storage, upload_folder: str, file_stem: str):
	target_dir = Path(upload_folder)
	target_dir.mkdir(parents=True, exist_ok=True)

	suffix = Path(file_storage.filename or "").suffix.lower() or ".bin"
	filename = secure_filename(f"{file_stem}{suffix}")
	target_path = target_dir / filename
	file_storage.save(target_path)

	mime_type = getattr(file_storage, "mimetype", None) or "application/octet-stream"
	return filename, str(target_path), mime_type


def extract_text_from_upload(path: str) -> str:
	file_path = Path(path)
	if not file_path.exists():
		return ""

	suffix = file_path.suffix.lower()
	if suffix == ".pdf":
		text_parts = []
		try:
			PdfReader = importlib.import_module("pypdf").PdfReader

			reader = PdfReader(str(file_path))
			for page in reader.pages:
				text_parts.append(page.extract_text() or "")
		except Exception:
			return ""
		return "\n".join([part.strip() for part in text_parts if part.strip()])

	if suffix in {".doc", ".docx"}:
		# Parsing binary .doc reliably requires extra dependencies; keep a safe fallback.
		return ""

	try:
		return file_path.read_text(encoding="utf-8", errors="ignore")
	except Exception:
		return ""


def _resume_lines(data: dict) -> list[str]:
	return [
		f"Ho ten: {data.get('full_name') or ''}",
		f"Tieu de: {data.get('headline') or data.get('current_title') or ''}",
		f"Email: {data.get('email') or ''}",
		f"Dien thoai: {data.get('phone') or ''}",
		f"Dia chi: {data.get('address') or ''}",
		"",
		"Tom tat:",
		str(data.get("summary") or ""),
		"",
		"Ky nang:",
		str(data.get("skills") or ""),
		"",
		"Kinh nghiem:",
		str(data.get("experience") or ""),
		"",
		"Hoc van:",
		str(data.get("education") or ""),
	]


def generate_pdf_from_resume(data: dict, output_path: str):
	path = Path(output_path)
	path.parent.mkdir(parents=True, exist_ok=True)

	try:
		A4 = importlib.import_module("reportlab.lib.pagesizes").A4
		canvas = importlib.import_module("reportlab.pdfgen.canvas")

		pdf = canvas.Canvas(str(path), pagesize=A4)
		y = 800
		for raw_line in _resume_lines(data):
			line = (raw_line or "").strip()
			pdf.drawString(40, y, line)
			y -= 18
			if y < 50:
				pdf.showPage()
				y = 800
		pdf.save()
	except Exception:
		path.write_text("\n".join(_resume_lines(data)), encoding="utf-8")


def generate_docx_from_resume(data: dict, output_path: str):
	path = Path(output_path)
	path.parent.mkdir(parents=True, exist_ok=True)

	try:
		Document = importlib.import_module("docx").Document

		doc = Document()
		for line in _resume_lines(data):
			doc.add_paragraph(line)
		doc.save(str(path))
	except Exception:
		path.write_text("\n".join(_resume_lines(data)), encoding="utf-8")
