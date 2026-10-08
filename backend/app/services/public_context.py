"""Allowlisted deployed portfolio facts; no private config, phone or chats."""
from __future__ import annotations

import json
from functools import cache
from typing import Any

from ..models.data_loader import DATA_DIR, load_aboutme, load_contact, load_experience, load_projects

PUBLIC_URL = "https://www.jckail.com"
SECTIONS = ("profile", "experience", "projects", "education", "skillGroups")


@cache
def public_context() -> dict[str, Any]:
    about = load_aboutme()
    contact = load_contact()
    raw_jobs = json.loads((DATA_DIR / "experience.json").read_text())
    experience = []
    for key, job in load_experience().root.items():
        raw = raw_jobs[key]
        experience.append({
            "id": key, "company": job.company, "title": raw.get("resume_title", job.title),
            "date": job.date, "location": raw.get("resume_location", job.location),
            "highlights": raw.get("resume_highlights", job.highlights),
            "url": str(job.link or ""), "technologies": job.tech_stack,
        })
    projects = [
        {"id": key, "title": project.title, "description": project.description,
         "url": str(project.link or ""), "technologies": project.tech_stack,
         "status": project.status, "contribution": project.contribution, "evidence": project.evidence,
         "categories": project.categories, "featured": project.featured, "maturityNote": project.maturity_note,
         "caseStudy": project.case_study.model_dump(mode="json") if project.case_study else None}
        for key, project in load_projects().root.items()
    ]
    education = json.loads((DATA_DIR / "education.json").read_text())["entries"]
    skills = json.loads((DATA_DIR / "resume_skills.json").read_text())["groups"]
    return {
        "profile": {"name": f"{contact.firstName} {contact.lastName}",
                    "title": contact.title, "summary": about.description,
                    "location": contact.location, "url": PUBLIC_URL,
                    "github": str(contact.github), "linkedin": str(contact.linkedin)},
        "experience": experience, "projects": projects,
        "education": [{k: row[k] for k in ("institution", "study", "date")} for row in education],
        "skillGroups": [{"name": row["label"], "items": row["items"]} for row in skills],
        "sources": {"website": PUBLIC_URL, "resume": f"{PUBLIC_URL}/resume.json",
                    "context": f"{PUBLIC_URL}/context.json", "mcp": f"{PUBLIC_URL}/mcp",
                    "graphql": f"{PUBLIC_URL}/graphql"},
    }
