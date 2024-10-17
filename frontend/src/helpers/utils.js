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
  if (currentHost === 'localhost' || currentHost === '0.0.0.0' || currentHost === '127.0.0.1' || currentHost === '192.168.0.122') {
    apiUrl = `http://${currentHost}:8080`; // Use HTTP and port 8080 for local development
  } else if (currentHost.includes('run.app')) {
    // For GCP Cloud Run, use HTTPS without a port number
    apiUrl = `https://${currentHost}`;
  } else {
    // For other production environments, use HTTPS without a port number
    apiUrl = `https://${currentHost}`;
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
