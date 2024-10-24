import { useState, useEffect } from 'react';


const apiUrl = '/api'



export const useResumeData = () => {
  const [resumeData, setResumeData] = useState(null);
  const [error, setError] = useState(null);
  

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
        
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
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
