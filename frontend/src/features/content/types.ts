export interface Project {
  title: string;
  description: string;
  description_detail: string;
  link: string;
  link2?: string;
  logoPath?: string;
}

export interface ProjectsData {
  [key: string]: Project;
}

export interface Contact {
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone: string;
  website: string;
  location: string;
  country: string;
  github: string;
  linkedin: string;
}

export interface ResumeData {
  name: string;
  title: string;
  contact: Contact;
  projects: Project[];
  // ... other resume data types if needed
}


export interface AboutMe {
    greeting: string;
    description: string;
    aidetails:string;
    brief_bio: string;
    full_portrait:string;
}