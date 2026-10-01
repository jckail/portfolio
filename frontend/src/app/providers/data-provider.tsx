import React, { createContext, useContext, useEffect, useState } from 'react';

import { getJson, endpoints } from '../../shared/utils/api';

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

/**
 * Copy a JSON dictionary onto a null-prototype object.
 *
 * Sections index these maps with untrusted URL params (?skill=, ?project=,
 * ?company=). On a plain object `data['constructor']` or `data['__proto__']`
 * resolves through Object.prototype to something truthy, which mounted an
 * empty modal (or crashed the section). With no prototype, only keys the API
 * actually returned can match.
 */
export function toLookup<T extends object>(data: T): T {
  return Object.assign(Object.create(null) as T, data);
}

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

        // Fetch all data in parallel; getJson throws on any error status so
        // we never parse an error body and render garbage
        const init = { signal: controller.signal };
        const [experience, skills, projects, aboutMe, contact] = await Promise.all([
          getJson<ExperienceData>(endpoints.experience, init),
          getJson<SkillsData>(endpoints.skills, init),
          getJson<ProjectsData>(endpoints.projects, init),
          getJson<AboutMe>(endpoints.aboutMe, init),
          getJson<ContactData>(endpoints.contactInfo, init)
        ]);

        // Update cache. The dictionaries looked up by URL params get no
        // prototype (see toLookup); aboutMe/contact are only read by field.
        cache.experience = toLookup(experience);
        cache.skills = toLookup(skills);
        cache.projects = toLookup(projects);
        cache.aboutMe = aboutMe;
        cache.contact = contact;
        cache.lastFetchTime = now;

        setState({
          experienceData: cache.experience,
          skillsData: cache.skills,
          projectsData: cache.projects,
          aboutMeData: aboutMe,
          contactData: contact,
          isLoading: false,
          error: null,
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setState(prev => ({
            ...prev,
            error: err instanceof Error ? err.message : 'Failed to fetch data',
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
