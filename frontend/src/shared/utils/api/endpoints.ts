/** Canonical backend endpoint paths (relative, same-origin). */
export const endpoints = {
  dataPlayground: '/api/dataplayground',
  dataPlaygroundSimulate: '/api/dataplayground/simulate',
  /** Hosted lab demos: list, and `/<slug>` for one (backend/app/api/labs_routes.py). */
  labs: '/api/labs',
  aboutMe: '/api/aboutme',
  experience: '/api/experience',
  skills: '/api/skills',
  projects: '/api/projects',
  contactInfo: '/api/contact/info',
  sendEmail: '/api/contact/send-email',
  contactPhone: '/api/contact/phone',
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
  /** First-party product events (anonymous, 204, consent-gated by the sender). */
  events: '/api/events',
} as const;
