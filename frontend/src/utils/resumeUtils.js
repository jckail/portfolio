import { getApiUrl } from './apiUtils';

export const downloadResume = async (fileName = 'default_resume.pdf') => {
  try {
    console.log('Initiating resume download...', {
      fileName,
      apiUrl: getApiUrl()
    });
    
    const apiUrl = getApiUrl();
    const downloadUrl = `${apiUrl}/resume`;
    console.log('Download URL:', downloadUrl);

    console.log('Making fetch request...');
    const response = await fetch(downloadUrl);
    console.log('Fetch response received:', {
      status: response.status,
      ok: response.ok,
      headers: Array.from(response.headers.entries())
    });

    if (!response.ok) {
      throw new Error(`Download failed with status: ${response.status}`);
    }

    console.log('Converting response to blob...');
    const blob = await response.blob();
    console.log('Blob created:', {
      size: blob.size,
      type: blob.type
    });

    console.log('Creating download link...');
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = fileName;

    console.log('Triggering download...');
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(downloadLink.href);

    console.log('Resume download completed successfully.');
  } catch (error) {
    console.error('Detailed error during resume download:', {
      error,
      message: error.message,
      name: error.name,
      stack: error.stack,
      type: error instanceof TypeError ? 'TypeError (possible network/CORS issue)' : 'Other error'
    });
    throw error; // Re-throw to allow handling by the caller
  }
};
