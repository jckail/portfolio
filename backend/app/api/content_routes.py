"""Public portfolio content: about me, skills, experience and projects.

Every response is pre-rendered (see ``content.py``); these handlers only pick
the payload. ``response_model`` stays declared for the OpenAPI schema.
"""
from fastapi import APIRouter, HTTPException, Request, Response

from ..models import AboutMe, ExperienceHighlight, ProjectDetail, SkillDetail
from .content import collection_payload, item_payloads, payload_response

router = APIRouter()


def _item_response(request: Request, collection: str, key: str, not_found: str) -> Response:
    # Keys are lowercase slugs; the lookup has always been case-insensitive.
    payload = item_payloads(collection).get(key.lower())
    if payload is None:
        raise HTTPException(status_code=404, detail=not_found)
    return payload_response(request, payload)


@router.get("/aboutme", response_model=AboutMe, tags=["aboutme"])
async def get_aboutme(request: Request) -> Response:
    return payload_response(request, collection_payload("aboutme"))


@router.get("/skills", response_model=dict[str, SkillDetail], tags=["skills"])
async def get_all_skills(request: Request) -> Response:
    return payload_response(request, collection_payload("skills"))


@router.get("/skills/{skill_name}", response_model=SkillDetail, tags=["skills"])
async def get_skill(request: Request, skill_name: str) -> Response:
    return _item_response(request, "skills", skill_name, "Skill not found")


@router.get("/experience", response_model=dict[str, ExperienceHighlight], tags=["experience"])
async def get_all_experience(request: Request) -> Response:
    return payload_response(request, collection_payload("experience"))


@router.get("/experience/{company_key}", response_model=ExperienceHighlight, tags=["experience"])
async def get_experience(request: Request, company_key: str) -> Response:
    return _item_response(request, "experience", company_key, "Experience not found")


@router.get("/projects", response_model=dict[str, ProjectDetail], tags=["projects"])
async def get_all_projects(request: Request) -> Response:
    return payload_response(request, collection_payload("projects"))


@router.get("/projects/{project_key}", response_model=ProjectDetail, tags=["projects"])
async def get_project(request: Request, project_key: str) -> Response:
    return _item_response(request, "projects", project_key, "Project not found")
