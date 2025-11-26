# app/__init__.py
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_pymongo import PyMongo
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_sock import Sock
from dotenv import load_dotenv

from .config.settings import config
from .database import init_db

load_dotenv()

# Extensions (initialized later)
jwt = JWTManager()
mail = Mail()
sock = Sock()

def create_app(config_name='development'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # ---------- DB ----------
    init_db(app)

    # ---------- Extensions ----------
    jwt.init_app(app)
    mail.init_app(app)
    sock.init_app(app)

    # ---------- CORS ----------
    allowed_origins = app.config.get('CORS_ORIGINS', ['*'])
    if app.config['DEBUG']:
        # Force dev origin
        dev_origins = ['http://localhost:5173', 'http://127.0.0.1:5173']
        if isinstance(allowed_origins, list):
            allowed_origins = dev_origins + allowed_origins
        else:
            allowed_origins = dev_origins

    CORS(
        app,
        resources={r"/*": {"origins": allowed_origins}},
        supports_credentials=True,
        expose_headers=["Content-Type", "Authorization"],
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"]
    )

    # ---------- Preflight ----------
    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS":
            resp = jsonify({})
            origin = request.headers.get("Origin")
            if origin in allowed_origins or "*" in allowed_origins:
                resp.headers.add("Access-Control-Allow-Origin", origin)
            resp.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With")
            resp.headers.add("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
            return resp

    # ---------- Blueprints ----------
    from .routes.auth_routes import auth_bp
    from .routes.student_routes import student_bp
    from .routes.lecturer_routes import lecturer_bp
    from .routes.lecturer_routes import lecturer_bp, register_lecturer_ws
    from .routes.admin_routes import admin_bp, register_admin_ws
    from .routes.log_routes import log_bp

    # Blueprints already define their own `url_prefix` inside their modules.
    # Register them without an extra prefix to avoid doubling paths
    app.register_blueprint(auth_bp)
    app.register_blueprint(student_bp)
    app.register_blueprint(lecturer_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(log_bp)
    
    # Register WebSocket routes
    register_admin_ws(sock)
    register_lecturer_ws(sock)

    # ---------- Health ----------
    @app.route('/')
    def index():
        return {'message': 'SmartAttendance API', 'version': '1.0.0'}

    @app.route('/health')
    def health():
        return {'status': 'healthy'}

    return app
