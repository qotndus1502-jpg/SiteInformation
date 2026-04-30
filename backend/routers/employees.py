"""Employee + Team endpoints (public schema, separate from pmis).

These read from the legacy `Employee` / `Team` / `Location` tables — not the
project_site / org_member tables — so they live in their own router. Public
schema, default Supabase access. No auth (public read).
"""
import json
from typing import Optional

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from supabase_client import supabase

router = APIRouter()


@router.get("/api/employees")
async def get_employees(teamId: Optional[int] = Query(None)):
    """Get employees, optionally filtered by team."""
    query = supabase.from_("Employee").select("*")
    if teamId:
        query = query.eq("teamId", teamId)
    response = query.eq("status", "ACTIVE").execute()
    return response.data or []


@router.get("/api/employees/{employee_id}")
async def get_employee(employee_id: int):
    """Get single employee with team & location info."""
    emp = supabase.from_("Employee").select("*").eq("id", employee_id).single().execute()
    if not emp.data:
        return JSONResponse(status_code=404, content={"error": "Employee not found"})

    employee = emp.data
    # Get team info
    team = None
    if employee.get("teamId"):
        t = supabase.from_("Team").select("*").eq("id", employee["teamId"]).single().execute()
        team = t.data
    # Get location info
    location = None
    if team and team.get("locationId"):
        loc = supabase.from_("Location").select("*").eq("id", team["locationId"]).single().execute()
        location = loc.data

    # Parse resumeData JSON
    resume = {}
    if employee.get("resumeData"):
        try:
            resume = json.loads(employee["resumeData"])
        except Exception:
            pass

    return {
        "employee": employee,
        "team": team,
        "location": location,
        "resume": resume,
    }


@router.get("/api/teams")
async def get_teams():
    """Get all teams."""
    response = supabase.from_("Team").select("*").execute()
    return response.data or []


@router.get("/api/teams/{team_id}/members")
async def get_team_members(team_id: int):
    """Get all members of a team."""
    response = supabase.from_("Employee").select(
        "id,name,position,role,photoUrl,phone,email,status,jobCategory"
    ).eq("teamId", team_id).eq("status", "ACTIVE").execute()
    return response.data or []
