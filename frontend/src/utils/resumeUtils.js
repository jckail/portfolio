import { GA } from './google-analytics';
import { getApiUrl } from './apiUtils';

export const downloadResume = async (fileName = 'default_resume.pdf') => {
  try {
    console.info('Initiating resume download...');
    
    const apiUrl = getApiUrl();
    const downloadUrl = `${apiUrl}/resume`;

    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error('Download failed');
    }

    const blob = await response.blob();
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = fileName;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(downloadLink.href);

    // Track successful resume download
    GA.trackResumeDownload();
    console.info('Resume download completed successfully.');
  } catch (error) {
    console.error('Error during resume download:', error);
    alert('Failed to download the resume. Please try again later.');
  }
};
