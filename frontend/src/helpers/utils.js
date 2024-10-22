import { trackResumeButtonClick } from '../utils/google-analytics';

export const scrollToSection = (sectionId, headerHeight, updateUrl = true) => {
  const targetElement = document.getElementById(sectionId);
  if (targetElement) {
    const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
    window.scrollTo({
      top: targetPosition - headerHeight,
      behavior: 'smooth'
    });
    if (updateUrl) {
      window.history.pushState(null, '', `#${sectionId}`);
    }
  }
};

const isLocalHost = (hostname) => {
  const localHostRegex = /^(localhost|0.0.0.0|127.0.0.1|192\.168\.0\.(122|128|134))$/;
  return localHostRegex.test(hostname);
};

export const getApiUrl = () => {
  const currentHost = window.location.hostname;
  const isLocal = isLocalHost(currentHost);
  const protocol = isLocal ? 'http' : 'https';
  const port = isLocal ? ':8080' : '';
  const apiUrl = `${protocol}://${currentHost}${port}/api`;

  return apiUrl;
};

export const fetchResumeName = async () => {
  try {
    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/resume_file_name`);

    if (!response.ok) {
      throw new Error(`Failed to fetch resume name: ${response.statusText}`);
    }

    const { resumeFileName = 'default_resume.pdf' } = await response.json();
    return resumeFileName;
  } catch (error) {
    console.error('Error fetching resume name:', error);
    return 'default_resume.pdf';
  }
};

export const downloadResume = async () => {
  try {
    console.info('Initiating resume download...');
    
    // Track resume download event
    trackResumeButtonClick();

    const [apiUrl, fileName] = await Promise.all([getApiUrl(), fetchResumeName()]);
    const downloadUrl = `${apiUrl}/resume`;

    const downloadLink = document.createElement('a');
    downloadLink.href = downloadUrl;
    downloadLink.download = fileName;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    console.info('Resume download completed successfully.');
  } catch (error) {
    console.error('Error during resume download:', error);
    alert('Failed to download the resume. Please try again later.');
  }
}
