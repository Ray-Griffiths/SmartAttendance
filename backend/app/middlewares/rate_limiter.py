# app/middlewares/rate_limiter.py
import time
import threading
from flask import request, jsonify, current_app
from functools import wraps

# In-memory store for request timestamps per IP
rate_store = {}
lock = threading.Lock()

# Default rate limit settings (can be overridden in app.config)
DEFAULT_RATE_LIMIT = 60   # requests
DEFAULT_TIME_WINDOW = 60  # seconds

def rate_limiter(fn):
    """Rate limit decorator for Flask routes."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        # Get limits from config or defaults
        rate_limit = current_app.config.get("RATE_LIMIT", DEFAULT_RATE_LIMIT)
        time_window = current_app.config.get("TIME_WINDOW", DEFAULT_TIME_WINDOW)

        ip = request.remote_addr or "unknown"
        now = time.time()

        # Skip localhost or testing clients if desired
        if ip in ("127.0.0.1", "::1") and current_app.config.get("SKIP_RATE_LIMIT_LOCAL", True):
            return fn(*args, **kwargs)

        with lock:
            # Retrieve timestamps for this IP
            timestamps = rate_store.get(ip, [])
            # Keep only timestamps within the current window
            timestamps = [t for t in timestamps if now - t < time_window]

            if len(timestamps) >= rate_limit:
                return jsonify({
                    "error": "Rate limit exceeded",
                    "message": f"Max {rate_limit} requests per {time_window} seconds allowed."
                }), 429

            # Record new request
            timestamps.append(now)
            rate_store[ip] = timestamps

        return fn(*args, **kwargs)
    return wrapper
