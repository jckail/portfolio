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
    last_commit: str = Field(..., description="Date of last commit")

class Projects(BaseModel):
    """Model for all projects."""
    ai_billing: ProjectDetail
    portfolio: ProjectDetail
    super_teacher: ProjectDetail
    data_playground: ProjectDetail
    go_pilot: ProjectDetail
    jobbr: ProjectDetail
    pointup: ProjectDetail
    qr_for_groups: ProjectDetail
    lit_crypto: ProjectDetail
    
    
    
    

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
                    "tech_stack": ["Python", "FastAPI", "Pydantic", "SQLAlchemy", "PostgreSQL"],
                    "last_commit": "November 2024"

                }
            }
        }
