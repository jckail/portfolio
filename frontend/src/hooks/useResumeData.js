import { useState, useEffect } from 'react';
import { getApiUrl } from '../utils/apiUtils';

export const useResumeData = () => {
  const [resumeData, setResumeData] = useState(null);
  const [error, setError] = useState(null);
  const apiUrl = getApiUrl();

  useEffect(() => {
    const fullApiUrl = `${apiUrl}/resume_data`;
    console.log('Initiating API request to:', fullApiUrl);
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
        console.log('API response data:', JSON.stringify(data, null, 2));
        setResumeData(data);
      })
      .catch(error => {
        console.error('Error fetching resume data:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        if (error instanceof TypeError) {
          console.error('This might be a CORS issue or a network error');
        }
        setError({ message: error.message, url: fullApiUrl });
      });
  }, [apiUrl]);

  return { resumeData, error };
};
