"""
Pytest configuration and shared fixtures for all tests
"""

import pytest
import os
from unittest.mock import patch, MagicMock

# Set testing environment before creating app
os.environ['FLASK_ENV'] = 'testing'


@pytest.fixture
def app():
    """Create Flask app for testing"""
    from backend.app import create_app
    from backend.core.extensions import db
    
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Create Flask test client"""
    return app.test_client()


@pytest.fixture
def app_context(app):
    """Push Flask app context for tests"""
    with app.app_context():
        yield app


@pytest.fixture
def db_session(app_context):
    """Provide database session for tests"""
    from backend.core.extensions import db
    
    session = db.session
    yield session
    session.rollback()
    session.close()
