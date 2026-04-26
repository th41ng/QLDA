from backend.core.services.cv_parser_service import parse_cv_to_structured


def test_parse_vietnamese_resume_sections():
    raw_text = """
Nguyen Van A
Backend Developer
Email: vana@example.com
So dien thoai: 0912 345 678
Dia chi: Ho Chi Minh

Muc tieu nghe nghiep
Xay dung he thong backend on dinh va de mo rong.

Kinh nghiem lam viec
ABC Company
Backend Developer 2021 - 2024
Phat trien API bang Python, Flask, PostgreSQL.

Hoc van
Dai hoc Mo TP.HCM
Cong nghe thong tin

Ky nang
Python, Flask, SQL, Docker, Git
"""

    parsed = parse_cv_to_structured(raw_text, {"full_name": "Fallback", "email": "fallback@example.com"})

    assert parsed["full_name"] == "Nguyen Van A"
    assert parsed["email"] == "vana@example.com"
    assert parsed["phone"] == "0912 345 678"
    assert parsed["address"] == "Ho Chi Minh"
    assert parsed["headline"] == "Backend Developer"
    assert "backend" in parsed["summary"].lower()
    assert "ABC Company" in parsed["experience"]
    assert "Dai hoc Mo" in parsed["education"]
    assert "Python" in parsed["skills"]


def test_parse_resume_without_section_headers_falls_back_to_summary():
    raw_text = "Jane Doe\nData Analyst\njane@example.com\nPython SQL Power BI"

    parsed = parse_cv_to_structured(raw_text)

    assert parsed["full_name"] == "Jane Doe"
    assert parsed["headline"] == "Data Analyst"
    assert parsed["email"] == "jane@example.com"
    assert "Python" in parsed["summary"]
    assert "python" in parsed["skills"]


def test_parse_repairs_character_fragmented_lines():
    raw_text = "\n".join(list("Tien MUC TIEU React KY NANG Python"))

    parsed = parse_cv_to_structured(raw_text)

    assert parsed["full_name"] == "Tien"
    assert parsed["summary"] == "React"
    assert parsed["skills"] == "Python"


def test_parse_repairs_pdf_character_stream_with_spaces_and_sections():
    raw_text = "\n".join(
        list("Đinh Bích Tiên")
        + list("MỤC TIÊU")
        + list("Sinh viên năm 4 muốn thực tập phát triển phần mềm.")
        + list("HỌC VẤN")
        + list("Trường Đại học Mở TP HCM 2022-2026")
        + list("KỸ NĂNG CHUYÊN MÔN")
        + list("Python, Java, ReactJS, MySQL")
        + list("DỰ ÁN HỌC TẬP")
        + list("Ứng dụng mobile chat Android Studio.")
    )

    parsed = parse_cv_to_structured(raw_text)

    assert parsed["full_name"] == "Đinh Bích Tiên"
    assert "thực tập" in parsed["summary"]
    assert "Đại học Mở" in parsed["education"]
    assert "Python" in parsed["skills"]
    assert "mobile chat" in parsed["experience"]


def test_parse_fixes_common_pdf_word_glue():
    raw_text = """
Nguyen Van A
Muc tieu
Mong muốn được thực tập trong lĩnh vực phát triểnphần mềm.
Hoc van
Trường Đại học mở TP HCM2022-Dự kiến 2026Sinh viên năm 4,Chuyên ngành Khoa học máy tínhGPA hiện tại: 3.18
Ky nang
Ngôn ngữ lập trìnhPython, Java, C++Mobile DevelopmentAndroid Studio (Java), React NativeWeb DevelopmentDjango/Flask (Backend), ReactJS (Frontend)APIThiết kế và triển khai RESTful APIDatabaseMySQL, Firebase
Du an hoc tap
Web Bán Vé Máy Bay 10/2024-11/2024Xây dựng web với Python Flask.Thiết kế chức năng tìm chuyến bay, đặt vé, thanh toán.
"""

    parsed = parse_cv_to_structured(raw_text)

    assert "phát triển phần mềm" in parsed["summary"]
    assert "TP HCM 2022" in parsed["education"]
    assert "Sinh viên năm 4" in parsed["education"]
    assert "Ngôn ngữ lập trình" in parsed["skills"]
    assert "Mobile Development" in parsed["skills"]
    assert "Android Studio" in parsed["skills"]
    assert "API\nThiết kế" in parsed["skills"]
    assert "Database\nMySQL" in parsed["skills"]
    assert "10/2024-11/2024\nXây dựng" in parsed["experience"]
