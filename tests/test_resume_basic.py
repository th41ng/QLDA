import pytest
from unittest.mock import Mock
from backend.services import cv_service
from pathlib import Path


@pytest.mark.unit
class TestCVService:

    def test_save_file_success(self, tmp_path):
        class FakeFile:
            filename = "cv.pdf"
            mimetype = "application/pdf"

            def save(self, path):
                Path(path).write_bytes(b"PDF")

        filename, path, mime = cv_service.save_uploaded_file(
            FakeFile(),
            str(tmp_path),
            "resume-1"
        )

        assert Path(path).exists()
        assert mime == "application/pdf"

    def test_invalid_extension(self):
        assert not cv_service.allowed_resume_file("cv.txt")