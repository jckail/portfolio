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
  return import.meta.env.VITE_API_URL || 'http://localhost:8000';
};

export const downloadResume = (apiUrl) => {
  const downloadUrl = `${apiUrl}/api/download_resume`;
  const downloadLink = document.createElement('a');
  downloadLink.href = downloadUrl;
  downloadLink.download = 'JordanKailResume.pdf';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
};
