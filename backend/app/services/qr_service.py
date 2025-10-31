# backend/services/qr_service.py
import qrcode
import io
import base64
import uuid
import os

def generate_qr_code(data: str):
    """
    Generate a base64-encoded QR code for a given data string.

    Returns:
        dict: {"uuid": str, "qr_code_base64": str}
    """
    qr_uuid = str(uuid.uuid4())
    qr_data = f"{data}/{qr_uuid}"

    qr_img = qrcode.make(qr_data)
    buffer = io.BytesIO()
    qr_img.save(buffer, format="PNG")

    return {
        "uuid": qr_uuid,
        "qr_code_base64": base64.b64encode(buffer.getvalue()).decode("utf-8")
    }

def get_qr_base_url():
    """Return the base URL for QR scan endpoints."""
    return os.getenv("QR_BASE_URL", "http://localhost:5000/api/attendance/scan")
