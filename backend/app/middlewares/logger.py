# backend/app/middlewares/logger.py
import logging
from flask import request
import json
import time

def setup_logging(app):
    """Configure app-wide logging and attach request/response logs."""

    # Configure global logging format
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s"
    )

    @app.before_request
    def log_request():
        request.start_time = time.time()  # track request duration
        try:
            body = request.get_json(silent=True)
        except Exception:
            body = None

        logging.info(
            f"➡️  REQUEST: {request.method} {request.path} "
            f"| Params: {dict(request.args)} "
            f"| Body: {json.dumps(body) if body else '{}'}"
        )

    @app.after_request
    def log_response(response):
        duration = (time.time() - getattr(request, 'start_time', time.time())) * 1000
        logging.info(
            f"⬅️  RESPONSE: {request.method} {request.path} "
            f"| Status: {response.status_code} "
            f"| Duration: {duration:.2f}ms"
        )
        return response

    @app.teardown_request
    def log_teardown(exception):
        """Log teardown errors (e.g., exceptions that bypass Flask’s handlers)."""
        if exception:
            logging.error(f"💥 ERROR during {request.method} {request.path}: {exception}")
