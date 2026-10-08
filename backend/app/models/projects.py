
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, RootModel, UrlConstraints

ProjectCategory = Literal["agents", "infrastructure", "data", "devtools", "knowledge", "experimental"]
ProjectStatus = Literal["Live", "Prototype", "In Development", "Employer Work", "Archived"]
EvidenceUrl = Annotated[HttpUrl, UrlConstraints(allowed_schemes=["https"])]


class CaseDecision(BaseModel):
    decision: str
    tradeoff: str
    evidence_url: EvidenceUrl | None = None


class CaseChallenge(BaseModel):
    challenge: str
    resolution: str


class CaseOutcome(BaseModel):
    statement: str
    source_url: EvidenceUrl | None = None


class CaseEvidence(BaseModel):
    label: str
    url: EvidenceUrl


class ProjectCaseStudy(BaseModel):
    problem: str = ""
    role: str = ""
    constraints: list[str] = Field(default_factory=list)
    architecture: str = ""
    decisions: list[CaseDecision] = Field(default_factory=list)
    challenges: list[CaseChallenge] = Field(default_factory=list)
    outcomes: list[CaseOutcome] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    evidence_links: list[CaseEvidence] = Field(default_factory=list)


class ProjectDetail(BaseModel):
    """Model for individual project details."""
    status: ProjectStatus = "Prototype"
    categories: list[ProjectCategory] = Field(default_factory=list)
    featured: bool = False
    maturity_note: str = ""
    case_study: ProjectCaseStudy | None = None
    contribution: str = ""
    evidence: str = ""
    title: str = Field(..., description="Project title")
    description: str = Field(..., description="Brief project description")
    resume_description: str | None = Field(None, description="Concise description for the generated resume")
    link: HttpUrl = Field(..., description="Primary project link")
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
