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

  const isLocal = ['localhost', '0.0.0.0', '127.0.0.1', '192.168.0.122'].includes(currentHost);
  const protocol = isLocal ? 'http' : 'https';
  const port = isLocal ? ':8080' : '';
  const apiUrl = `${protocol}://${currentHost}${port}`;

  console.log('API URL:', apiUrl);
  return apiUrl;
};

export const downloadResume = () => {
  try {
    console.info('Starting resume download...');

    const apiUrl = getApiUrl();
    const downloadUrl = '/api/resume';
    const fullUrl = `${apiUrl}${downloadUrl}`;
    console.debug(`Full download URL: ${fullUrl}`);

    const downloadLink = document.createElement('a');
    downloadLink.href = fullUrl;

    const fileName = process.env.RESUME_FILE || 'Resume.pdf';
    downloadLink.download = fileName;
    console.debug(`File name resolved to: ${fileName}`);

    document.body.appendChild(downloadLink);
    console.debug('Download link appended to the document body.');

    downloadLink.click();
    console.info('Download link clicked. Starting download process.');

    document.body.removeChild(downloadLink);
    console.debug('Download link removed from the document body.');

    console.info('Resume download completed successfully.');
  } catch (error) {
    console.error('Error occurred while downloading the resume:', error);

    // Optional: Provide user feedback if download fails.
    alert('Failed to download the resume. Please try again later.');
  }
};
