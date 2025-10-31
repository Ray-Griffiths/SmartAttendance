# backend/app/middlewares/error_handler.py
from flask import jsonify
import traceback

def register_error_handlers(app):
    """Registers global error handlers for Flask app."""

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"error": "Bad Request"}), 400

    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({"error": "Unauthorized"}), 401

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({"error": "Forbidden"}), 403

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Not Found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({"error": "Method Not Allowed"}), 405

    @app.errorhandler(500)
    def internal_error(error):
        app.logger.error(f"Internal Server Error: {traceback.format_exc()}")
        return jsonify({"error": "Internal Server Error"}), 500

    # Optional: Catch *all* unhandled exceptions
    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        app.logger.error(f"Unexpected error: {traceback.format_exc()}")
        return jsonify({
            "error": "An unexpected error occurred",
        }), 500
