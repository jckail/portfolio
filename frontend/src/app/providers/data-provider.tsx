import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Skill } from '../components/sections/modals/SkillModal';
import type { ExperienceItem } from '../components/sections/modals/ExperienceModal';
import type { AboutMe, ProjectsData, Contact as ContactData } from '../../types/resume';

interface SkillsData {
  [key: string]: Skill;
}

interface ExperienceData {
  [key: string]: ExperienceItem;
}

interface DataContextType {
  experienceData: ExperienceData | null;
  skillsData: SkillsData | null;
  projectsData: ProjectsData | null;
  aboutMeData: AboutMe | null;
  contactData: ContactData | null;
  isLoading: boolean;
  error: string | null;
}

const DataContext = createContext<DataContextType | null>(null);

// Cache mechanism
const cache: {
  experience: ExperienceData | null;
  skills: SkillsData | null;
  projects: ProjectsData | null;
  aboutMe: AboutMe | null;
  contact: ContactData | null;
  lastFetchTime: number | null;
} = {
  experience: null,
  skills: null,
  projects: null,
  aboutMe: null,
  contact: null,
  lastFetchTime: null,
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<DataContextType>({
    experienceData: null,
    skillsData: null,
    projectsData: null,
    aboutMeData: null,
    contactData: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    const fetchAllData = async () => {
      try {
        // Check cache first
        const now = Date.now();
        if (cache.lastFetchTime && (now - cache.lastFetchTime < CACHE_DURATION)) {
          setState(prev => ({
            ...prev,
            experienceData: cache.experience,
            skillsData: cache.skills,
            projectsData: cache.projects,
            aboutMeData: cache.aboutMe,
            contactData: cache.contact,
            isLoading: false,
          }));
          return;
        }

        // Fetch all data in parallel
        const [experienceRes, skillsRes, projectsRes, aboutMeRes, contactRes] = await Promise.all([
          fetch('/api/experience', { 
            signal: controller.signal,
            headers: { 'Cache-Control': 'max-age=3600' }
          }),
          fetch('/api/skills', { 
            signal: controller.signal,
            headers: { 'Cache-Control': 'max-age=3600' }
          }),
          fetch('/api/projects', { 
            signal: controller.signal,
            headers: { 'Cache-Control': 'max-age=3600' }
          }),
          fetch('/api/aboutme', { 
            signal: controller.signal,
            headers: { 'Cache-Control': 'max-age=3600' }
          }),
          fetch('/api/contact', { 
            signal: controller.signal,
            headers: { 'Cache-Control': 'max-age=3600' }
          })
        ]);

        // Parse all responses in parallel
        const [experience, skills, projects, aboutMe, contact] = await Promise.all([
          experienceRes.json() as Promise<ExperienceData>,
          skillsRes.json() as Promise<SkillsData>,
          projectsRes.json() as Promise<ProjectsData>,
          aboutMeRes.json() as Promise<AboutMe>,
          contactRes.json() as Promise<ContactData>
        ]);

        // Update cache
        cache.experience = experience;
        cache.skills = skills;
        cache.projects = projects;
        cache.aboutMe = aboutMe;
        cache.contact = contact;
        cache.lastFetchTime = now;

        setState({
          experienceData: experience,
          skillsData: skills,
          projectsData: projects,
          aboutMeData: aboutMe,
          contactData: contact,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setState(prev => ({
            ...prev,
            error: err.message || 'Failed to fetch data',
            isLoading: false,
          }));
        }
      }
    };

    // Start fetching immediately
    fetchAllData();

    return () => controller.abort();
  }, []);

  return (
    <DataContext.Provider value={state}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
