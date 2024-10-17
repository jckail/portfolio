import { useState, useEffect } from 'react'
import { apiUrl } from '../utils/helpers'

export function useResumeData() {
  const [resumeData, setResumeData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${apiUrl}/api/resume_data`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      })
      .then(data => setResumeData(data))
      .catch(error => {
        console.error('Error fetching resume data:', error)
        setError(error.message)
      })
  }, [])

  return { resumeData, error }
}
