from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, List

class ProjectDetail(BaseModel):
    """Model for individual project details."""
    title: str = Field(..., description="Project title")
    description: str = Field(..., description="Brief project description")
    link: HttpUrl = Field(..., description="Primary project link")
    link2: Optional[HttpUrl] = Field(None, description="Secondary project link (optional)")
    description_detail: str = Field(..., description="Detailed project description")
    logoPath: str = Field(..., description="Path to project logo")
    tech_stack: List[str] = Field(..., description="List of technologies used in the project")

class Projects(BaseModel):
    """Model for all projects."""
    super_teacher: ProjectDetail
    qr_for_groups: ProjectDetail
    jobbr: ProjectDetail
    pointup: ProjectDetail
    lit_crypto: ProjectDetail
    go_pilot: ProjectDetail
    data_playground: ProjectDetail
    portfolio: ProjectDetail

    class Config:
        json_schema_extra = {
            "example": {
                "super_teacher": {
                    "title": "Super Teacher",
                    "description": "An AI app that helps teachers create personalized lesson plans",
                    "link": "https://github.com/jckail/superteacher",
                    "link2": "https://www.the-super-teacher.com/",
                    "description_detail": "Developed Super Teacher, an AI-powered web application...",
                    "logoPath": "super-teacher.svg",
                    "tech_stack": ["Python", "FastAPI", "Pydantic", "SQLAlchemy", "PostgreSQL"]
                }
            }
        }
