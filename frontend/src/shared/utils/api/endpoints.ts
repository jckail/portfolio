/** Canonical backend endpoint paths (relative, same-origin). */
export const endpoints = {
  aboutMe: '/api/aboutme',
  experience: '/api/experience',
  skills: '/api/skills',
  projects: '/api/projects',
  contactInfo: '/api/contact/info',
  sendEmail: '/api/contact/send-email',
  chatStatus: '/api/chat/status',
  resumeFileName: '/api/resume_file_name',
  resumeDownload: '/api/resume?download=true',
  admin: {
    login: '/api/admin/login',
    verify: '/api/admin/verify',
    logout: '/api/admin/logout',
    logs: '/api/admin/logs',
  },
  telemetry: '/api/telemetry',
} as const;
