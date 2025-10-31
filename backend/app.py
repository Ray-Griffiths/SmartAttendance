import os
from dotenv import load_dotenv
from app import create_app

load_dotenv()

app = create_app(os.getenv('FLASK_ENV', 'development'))

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "True").lower() in ("true", "1", "yes")

    print(f"🚀 Starting SmartAttendance API on {host}:{port}")
    print(f"📍 API Endpoints:")
    print(f"   - Auth: http://{host}:{port}/api/auth")
    print(f"   - Admin: http://{host}:{port}/api/admin")
    print(f"   - Lecturer: http://{host}:{port}/api/lecturer")
    print(f"   - Student: http://{host}:{port}/api/student")
    print(f"   - Logs: http://{host}:{port}/api/logs")
    print(f"🔧 Debug Mode: {debug}")
    
    app.run(host=host, port=port, debug=debug)