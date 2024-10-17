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

export const getApiUrl = () => {
  const currentHost = window.location.hostname;

  if (currentHost === 'localhost' || currentHost === '127.0.0.1' || currentHost === '192.168.0.122') {
    return `http://${currentHost}:8080`; // Use the current hostname for local development
  } else {
    // For production, you might want to use an environment variable
    return import.meta.env.VITE_API_URL || 'https://your-production-api-url.com';
  }
};

export const downloadResume = () => {
  const downloadUrl = '/JordanKailResume.pdf';
  const downloadLink = document.createElement('a');
  downloadLink.href = downloadUrl;
  downloadLink.download = 'JordanKailResume.pdf';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
};
