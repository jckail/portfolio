// Common types
export type Status = 'idle' | 'loading' | 'success' | 'error';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: Status;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export interface Route {
  path: string;
  element: React.ReactNode;
  children?: Route[];
}

// UI types
export type Size = 'small' | 'medium' | 'large';

export type Variant = 'primary' | 'secondary' | 'text';

export type Direction = 'horizontal' | 'vertical';

export type Position = 'top' | 'right' | 'bottom' | 'left';

export type Alignment = 'start' | 'center' | 'end';

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type WithClassName = {
  className?: string;
};

export type WithChildren = {
  children: React.ReactNode;
};

export type WithOptionalChildren = {
  children?: React.ReactNode;
};

// Re-export environment types
export type { ImportMetaEnv } from './env';

// Export feature-specific types
export * from '@/features/resume/types';
export * from '@/features/admin/types';
export * from '@/features/telemetry/types';
export * from '@/features/theme/types';
