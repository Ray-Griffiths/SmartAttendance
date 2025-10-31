# backend/services/geo_service.py
from geopy.distance import geodesic

def is_within_radius(student_location, session_location, radius_meters=100):
    """
    Check if a student's current location is within a certain radius (default 100m)
    of the session's recorded location.
    
    Args:
        student_location (dict): {"lat": float, "lng": float}
        session_location (dict): {"lat": float, "lng": float}
        radius_meters (int): Allowed distance in meters.

    Returns:
        bool: True if within radius, else False.
    """
    if not student_location or not session_location:
        return False

    try:
        student_coords = (student_location["lat"], student_location["lng"])
        session_coords = (session_location["lat"], session_location["lng"])
        distance = geodesic(student_coords, session_coords).meters
        return distance <= radius_meters
    except Exception:
        return False
