# backend/app/auth/auth_utils.py
import bcrypt
from flask_jwt_extended import create_access_token, create_refresh_token
from datetime import timedelta

# ================== Password Utilities ==================
def hash_password(password: str) -> str:
    """Hash a plain password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Check if password matches hash."""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

# ================== JWT Token Utilities ==================
def generate_tokens(user_id: str, role: str, access_expires_hours: int = 2):
    """
    Generate access and refresh JWT tokens.
    - user_id: str
    - role: str
    - access_expires_hours: duration of access token validity
    """
    access_token = create_access_token(
        identity=user_id,
        additional_claims={"role": role},
        expires_delta=timedelta(hours=access_expires_hours)
    )
    refresh_token = create_refresh_token(
        identity=user_id,
        additional_claims={"role": role}
    )
    return access_token, refresh_token
