
from pydantic import BaseModel, ConfigDict, Field


class AboutMe(BaseModel):
    """Model for about me information."""
    greeting: str = Field(..., description="Greeting message")
    description: str = Field(..., description="Brief professional description")
    resume_summary: str | None = Field(None, description="Concise summary for the generated resume")
    aidetails: str = Field(..., description="AI assistant prompt")
    brief_bio: str = Field(..., description="Detailed biography")
    full_portrait: str = Field(..., description="Path to portrait image")
    resume_name: str = Field(..., description="Name of Resume File")
    primary_skills: list[str] = Field(..., description="Primary skills")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "greeting": "👋 Hi, I'm an engineer",
                "description": "With over 13 years of experience specializing in AI, Analytics, and Machine Learning",
                "aidetails": "Ask my ✨AI assistant below for more details about me.",
                "brief_bio": "I'm a software engineer with a deep curiosity for technology...",
                "full_portrait": "/images/headshot/headshot.webp",
                "resume_name": "JordanKailResume.pdf",
                "primary_skills": ["Python","JavaScript","SQL"]
            }
        }
    )
