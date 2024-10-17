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
  console.log('Current hostname:', currentHost);

  let apiUrl;
  if (currentHost === 'localhost' || currentHost === '0.0.0.0' ||currentHost === '127.0.0.1' || currentHost === '192.168.0.122') {
    apiUrl = `http://${currentHost}:8080`; // Use the current hostname for local development
  } else {
    // For production, use the quickresume .env PRODUCTION_URL environment variable
    apiUrl = process.env.PRODUCTION_URL;
  }

  console.log('API URL:', apiUrl);
  return apiUrl;
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
