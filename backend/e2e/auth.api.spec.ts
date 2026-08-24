import { test, expect } from './fixtures';
import { API_BASE_URL } from './helpers/constants';
import {
  registerUser,
  loginUser,
  randomSuffix,
  createVerifiedUser,
} from './helpers/api';

test.describe('Auth API', () => {
  test('register succeeds with valid data', async ({ request }) => {
    const s = randomSuffix();
    const res = await registerUser(request, {
      email: `e2e-${s}@pw.local`,
      username: `e2e-${s}`,
      firstName: 'Test',
      lastName: 'User',
      password: 'Playwright123!',
    });
    expect(res.status()).toBe(201);
  });

  test('register rejects missing required fields', async ({ request }) => {
    const res = await registerUser(request, { email: 'missing@pw.local' });
    expect(res.status()).toBe(400);
  });

  test('register rejects duplicate email', async ({ request }) => {
    const s = randomSuffix();
    const email = `e2e-${s}@pw.local`;
    await registerUser(request, {
      email,
      username: `e2e-${s}`,
      firstName: 'A',
      lastName: 'B',
      password: 'Playwright123!',
    });
    const res = await registerUser(request, {
      email,
      username: `e2e-dupe-${s}`,
      firstName: 'A',
      lastName: 'B',
      password: 'Playwright123!',
    });
    expect(res.status()).toBe(409);
  });

  test('login fails for unverified email', async ({ request }) => {
    const s = randomSuffix();
    const email = `e2e-${s}@pw.local`;
    await registerUser(request, {
      email,
      username: `e2e-${s}`,
      firstName: 'A',
      lastName: 'B',
      password: 'Playwright123!',
    });
    const res = await loginUser(request, email, 'Playwright123!');
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.emailVerified).toBe(false);
  });

  test('login succeeds after email verification', async ({ request }) => {
    const creds = await createVerifiedUser(request);
    const res = await loginUser(request, creds.email, creds.password);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.accessToken).toBeTruthy();
    expect(body.data.refreshToken).toBeTruthy();
  });

  test('GET /auth/me requires token', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/auth/me`);
    expect(res.status()).toBe(401);
  });

  test('GET /auth/me returns profile with valid token', async ({ request, user }) => {
    const res = await request.get(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.user.email).toBe(user.email);
  });

  test('refresh rotates token and revoking invalidates it', async ({ request, user }) => {
    const login = await loginUser(request, user.email, user.password);
    const first = await login.json();
    const refreshToken = first.data.refreshToken;
    const accessToken = first.data.accessToken;

    const refresh = await request.post(`${API_BASE_URL}/auth/refresh`, {
      data: { refreshToken },
    });
    expect(refresh.status()).toBe(200);

    const logout = await request.post(`${API_BASE_URL}/auth/logout`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { refreshToken },
    });
    expect(logout.status()).toBe(200);

    const refreshAgain = await request.post(`${API_BASE_URL}/auth/refresh`, {
      data: { refreshToken },
    });
    expect(refreshAgain.status()).toBe(403);
  });

  test('resend verification returns 200', async ({ request }) => {
    const s = randomSuffix();
    const email = `e2e-${s}@pw.local`;
    await registerUser(request, {
      email,
      username: `e2e-${s}`,
      firstName: 'A',
      lastName: 'B',
      password: 'Playwright123!',
    });
    const res = await request.post(`${API_BASE_URL}/auth/resend-verification`, {
      data: { email },
    });
    expect(res.status()).toBe(200);
  });

  test('admin can manage users; non-admin cannot', async ({ request, admin, user }) => {
    const s = randomSuffix();
    const email = `e2e-${s}@pw.local`;
    const create = await request.post(`${API_BASE_URL}/auth/users`, {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: {
        email,
        username: `e2e-${s}`,
        firstName: 'A',
        lastName: 'B',
        password: 'Playwright123!',
        role: 'viewer',
      },
    });
    expect(create.status()).toBe(201);
    const newId = (await create.json()).data.user.id;

    const list = await request.get(`${API_BASE_URL}/auth/users`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    expect(list.status()).toBe(200);

    const forbidden = await request.post(`${API_BASE_URL}/auth/users`, {
      headers: { Authorization: `Bearer ${user.token}` },
      data: {
        email: 'nope@pw.local',
        username: 'nope',
        firstName: 'A',
        lastName: 'B',
        password: 'Playwright123!',
      },
    });
    expect(forbidden.status()).toBe(403);

    const del = await request.delete(`${API_BASE_URL}/auth/users/${newId}`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    expect(del.status()).toBe(200);
  });
});
