
from pydantic import BaseModel, Field, HttpUrl, RootModel


class ExperienceHighlight(BaseModel):
    """Model for experience highlights with detailed information."""
    company: str = Field(..., description="Name of the company")
    title: str = Field(..., description="Job title")
    date: str = Field(..., description="Employment duration")
    location: str = Field(..., description="Job location")
    highlights: list[str] = Field(..., description="Key achievements and responsibilities")
    link: HttpUrl = Field(..., description="Company website URL")
    logoPath: str = Field(..., description="Path to company logo")
    company_description: str = Field(..., description="Brief description of the company")
    tech_stack: list[str] = Field(..., description="Technologies used")
    more_highlights: list[str] = Field(..., description="Detailed list of achievements and responsibilities")

class Experience(RootModel[dict[str, ExperienceHighlight]]):
    """All professional experiences, keyed by company slug.

    Keyed dynamically (like `Skills`) rather than with one field per employer,
    so adding or removing a job is a pure `experience.json` data change. JSON
    object order is preserved, and the frontend timeline renders in that order
    — newest role first.
    """

    class Config:
        json_schema_extra = {
            "example": {
                "together_ai": {
                    "company": "Together AI",
                    "title": "Staff Software Engineer",
                    "date": "02/2025 - Present",
                    "location": "San Francisco, CA",
                    "highlights": [
                        "Building the data platform and agent tooling behind an AI acceleration cloud"
                    ],
                    "link": "https://www.together.ai/",
                    "logoPath": "together.svg",
                    "company_description": "Together AI is an AI acceleration cloud.",
                    "tech_stack": ["python", "sql", "go", "kubernetes"],
                    "more_highlights": [
                        "Own core data platform services for inference, fine-tuning, and GPU cluster workloads"
                    ]
                }
            }
        }
