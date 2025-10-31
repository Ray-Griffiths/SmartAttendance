# backend/app/middlewares/__init__.py
from backend.app.middlewares.error_handler import register_error_handlers
from backend.app.middlewares.logger import setup_logging

def init_middlewares(app):
    """
    Initialize all middlewares for the Flask app.
    This should be called inside app/__init__.py after creating the Flask instance.
    """
    setup_logging(app)
    register_error_handlers(app)
