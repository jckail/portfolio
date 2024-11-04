import React from 'react';
import { ResumeData } from '../types';

interface ResumeProps {
  resumeData: ResumeData;
}

// This component is now deprecated in favor of MainContent
const Resume: React.FC<ResumeProps> = () => {
  return null;
};

export default Resume;
