import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration"""
    SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'dev-secret-key')
    
    # MongoDB
    MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/smartattendance')
    
    # JWT Settings
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', SECRET_KEY)
    # Explicitly define token location for flask_jwt_extended
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(seconds=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 3600)))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(seconds=int(os.getenv('JWT_REFRESH_TOKEN_EXPIRES', 2592000)))
    
    # CORS Settings (allow the local dev frontend by default)
    # Safely split and strip whitespace
    _cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173')
    CORS_ORIGINS = [origin.strip() for origin in _cors_origins.split(',') if origin.strip()]
    
    # Mail Settings
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
    
    # QR Code
    # FIXED: Backend runs on 5000, not 8000
    QR_BASE_URL = os.getenv('QR_BASE_URL', 'http://127.0.0.1:5000/api/attendance/scan')
    QR_CODE_EXPIRY_MINUTES = int(os.getenv('QR_CODE_EXPIRY_MINUTES', 10))

    # Optional: Allow overriding via env for flexibility
    HOST = os.getenv('HOST', '127.0.0.1')
    PORT = int(os.getenv('PORT', 5000))


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    # Ensure dev origins are always included
    CORS_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'] + [
        origin for origin in Config.CORS_ORIGINS
        if origin not in ['http://localhost:5173', 'http://127.0.0.1:5173']
    ]


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    # In production, require explicit origins — never allow '*'
    _prod_origins = os.getenv('CORS_ORIGINS', '')
    CORS_ORIGINS = [origin.strip() for origin in _prod_origins.split(',') if origin.strip()]
    if not CORS_ORIGINS:
        raise ValueError("CORS_ORIGINS must be set in production (comma-separated list)")


# Config mapping
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}