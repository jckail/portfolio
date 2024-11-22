from pydantic import BaseModel, Field
from typing import  List, Optional

class AboutMe(BaseModel):
    """Model for about me information."""
    greeting: str = Field(..., description="Greeting message")
    description: str = Field(..., description="Brief professional description")
    aidetails: str = Field(..., description="AI assistant prompt")
    brief_bio: str = Field(..., description="Detailed biography")
    full_portrait: str = Field(..., description="Path to portrait image")
    resume_name: str = Field(..., description="Name of Resume File")
    primary_skills: List[str] = Field(..., description="Primary skills")

    class Config:
        json_schema_extra = {
            "example": {
                "greeting": "👋 Hi, I'm an engineer",
                "description": "With over 12 years of experience specializing in AI, Analytics, and Machine Learning",
                "aidetails": "Ask my ✨AI assistant below for more details about me.",
                "brief_bio": "I'm a data engineer with a deep curiosity for technology...",
                "full_portrait": "/images/headshot/headshot.png",
                "resume_name": "JordanKailResume.pdf",
                "primary_skills": ["Python","JavaScript","SQL"]
            }
        }
