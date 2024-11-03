import { create } from 'zustand';
import { ResumeData } from '../types';

interface ResumeState {
  resumeData: ResumeData | null;
  isLoading: boolean;
  error: string | null;
  setResumeData: (data: ResumeData) => void;
  setError: (error: string) => void;
  setLoading: (loading: boolean) => void;
  handleDownload: () => Promise<void>;
}

export const useResumeStore = create<ResumeState>((set) => ({
  resumeData: null,
  isLoading: true,
  error: null,
  setResumeData: (data: ResumeData) => set({ resumeData: data, isLoading: false }),
  setError: (error: string) => set({ error, isLoading: false }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  handleDownload: async () => {
    try {
      const response = await fetch('/api/resume');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resume.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading resume:', error);
    }
  }
}));
