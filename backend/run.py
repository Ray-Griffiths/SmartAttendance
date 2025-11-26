#!/usr/bin/env python
"""
Entry point for running the SmartAttendance backend API.

Usage:
    python run.py

Environment variables:
    - FLASK_ENV: 'development' or 'production' (default: 'development')
    - HOST: Server host (default: '0.0.0.0')
    - PORT: Server port (default: 5000)
    - FLASK_DEBUG: Enable debug mode (default: 'True')
    - MONGO_URI: MongoDB connection URI
    - JWT_SECRET_KEY: Secret key for JWT tokens
"""

import os
import sys
from dotenv import load_dotenv

# Add the parent directory (repo root) to Python path so 'backend' can be imported
repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, repo_root)

load_dotenv()

from backend.app import create_app

if __name__ == "__main__":
    env = os.getenv("FLASK_ENV", "development")
    app = create_app(env)

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "True").lower() in ("true", "1", "yes")

    print(f"\n{'='*60}")
    print(f"🚀 Starting SmartAttendance API")
    print(f"{'='*60}")
    print(f"📍 Environment: {env}")
    print(f"🌐 Server: http://{host}:{port}")
    print(f"🔧 Debug Mode: {debug}")
    print(f"\n📚 API Endpoints:")
    print(f"   - Auth:     http://{host}:{port}/api/auth")
    print(f"   - Admin:    http://{host}:{port}/api/admin")
    print(f"   - Lecturer: http://{host}:{port}/api/lecturer")
    print(f"   - Student:  http://{host}:{port}/api/student")
    print(f"   - Logs:     http://{host}:{port}/api/logs")
    print(f"   - Health:   http://{host}:{port}/health")
    print(f"{'='*60}\n")

    try:
        app.run(host=host, port=port, debug=debug)
    except KeyboardInterrupt:
        print("\n\n❌ Server stopped by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error starting server: {e}")
        sys.exit(1)
