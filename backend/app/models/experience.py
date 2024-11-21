from pydantic import BaseModel, HttpUrl, Field
from typing import List, Dict, Optional

class ExperienceHighlight(BaseModel):
    """Model for experience highlights with detailed information."""
    company: str = Field(..., description="Name of the company")
    title: str = Field(..., description="Job title")
    date: str = Field(..., description="Employment duration")
    location: str = Field(..., description="Job location")
    highlights: List[str] = Field(..., description="Key achievements and responsibilities")
    link: HttpUrl = Field(..., description="Company website URL")
    logoPath: str = Field(..., description="Path to company logo")
    company_description: str = Field(..., description="Brief description of the company")
    tech_stack: List[str] = Field(..., description="Technologies used")
    more_highlights: List[str] = Field(..., description="Detailed list of achievements and responsibilities")

class Experience(BaseModel):
    """Model for all professional experiences."""
    prove: ExperienceHighlight
    meta: ExperienceHighlight
    deloitte: ExperienceHighlight
    wide_open_west: ExperienceHighlight
    common_spirit_health: ExperienceHighlight
    acustream: ExperienceHighlight

    class Config:
        json_schema_extra = {
            "example": {
                "prove": {
                    "company": "Prove Identity",
                    "title": "Staff Data Engineer",
                    "date": "06/2023 - Present",
                    "location": "Denver, CO",
                    "highlights": [
                        "Spearheading company-wide refactor from on-prem Java + Oracle to cloud-based Go + Postgres"
                    ],
                    "link": "https://www.prove.com/",
                    "logoPath": "prove.svg",
                    "company_description": "Prove is the modern platform for consumer identity verification.",
                    "tech_stack": ["Airflow", "Spark", "PyTorch", "NLP", "Computer Vision"],
                    "more_highlights": [
                        "Spearheaded a company-wide migration from legacy Java/Oracle infrastructure"
                    ]
                }
            }
        }
