import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

import { getJson, endpoints } from '../../shared/utils/api';
import { readBootstrapData } from '../../shared/utils/bootstrap-data';
import { toLookup } from '../../shared/utils/lookup';

import type {
  AboutMe,
  Contact as ContactData,
  ExperienceData,
  ProjectsData,
} from '../../types/resume';
import type { SkillsData } from '../../types/skills';

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

const LOADING_STATE: DataContextType = {
  experienceData: null,
  skillsData: null,
  projectsData: null,
  aboutMeData: null,
  contactData: null,
  isLoading: true,
  error: null,
};

/**
 * Ready state from the data the server inlined into index.html, or null.
 * Read once, synchronously, before the first render: the hero then paints in
 * the same frame the bundle runs instead of after the content API answers.
 */
function initialState(): DataContextType | null {
  const boot = readBootstrapData();
  if (!boot) return null;
  // The dictionaries looked up by URL params get no prototype (see
  // shared/utils/lookup); aboutMe/contact are only read by field.
  const experience = toLookup(boot.experience as unknown as ExperienceData);
  const skills = toLookup(boot.skills as unknown as SkillsData);
  const projects = toLookup(boot.projects as unknown as ProjectsData);
  const aboutMe = boot.aboutMe as unknown as AboutMe;
  const contact = boot.contact as unknown as ContactData;
  Object.assign(cache, { experience, skills, projects, aboutMe, contact, lastFetchTime: Date.now() });
  return {
    experienceData: experience,
    skillsData: skills,
    projectsData: projects,
    aboutMeData: aboutMe,
    contactData: contact,
    isLoading: false,
    error: null,
  };
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<DataContextType>(() => initialState() ?? LOADING_STATE);
  // Already populated from the inlined bootstrap block: nothing to fetch.
  const needsFetch = useRef(state.isLoading);

  useEffect(() => {
    if (!needsFetch.current) return;
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
        // prototype (see shared/utils/lookup); aboutMe/contact are only read by field.
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
