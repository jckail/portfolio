export interface ResumeData {
  name: string;
  title: string;
  github: string;
  linkedin: string;
  aboutMe: string;
  contact: {
    email: string;
    phone: string;
    website: string;
    location: string;
    github: string;
    linkedin: string;
  };
  technicalSkills: {
    [category: string]: string[];
  };
  projects: {
    title: string;
    description: string;
    link: string;
    link2?: string;
    image?: string;  // Added optional image property
  }[];
}

export interface ResumeResponse {
  data: ResumeData;
  status: string;
  message?: string;
}
