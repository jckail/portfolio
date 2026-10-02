import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, getJson, postJson } from './client';

const fetchMock = vi.fn();

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getJson', () => {
  it('returns the parsed body and forwards the init options', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    const controller = new AbortController();

    await expect(getJson('/api/skills', { signal: controller.signal })).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith('/api/skills', { signal: controller.signal });
  });

  it('throws ApiError with the FastAPI detail string', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'Too many requests' }, { status: 429 }));

    const error = await getJson('/api/x').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ name: 'ApiError', status: 429, message: 'Too many requests' });
  });

  it('does not surface a structured (validation) detail as the message', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ detail: [{ loc: ['body', 'email'], msg: 'bad' }] }, { status: 422, statusText: 'Unprocessable' })
    );

    await expect(getJson('/api/x')).rejects.toMatchObject({ status: 422, message: 'Unprocessable' });
  });

  it('falls back to the status text for a non-JSON error body', async () => {
    fetchMock.mockResolvedValue(new Response('<html>bad gateway</html>', { status: 502, statusText: 'Bad Gateway' }));

    await expect(getJson('/api/x')).rejects.toMatchObject({ status: 502, message: 'Bad Gateway' });
  });

  it('falls back to a generic message when there is no status text', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 500, statusText: '' }));

    await expect(getJson('/api/x')).rejects.toMatchObject({
      status: 500,
      message: 'Request failed with status 500',
    });
  });

  it('propagates network failures unchanged', async () => {
    const failure = new TypeError('Failed to fetch');
    fetchMock.mockRejectedValue(failure);

    await expect(getJson('/api/x')).rejects.toBe(failure);
  });
});

describe('postJson', () => {
  it('sends a JSON body with a content type', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 1 }));

    await expect(postJson('/api/contact', { email: 'a@b.co' })).resolves.toEqual({ id: 1 });

    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/contact');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ email: 'a@b.co' }));
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('omits the body and content type when no body is given', async () => {
    fetchMock.mockResolvedValue(new Response(''));

    await postJson('/api/admin/logout');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init).not.toHaveProperty('body');
    expect(init.headers).toEqual({});
  });

  it('still sends falsy bodies such as 0 and false', async () => {
    fetchMock.mockResolvedValue(new Response(''));

    await postJson('/api/x', 0);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe('0');
  });

  it('returns undefined for an empty success body', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 200 }));

    await expect(postJson('/api/admin/logout')).resolves.toBeUndefined();
  });

  it('merges caller headers over the defaults and keeps caller options', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    await postJson('/api/x', { a: 1 }, { headers: { Authorization: 'Bearer t' }, credentials: 'include' });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer t' });
    expect(init.credentials).toBe('include');
    expect(init.method).toBe('POST');
  });

  it('throws ApiError on a non-2xx response', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'Invalid credentials' }, { status: 401 }));

    await expect(postJson('/api/admin/login', { email: 'x' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'Invalid credentials',
    });
  });
});
