import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ResumeData } from '../types';

interface ResumeState {
  resumeData: ResumeData | null;
  isLoading: boolean;
  error: string | null;
  setResumeData: (data: ResumeData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchResumeData: () => Promise<void>;
}

export const useResumeStore = create<ResumeState>()(
  devtools(
    (set) => ({
      resumeData: null,
      isLoading: false,
      error: null,

      setResumeData: (data) => 
        set({ resumeData: data }, false, 'resume/setData'),

      setLoading: (loading) => 
        set({ isLoading: loading }, false, 'resume/setLoading'),

      setError: (error) => 
        set({ error }, false, 'resume/setError'),

      fetchResumeData: async () => {
        set({ isLoading: true, error: null }, false, 'resume/fetchStart');
        
        try {
          const response = await fetch('/api/resume_data');
          if (!response.ok) {
            throw new Error('Failed to fetch resume data');
          }
          
          const data = await response.json();
          set(
            { resumeData: data, isLoading: false },
            false,
            'resume/fetchSuccess'
          );
        } catch (error) {
          set(
            { 
              error: error instanceof Error ? error.message : 'Failed to fetch resume data',
              isLoading: false 
            },
            false,
            'resume/fetchError'
          );
        }
      }
    }),
    { name: 'Resume Store' }
  )
);
