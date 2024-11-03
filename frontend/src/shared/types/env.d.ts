/// <reference types="vite/client" />

declare interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_ENVIRONMENT: 'development' | 'production' | 'test';
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}
