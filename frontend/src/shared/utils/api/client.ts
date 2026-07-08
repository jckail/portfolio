/**
 * Typed helpers for calling the backend API.
 *
 * All application fetches go through here so JSON parsing, error surfaces,
 * and headers stay consistent. Paths are same-origin and relative, which
 * works identically behind the Vite dev proxy and in production.
 */

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** FastAPI puts human-readable messages in `detail`. */
async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === 'object' && 'detail' in body) {
      const detail = (body as { detail: unknown }).detail;
      if (typeof detail === 'string') return detail;
    }
  } catch {
    // Non-JSON error body; fall through to the status text
  }
  return response.statusText || `Request failed with status ${response.status}`;
}

export async function getJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, init);
  if (!response.ok) {
    throw new ApiError(response.status, await extractErrorMessage(response));
  }
  return response.json() as Promise<T>;
}

export async function postJson<T>(
  path: string,
  body?: unknown,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    ...init,
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...init.headers,
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    throw new ApiError(response.status, await extractErrorMessage(response));
  }
  // Some endpoints (e.g. logout) return an empty body
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
