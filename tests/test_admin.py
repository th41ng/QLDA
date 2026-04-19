import pytest
import json
from datetime import datetime
from backend.app import create_app
from backend.core.extensions import db
from backend.models import User
from backend.core.security import hash_password


@pytest.fixture
def app():
    """Create and configure a test app instance"""
    app = create_app()
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """A test client for the app"""
    return app.test_client()


@pytest.fixture
def admin_user(app):
    """Create a test admin user"""
    with app.app_context():
        admin = User(
            full_name="Admin User",
            email="admin@test.com",
            password_hash=hash_password("password123"),
            role="admin",
            status="active",
            email_verified=True,
        )
        db.session.add(admin)
        db.session.commit()
        return admin


@pytest.fixture
def admin_token(app, admin_user):
    """Get JWT token for admin user"""
    from flask_jwt_extended import create_access_token
    
    with app.app_context():
        token = create_access_token(
            identity=str(admin_user.id),
            additional_claims={"role": "admin"}
        )
        return token


@pytest.fixture
def candidate_user(app):
    """Create a test candidate user"""
    with app.app_context():
        candidate = User(
            full_name="Candidate User",
            email="candidate@test.com",
            password_hash=hash_password("password123"),
            role="candidate",
            status="active",
            email_verified=True,
        )
        db.session.add(candidate)
        db.session.commit()
        return candidate


@pytest.fixture
def candidate_token(app, candidate_user):
    """Get JWT token for candidate user"""
    from flask_jwt_extended import create_access_token
    
    with app.app_context():
        token = create_access_token(
            identity=str(candidate_user.id),
            additional_claims={"role": "candidate"}
        )
        return token


class TestAdminLogin:
    """Test admin login endpoint"""
    
    def test_admin_login_success(self, client, admin_user):
        """Test successful admin login"""
        response = client.post(
            "/api/admin/login",
            json={
                "email": "admin@test.com",
                "password": "password123",
            }
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert "token" in data["data"]
        assert data["data"]["user"]["email"] == "admin@test.com"
        assert data["data"]["user"]["role"] == "admin"
    
    def test_admin_login_invalid_email(self, client):
        """Test login with non-existent email"""
        response = client.post(
            "/api/admin/login",
            json={
                "email": "nonexistent@test.com",
                "password": "password123",
            }
        )
        
        assert response.status_code == 401
        data = response.get_json()
        assert "error" in data
    
    def test_admin_login_invalid_password(self, client, admin_user):
        """Test login with incorrect password"""
        response = client.post(
            "/api/admin/login",
            json={
                "email": "admin@test.com",
                "password": "wrongpassword",
            }
        )
        
        assert response.status_code == 401
        data = response.get_json()
        assert "error" in data
    
    def test_admin_login_missing_email(self, client):
        """Test login without email"""
        response = client.post(
            "/api/admin/login",
            json={
                "password": "password123",
            }
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert "Email is required" in data["error"]
    
    def test_admin_login_missing_password(self, client):
        """Test login without password"""
        response = client.post(
            "/api/admin/login",
            json={
                "email": "admin@test.com",
            }
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert "Password is required" in data["error"]
    
    def test_admin_login_inactive_account(self, client, app):
        """Test login with inactive admin account"""
        with app.app_context():
            inactive_admin = User(
                full_name="Inactive Admin",
                email="inactive@test.com",
                password_hash=hash_password("password123"),
                role="admin",
                status="inactive",
                email_verified=True,
            )
            db.session.add(inactive_admin)
            db.session.commit()
        
        response = client.post(
            "/api/admin/login",
            json={
                "email": "inactive@test.com",
                "password": "password123",
            }
        )
        
        assert response.status_code == 403
        data = response.get_json()
        assert "inactive" in data["error"].lower()


class TestAdminCreate:
    """Test admin creation endpoint"""
    
    def test_create_admin_success(self, client, admin_token):
        """Test successful admin creation"""
        response = client.post(
            "/api/admin",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "full_name": "New Admin",
                "email": "newadmin@test.com",
                "password": "password123",
            }
        )
        
        assert response.status_code == 201
        data = response.get_json()
        assert data["data"]["email"] == "newadmin@test.com"
        assert data["data"]["role"] == "admin"
        assert data["data"]["status"] == "active"
    
    def test_create_admin_without_jwt(self, client):
        """Test admin creation without JWT token"""
        response = client.post(
            "/api/admin",
            json={
                "full_name": "New Admin",
                "email": "newadmin@test.com",
                "password": "password123",
            }
        )
        
        assert response.status_code == 401
    
    def test_create_admin_with_candidate_token(self, client, candidate_token):
        """Test admin creation with non-admin role"""
        response = client.post(
            "/api/admin",
            headers={"Authorization": f"Bearer {candidate_token}"},
            json={
                "full_name": "New Admin",
                "email": "newadmin@test.com",
                "password": "password123",
            }
        )
        
        assert response.status_code == 403
        data = response.get_json()
        assert "only admins" in data["error"].lower()
    
    def test_create_admin_duplicate_email(self, client, admin_token, admin_user):
        """Test admin creation with existing email"""
        response = client.post(
            "/api/admin",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "full_name": "Another Admin",
                "email": "admin@test.com",
                "password": "password123",
            }
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert "already exists" in data["error"].lower()
    
    def test_create_admin_missing_email(self, client, admin_token):
        """Test admin creation without email"""
        response = client.post(
            "/api/admin",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "full_name": "New Admin",
                "password": "password123",
            }
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert "email" in data["error"].lower()
    
    def test_create_admin_missing_full_name(self, client, admin_token):
        """Test admin creation without full name"""
        response = client.post(
            "/api/admin",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "email": "newadmin@test.com",
                "password": "password123",
            }
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert "full name" in data["error"].lower()
    
    def test_create_admin_weak_password(self, client, admin_token):
        """Test admin creation with weak password"""
        response = client.post(
            "/api/admin",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "full_name": "New Admin",
                "email": "newadmin@test.com",
                "password": "123",
            }
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert "6 characters" in data["error"].lower()


class TestAdminRead:
    """Test admin read endpoints"""
    
    def test_get_all_admins_success(self, client, app, admin_token):
        """Test getting all admins"""
        # Create additional admin
        with app.app_context():
            admin2 = User(
                full_name="Admin Two",
                email="admin2@test.com",
                password_hash=hash_password("password123"),
                role="admin",
                status="active",
            )
            db.session.add(admin2)
            db.session.commit()
        
        response = client.get(
            "/api/admin",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert len(data["data"]) >= 2
    
    def test_get_admin_by_id_success(self, client, admin_token, admin_user):
        """Test getting admin by ID"""
        response = client.get(
            f"/api/admin/{admin_user.id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["email"] == "admin@test.com"
        assert data["data"]["id"] == admin_user.id
    
    def test_get_admin_not_found(self, client, admin_token):
        """Test getting non-existent admin"""
        response = client.get(
            "/api/admin/9999",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 404
        data = response.get_json()
        assert "not found" in data["error"].lower()
    
    def test_get_admin_without_jwt(self, client, admin_user):
        """Test getting admin without JWT"""
        response = client.get(f"/api/admin/{admin_user.id}")
        
        assert response.status_code == 401
    
    def test_search_admins_success(self, client, admin_token):
        """Test searching admins"""
        response = client.get(
            "/api/admin/search/admin",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert len(data["data"]) >= 1
    
    def test_search_admins_by_email(self, client, admin_token):
        """Test searching admins by email"""
        response = client.get(
            "/api/admin/search/admin@test.com",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert len(data["data"]) == 1
        assert data["data"][0]["email"] == "admin@test.com"


class TestAdminUpdate:
    """Test admin update endpoint"""
    
    def test_update_admin_full_name(self, client, admin_token, admin_user):
        """Test updating admin full name"""
        response = client.put(
            f"/api/admin/{admin_user.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "full_name": "Updated Admin Name",
            }
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["full_name"] == "Updated Admin Name"
    
    def test_update_admin_email(self, client, admin_token, admin_user):
        """Test updating admin email"""
        response = client.put(
            f"/api/admin/{admin_user.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "email": "newemail@test.com",
            }
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["email"] == "newemail@test.com"
    
    def test_update_admin_status(self, client, admin_token, admin_user):
        """Test updating admin status"""
        response = client.put(
            f"/api/admin/{admin_user.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "status": "inactive",
            }
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["status"] == "inactive"
    
    def test_update_admin_password(self, client, admin_token, admin_user):
        """Test updating admin password"""
        response = client.put(
            f"/api/admin/{admin_user.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "password": "newpassword123",
            }
        )
        
        assert response.status_code == 200
        
        # Verify new password works for login
        login_response = client.post(
            "/api/admin/login",
            json={
                "email": "admin@test.com",
                "password": "newpassword123",
            }
        )
        assert login_response.status_code == 200
    
    def test_update_admin_not_found(self, client, admin_token):
        """Test updating non-existent admin"""
        response = client.put(
            "/api/admin/9999",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "full_name": "Updated Name",
            }
        )
        
        assert response.status_code == 400
    
    def test_update_admin_invalid_email(self, client, admin_token, admin_user, app):
        """Test updating admin with duplicate email"""
        # Create another admin
        with app.app_context():
            admin2 = User(
                full_name="Admin Two",
                email="admin2@test.com",
                password_hash=hash_password("password123"),
                role="admin",
                status="active",
            )
            db.session.add(admin2)
            db.session.commit()
            admin2_id = admin2.id
        
        # Try to update admin with admin2's email
        response = client.put(
            f"/api/admin/{admin_user.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "email": "admin2@test.com",
            }
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert "already exists" in data["error"].lower()
    
    def test_update_admin_invalid_status(self, client, admin_token, admin_user):
        """Test updating admin with invalid status"""
        response = client.put(
            f"/api/admin/{admin_user.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "status": "invalid_status",
            }
        )
        
        assert response.status_code == 400


class TestAdminDelete:
    """Test admin delete endpoint"""
    
    def test_delete_admin_success(self, client, admin_token, admin_user, app):
        """Test successful admin deletion"""
        # Create another admin to delete
        with app.app_context():
            admin2 = User(
                full_name="Admin Two",
                email="admin2@test.com",
                password_hash=hash_password("password123"),
                role="admin",
                status="active",
            )
            db.session.add(admin2)
            db.session.commit()
            admin2_id = admin2.id
        
        response = client.delete(
            f"/api/admin/{admin2_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        
        # Verify admin is deleted
        get_response = client.get(
            f"/api/admin/{admin2_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 404
    
    def test_delete_admin_not_found(self, client, admin_token):
        """Test deleting non-existent admin"""
        response = client.delete(
            "/api/admin/9999",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 404
    
    def test_delete_own_account(self, client, admin_token, admin_user):
        """Test admin cannot delete own account"""
        response = client.delete(
            f"/api/admin/{admin_user.id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert "delete your own account" in data["error"].lower()
    
    def test_delete_admin_without_jwt(self, client, admin_user):
        """Test delete without JWT token"""
        response = client.delete(f"/api/admin/{admin_user.id}")
        
        assert response.status_code == 401


class TestAdminChangePassword:
    """Test admin change password endpoint"""
    
    def test_change_password_success(self, client, admin_token, admin_user):
        """Test successful password change"""
        response = client.post(
            f"/api/admin/{admin_user.id}/change-password",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "old_password": "password123",
                "new_password": "newpassword456",
            }
        )
        
        assert response.status_code == 200
        
        # Verify old password doesn't work
        login_response = client.post(
            "/api/admin/login",
            json={
                "email": "admin@test.com",
                "password": "password123",
            }
        )
        assert login_response.status_code == 401
        
        # Verify new password works
        login_response = client.post(
            "/api/admin/login",
            json={
                "email": "admin@test.com",
                "password": "newpassword456",
            }
        )
        assert login_response.status_code == 200
    
    def test_change_password_wrong_old_password(self, client, admin_token, admin_user):
        """Test password change with wrong old password"""
        response = client.post(
            f"/api/admin/{admin_user.id}/change-password",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "old_password": "wrongpassword",
                "new_password": "newpassword456",
            }
        )
        
        assert response.status_code == 401
    
    def test_change_password_weak_new_password(self, client, admin_token, admin_user):
        """Test password change with weak new password"""
        response = client.post(
            f"/api/admin/{admin_user.id}/change-password",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "old_password": "password123",
                "new_password": "123",
            }
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert "6 characters" in data["error"].lower()


class TestAdminRoleAuthorization:
    """Test admin role authorization"""
    
    def test_candidate_cannot_create_admin(self, client, candidate_token):
        """Test candidate cannot create admin"""
        response = client.post(
            "/api/admin",
            headers={"Authorization": f"Bearer {candidate_token}"},
            json={
                "full_name": "New Admin",
                "email": "newadmin@test.com",
                "password": "password123",
            }
        )
        
        assert response.status_code == 403
    
    def test_candidate_cannot_list_admins(self, client, candidate_token):
        """Test candidate cannot list admins"""
        response = client.get(
            "/api/admin",
            headers={"Authorization": f"Bearer {candidate_token}"}
        )
        
        assert response.status_code == 403
    
    def test_candidate_cannot_delete_admin(self, client, candidate_token, admin_user):
        """Test candidate cannot delete admin"""
        response = client.delete(
            f"/api/admin/{admin_user.id}",
            headers={"Authorization": f"Bearer {candidate_token}"}
        )
        
        assert response.status_code == 403
    
    def test_unauthenticated_cannot_access_admin_endpoints(self, client):
        """Test unauthenticated users cannot access admin endpoints"""
        response = client.get("/api/admin")
        assert response.status_code == 401
        
        response = client.post(
            "/api/admin",
            json={
                "full_name": "New Admin",
                "email": "newadmin@test.com",
                "password": "password123",
            }
        )
        assert response.status_code == 401
