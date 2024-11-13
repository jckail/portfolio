import { create } from 'zustand';

interface SectionState {
  currentSection: string;
  setCurrentSection: (section: string) => void;
}

export const useSectionStore = create<SectionState>((set) => ({
  currentSection: 'about',
  setCurrentSection: (section) => set({ currentSection: section }),
}));
