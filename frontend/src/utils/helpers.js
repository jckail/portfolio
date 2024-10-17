export const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const updateParticlesConfig = (theme, particleConfig, getParticlesConfig) => {
  const config = particleConfig[theme]
  return getParticlesConfig(
    config.background_color,
    config.particle_color,
    config.line_color
  )
}

export const handleResumeClick = (event, headerHeight, apiUrl) => {
  event.preventDefault();
  
  // Scroll to the "My Resume" section
  const resumeSection = document.getElementById('my-resume');
  if (resumeSection) {
    const targetPosition = resumeSection.getBoundingClientRect().top + window.pageYOffset;
    window.scrollTo({
      top: targetPosition - headerHeight,
      behavior: 'smooth'
    });
    // Update URL hash
    window.history.pushState(null, '', '#my-resume');
  }

  // Initiate resume download
  const downloadUrl = `${apiUrl}/api/download_resume`;
  
  // Create a temporary anchor element to trigger the download
  const downloadLink = document.createElement('a');
  downloadLink.href = downloadUrl;
  downloadLink.download = 'JordanKailResume.pdf'; // Set the desired filename
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}
