export interface Project {
  title: string;
  description: string;
  description_detail: string;
  link: string;
  link2?: string;
  logoPath?: string;
}

export interface ProjectsData {
  [key: string]: Project;
}

export interface Contact {
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone: string;
  website: string;
  location: string;
  country: string;
  github: string;
  linkedin: string;
}

export interface ResumeData {
  name: string;
  title: string;
  contact: Contact;
  projects: Project[];
  // ... other resume data types if needed
}

export interface AboutMe {
    greeting: string;
    description: string;
    aidetails:string;
    brief_bio: string;
    full_portrait:string;
}

// Admin types
export interface AdminCredentials {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  access_token: string;
  token_type: string;
}

export interface AdminState {
  isLoggedIn: boolean;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}


export interface TelemetryState {
  logs: TelemetryLog[];
  isEnabled: boolean;
}

export interface TelemetryLog {
  id: string;
  timestamp: string;
  type: TelemetryType;
  message: string;
  metadata?: Record<string, unknown>;
}

export type TelemetryType = 
  | 'info'
  | 'warning'
  | 'error'
  | 'performance'
  | 'user_action';

export interface PerformanceMetrics {
  pageLoadTime: number;
  firstPaint: number;
  firstContentfulPaint: number;
  timeToInteractive: number;
}

export interface BrowserInfo {
  userAgent: string;
  language: string;
  platform: string;
  screenSize: {
    width: number;
    height: number;
  };
}

export interface ConnectionInfo {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

export interface TelemetryConfig {
  enabled: boolean;
  sampleRate: number;
  logRetentionDays: number;
  excludedEvents?: string[];
}
