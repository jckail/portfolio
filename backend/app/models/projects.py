
from pydantic import BaseModel, ConfigDict, Field, HttpUrl, RootModel


class ProjectDetail(BaseModel):
    """Model for individual project details."""
    title: str = Field(..., description="Project title")
    description: str = Field(..., description="Brief project description")
    link: HttpUrl | None = Field(None, description="Public primary project link, when available")
    link_label: str = Field("View project", description="Label for the primary link button")
    link2: HttpUrl | None = Field(None, description="Secondary project link (optional)")
    link2_label: str = Field("Live demo", description="Label for the secondary link button")
    description_detail: str = Field(..., description="Detailed project description")
    logoPath: str = Field(..., description="Path to project logo")
    # Optional: not every project has a publishable stack (the Facebook QR
    # feature is a shipped product, not an open repo).
    tech_stack: list[str] = Field(default_factory=list, description="List of technologies used in the project")
    last_commit: str = Field(..., description="Date of last commit")

class Projects(RootModel[dict[str, ProjectDetail]]):
    """All projects, keyed by project slug.

    Keyed dynamically (like `Skills` and `Experience`) rather than with one
    field per project, so adding or removing a project is a pure
    `projects.json` change. This also makes display order follow JSON order:
    with one field per project, `model_dump()` emitted them in *field
    declaration* order, so the JSON file's ordering was silently ignored.
    """





    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "super_teacher": {
                    "title": "Super Teacher",
                    "description": "An AI app that helps teachers create personalized lesson plans",
                    "link": "https://github.com/jckail/superteacher",
                    "link2": "https://www.the-super-teacher.com/",
                    "description_detail": "Developed Super Teacher, an AI-powered web application...",
                    "logoPath": "super-teacher.svg",
                    "tech_stack": ["Python", "FastAPI", "Pydantic", "SQLAlchemy", "PostgreSQL"],
                    "last_commit": "November 2024"

                }
            }
        }
    )
