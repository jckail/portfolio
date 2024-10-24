import { useState, useEffect } from 'react';
const apiUrl = '/api'

export const useResumeFileName = () => {
  const [resumeFileName, setResumeFileName] = useState('default_resume.pdf');
  const [error, setError] = useState(null);
  

  useEffect(() => {
    const fullApiUrl = `${apiUrl}/resume_file_name`;
    console.log('Initiating resume file name request to:', fullApiUrl);
    console.log('Current window.location:', window.location.toString());
    console.log('API request headers:', {
      'Content-Type': 'application/json',
    });

    fetch(fullApiUrl)
      .then(response => {
        console.log('API response received');
        console.log('Response status:', response.status);
        console.log('Response headers:', JSON.stringify(Array.from(response.headers.entries())));
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Resume file name response:', JSON.stringify(data, null, 2));
        setResumeFileName(data.resumeFileName);
      })
      .catch(error => {
        console.error('Error fetching resume file name:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        if (error instanceof TypeError) {
          console.error('This might be a CORS issue or a network error');
        }
        setError({ message: error.message, url: fullApiUrl });
      });
  }, [apiUrl]);

  return { resumeFileName, error };
};
