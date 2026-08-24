import { APIRequestContext } from '@playwright/test';
import { API_BASE_URL, TEST_PASSWORD } from './constants';
import { verifyEmail } from './db';

export function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}

export async function registerUser(request: APIRequestContext, data: any) {
  return request.post(`${API_BASE_URL}/auth/register`, { data });
}

export async function loginUser(
  request: APIRequestContext,
  identifier: string,
  password: string
) {
  const isEmail = identifier.includes('@');
  return request.post(`${API_BASE_URL}/auth/login`, {
    data: {
      ...(isEmail ? { email: identifier } : { username: identifier }),
      password,
    },
  });
}

export interface TestUser {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
}

export async function createVerifiedUser(
  request: APIRequestContext,
  overrides: Partial<TestUser> = {}
): Promise<TestUser> {
  const suffix = randomSuffix();
  const user: TestUser = {
    email: overrides.email || `e2e-${suffix}@pw.local`,
    username: overrides.username || `e2e-${suffix}`,
    password: overrides.password || TEST_PASSWORD,
    firstName: overrides.firstName || 'Test',
    lastName: overrides.lastName || 'User',
    role: overrides.role || 'viewer',
  };
  const res = await registerUser(request, {
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    password: user.password,
    role: user.role,
  });
  if (!res.ok()) {
    throw new Error(`createVerifiedUser register failed: ${res.status()} ${await res.text()}`);
  }
  await verifyEmail(user.email);
  return user;
}

export async function authGet(
  request: APIRequestContext,
  path: string,
  token?: string,
  params?: Record<string, any>
) {
  return request.get(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    params,
  });
}

export async function authPost(
  request: APIRequestContext,
  path: string,
  token: string | undefined,
  data?: any
) {
  return request.post(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    data,
  });
}

export async function authPatch(
  request: APIRequestContext,
  path: string,
  token: string | undefined,
  data?: any
) {
  return request.patch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    data,
  });
}

export async function authDelete(
  request: APIRequestContext,
  path: string,
  token: string | undefined
) {
  return request.delete(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function getUserId(
  request: APIRequestContext,
  token: string
): Promise<string> {
  const res = await authGet(request, '/auth/me', token);
  const body = await res.json();
  return body.data.user.id;
}
