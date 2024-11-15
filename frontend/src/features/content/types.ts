export interface Project {
  title: string;
  description: string;
  description_detail: string;
  link: string;
  link2?: string;
  image?: string;
}

export interface Projects {
  [key: string]: Project;
}

export interface ResumeData {
  projects: Project[];
  // ... other resume data types if needed
}
