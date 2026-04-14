from flask import Blueprint, request

from . import json_error, json_ok
from ..repositories import get_job_by_id, list_jobs
from .serializers import job_to_dict

api_jobs_bp = Blueprint("api_jobs", __name__)


@api_jobs_bp.get("")
def list_jobs_route():
    jobs = list_jobs(request.args)
    return json_ok([job_to_dict(job) for job in jobs])


@api_jobs_bp.get("/<int:job_id>")
def job_detail(job_id):
    job = get_job_by_id(job_id)
    if not job:
        return json_error("Job not found.", 404)
    return json_ok(job_to_dict(job))
