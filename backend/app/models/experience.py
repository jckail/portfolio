
from pydantic import BaseModel, ConfigDict, Field, HttpUrl, RootModel


class ExperiencePhoto(BaseModel):
    """One gallery image. `src` is a path under frontend/public/ (see docs/sabbatical-photos.md)."""
    src: str = Field(..., min_length=1, pattern=r"^/images/[A-Za-z0-9._/-]+$", description="Site-relative image path")
    alt: str = Field(..., min_length=1, description="Alternative text describing the image")
    caption: str | None = Field(None, description="Optional visible caption")


class ExperienceHighlight(BaseModel):
    """Model for experience highlights with detailed information."""
    company: str = Field(..., description="Name of the company")
    title: str = Field(..., description="Job title")
    date: str = Field(..., description="Employment duration")
    location: str = Field(..., description="Job location")
    highlights: list[str] = Field(..., description="Key achievements and responsibilities")
    link: HttpUrl | None = Field(None, description="Company website URL; omitted for entries with no company (a career break)")
    logoPath: str | None = Field(None, description="Path to company logo; omitted for entries with no company logo")
    company_description: str = Field(..., description="Brief description of the company")
    tech_stack: list[str] = Field(default_factory=list, description="Technologies used")
    more_highlights: list[str] = Field(..., description="Detailed list of achievements and responsibilities")
    resume_title: str | None = Field(
        None, description="Title the ATS resume (PDF, text, JSON Resume) uses instead of `title`, e.g. to label a career break"
    )
    resume_highlights: list[str] | None = Field(None, description="Concise achievements for the generated resume")
    resume_location: str | None = Field(None, description="Resume location override; empty omits the location")
    photos: list["ExperiencePhoto"] = Field(default_factory=list, description="Optional gallery shown in the role dialog")


class Experience(RootModel[dict[str, ExperienceHighlight]]):
    """All professional experiences, keyed by company slug.

    Keyed dynamically (like `Skills`) rather than with one field per employer,
    so adding or removing a job is a pure `experience.json` data change. JSON
    object order is preserved, and the frontend timeline renders in that order
    — newest role first.
    """

    model_config = ConfigDict(
        json_schema_extra={
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
    )
