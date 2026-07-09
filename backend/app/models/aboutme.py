
from pydantic import BaseModel, Field


class OpenTo(BaseModel):
    """Optional recruiter-facing availability strip."""
    roles: str = Field(..., description="Roles currently open to")
    relocation: bool = Field(False, description="Open to relocation")
    travel: bool = Field(False, description="Open to travel")
    location: str = Field(..., description="Current base location")
    note: str = Field(..., description="Short availability note")


class AboutMe(BaseModel):
    """Model for about me information."""
    greeting: str = Field(..., description="Greeting message")
    description: str = Field(..., description="Brief professional description")
    aidetails: str = Field(..., description="AI assistant prompt")
    brief_bio: str = Field(..., description="Detailed biography")
    full_portrait: str = Field(..., description="Path to portrait image")
    resume_name: str = Field(..., description="Name of Resume File")
    primary_skills: list[str] = Field(..., description="Primary skills")
    open_to: OpenTo | None = Field(None, description="Optional availability CTA")

    class Config:
        json_schema_extra = {
            "example": {
                "greeting": "👋 Hi, I'm an engineer",
                "description": "With over 12 years of experience specializing in AI, Analytics, and Machine Learning",
                "aidetails": "Ask my ✨AI assistant below for more details about me.",
                "brief_bio": "I'm a software engineer with a deep curiosity for technology...",
                "full_portrait": "/images/headshot/headshot.webp",
                "resume_name": "JordanKailResume.pdf",
                "primary_skills": ["Python","JavaScript","SQL"],
                "open_to": {
                    "roles": "AI / data engineering roles",
                    "relocation": True,
                    "travel": True,
                    "location": "Denver, CO",
                    "note": "Open to remote, travel, or relocation.",
                },
            }
        }
