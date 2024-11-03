/// <reference types="vite/client" />

export interface ImportMetaEnv {
  // Frontend-specific variables
  readonly VITE_API_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_RESUME_FILE: string;

  // Shared variables that might be needed in frontend
  readonly PRODUCTION_URL: string;
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
}

// Extend the ImportMeta interface
export interface ImportMeta {
  readonly env: ImportMetaEnv;
}
