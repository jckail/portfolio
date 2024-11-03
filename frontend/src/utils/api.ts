import { config } from '@/config';
import { ApiResponse, ApiError } from '@/types';

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${config.api.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      data,
      status: 'success',
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      status: 'error',
    };
  }
}

export function createQueryString(params: Record<string, string | number>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.append(key, String(value));
  });
  return searchParams.toString();
}

export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
}

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as ApiError).message === 'string'
  );
}

// API endpoints
export const endpoints = {
  resume: config.api.endpoints.resume,
  admin: config.api.endpoints.admin,
  telemetry: config.api.endpoints.telemetry,
} as const;
