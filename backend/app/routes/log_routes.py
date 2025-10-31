from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from datetime import datetime
from backend.app.database import mongo
from backend.app.middlewares.role_required import role_required

log_bp = Blueprint("log_bp", __name__, url_prefix="/api/logs")

@log_bp.route("/", methods=["GET"])
@jwt_required()
@role_required(["admin"])
def get_logs():
    """Get system logs (Admin only)"""
    # Get query parameters
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 50, type=int)
    log_type = request.args.get('type')
    user_filter = request.args.get('user')
    
    # Build query
    query = {}
    if log_type:
        query['type'] = log_type
    if user_filter:
        query['user'] = {'$regex': user_filter, '$options': 'i'}
    
    # Get total count
    total = mongo.db.system_logs.count_documents(query)
    
    # Get paginated logs
    logs = mongo.db.system_logs.find(query)\
        .sort("created_at", -1)\
        .skip((page - 1) * limit)\
        .limit(limit)
    
    logs_list = []
    for log in logs:
        logs_list.append({
            "id": str(log["_id"]),
            "user": log.get("user"),
            "action": log.get("action"),
            "type": log.get("type"),
            "date": log.get("created_at").isoformat() if log.get("created_at") else None
        })
    
    return jsonify({
        "logs": logs_list,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": (total + limit - 1) // limit
        }
    }), 200

@log_bp.route("/types", methods=["GET"])
@jwt_required()
@role_required(["admin"])
def get_log_types():
    """Get available log types"""
    types = mongo.db.system_logs.distinct("type")
    return jsonify({"types": types}), 200