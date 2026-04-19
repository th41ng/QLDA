"""
Bootstrap Script - Create First Admin User

Usage:
    python bootstrap_admin.py

This script creates the first admin user in the system.
"""

import sys
from pathlib import Path

# Add the project root to the path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from backend.app import create_app
from backend.core.extensions import db
from backend.models import User
from backend.core.security import hash_password


def bootstrap_admin():
    """Create the first admin user"""
    app = create_app()
    
    with app.app_context():
        # Check if admin already exists
        existing_admin = User.query.filter_by(role="admin").first()
        if existing_admin:
            print("❌ Admin user already exists!")
            print(f"   Email: {existing_admin.email}")
            print(f"   Name: {existing_admin.full_name}")
            return False
        
        # Prompt user for admin details
        print("=== Admin Bootstrap ===")
        print("Tạo Admin user đầu tiên trong hệ thống\n")
        
        full_name = input("Full Name: ").strip()
        if not full_name:
            print("❌ Full name không được để trống!")
            return False
        
        email = input("Email: ").strip().lower()
        if not email:
            print("❌ Email không được để trống!")
            return False
        
        # Check if email already exists
        existing_email = User.query.filter_by(email=email).first()
        if existing_email:
            print(f"❌ Email '{email}' đã tồn tại!")
            return False
        
        password = input("Password (min 6 characters): ").strip()
        if len(password) < 6:
            print("❌ Password phải tối thiểu 6 ký tự!")
            return False
        
        confirm_password = input("Confirm Password: ").strip()
        if password != confirm_password:
            print("❌ Passwords không khớp!")
            return False
        
        # Create admin user
        try:
            admin = User(
                full_name=full_name,
                email=email,
                password_hash=hash_password(password),
                role="admin",
                status="active",
                email_verified=True,
            )
            db.session.add(admin)
            db.session.commit()
            
            print("\n✅ Admin user created successfully!")
            print(f"   ID: {admin.id}")
            print(f"   Email: {admin.email}")
            print(f"   Name: {admin.full_name}")
            print(f"\nBạn có thể đăng nhập tại /api/admin/login với email và password này.")
            return True
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Lỗi: {str(e)}")
            return False


if __name__ == "__main__":
    success = bootstrap_admin()
    sys.exit(0 if success else 1)
