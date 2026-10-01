import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAdminStore } from './admin-store';

const postJson = vi.fn();
const getJson = vi.fn();

vi.mock('../utils/api', () => ({
  postJson: (...a: unknown[]) => postJson(...a),
  getJson: (...a: unknown[]) => getJson(...a),
  endpoints: { admin: { login: '/login', logout: '/logout', verify: '/verify' } },
}));

const reset = () =>
  useAdminStore.setState({ isLoggedIn: false, token: null, isLoading: false, error: null });

describe('admin store', () => {
  beforeEach(() => {
    postJson.mockReset();
    getJson.mockReset();
    localStorage.clear();
    reset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('stores the token on a successful login', async () => {
    postJson.mockResolvedValue({ access_token: 'tok' });
    const ok = await useAdminStore.getState().login({ email: 'a@example.com', password: 'x' });
    expect(ok).toBe(true);
    expect(useAdminStore.getState()).toMatchObject({ isLoggedIn: true, token: 'tok', isLoading: false });
    expect(localStorage.getItem('adminToken')).toBe('tok');
  });

  it('fails closed when the response carries no token', async () => {
    postJson.mockResolvedValue({});
    localStorage.setItem('adminToken', 'stale');
    const ok = await useAdminStore.getState().login({ email: 'a@example.com', password: 'x' });
    expect(ok).toBe(false);
    expect(useAdminStore.getState().error).toBe('No access token received');
    expect(useAdminStore.getState().isLoggedIn).toBe(false);
    expect(localStorage.getItem('adminToken')).toBeNull();
  });

  it('reports a login rejection and clears loading', async () => {
    postJson.mockRejectedValue(new Error('Invalid credentials'));
    expect(await useAdminStore.getState().login({ email: 'a@example.com', password: 'x' })).toBe(false);
    expect(useAdminStore.getState()).toMatchObject({ error: 'Invalid credentials', isLoading: false });
  });

  it('logout sends the bearer token and clears state even if the call fails', async () => {
    localStorage.setItem('adminToken', 'tok');
    useAdminStore.setState({ isLoggedIn: true, token: 'tok' });
    postJson.mockRejectedValue(new Error('network'));
    await useAdminStore.getState().logout();
    expect(postJson).toHaveBeenCalledWith('/logout', undefined, {
      headers: { Authorization: 'Bearer tok' },
    });
    expect(useAdminStore.getState()).toMatchObject({ isLoggedIn: false, token: null });
    expect(localStorage.getItem('adminToken')).toBeNull();
  });

  it('logout without a stored token makes no request', async () => {
    await useAdminStore.getState().logout();
    expect(postJson).not.toHaveBeenCalled();
  });

  it('verifyToken accepts a valid token and discards an invalid one', async () => {
    getJson.mockResolvedValueOnce({});
    expect(await useAdminStore.getState().verifyToken('good')).toBe(true);
    expect(useAdminStore.getState()).toMatchObject({ isLoggedIn: true, token: 'good' });

    localStorage.setItem('adminToken', 'bad');
    getJson.mockRejectedValueOnce(new Error('401'));
    expect(await useAdminStore.getState().verifyToken('bad')).toBe(false);
    expect(useAdminStore.getState()).toMatchObject({ isLoggedIn: false, token: null });
    expect(localStorage.getItem('adminToken')).toBeNull();
  });
});
