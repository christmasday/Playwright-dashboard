import { test as base, expect } from '@playwright/test';
import { APIRequestContext, Page } from '@playwright/test';
import {
  API_BASE_URL,
  SEED_ADMIN_EMAIL,
  SEED_ADMIN_PASSWORD,
} from './helpers/constants';
import {
  createVerifiedUser,
  loginUser,
  getUserId,
} from './helpers/api';
import {
  ensureSeedAdmin,
  deleteUserByEmail,
  closeDb,
} from './helpers/db';

export interface AuthUser {
  token: string;
  email: string;
  username: string;
  password: string;
  id: string;
}

type Fixtures = {
  apiRequest: APIRequestContext;
  admin: AuthUser;
  user: AuthUser;
  authedPage: Page;
};

export const test = base.extend<Fixtures>({
  apiRequest: async ({ request }, use) => {
    await use(request);
  },

  admin: async ({ request }, use) => {
    await ensureSeedAdmin();
    const login = await loginUser(request, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD);
    const body = await login.json();
    const token = body.data.accessToken;
    const id = body.data.user.id;
    await use({
      token,
      email: SEED_ADMIN_EMAIL,
      username: body.data.user.username,
      password: SEED_ADMIN_PASSWORD,
      id,
    });
  },

  user: async ({ request }, use) => {
    const creds = await createVerifiedUser(request);
    const login = await loginUser(request, creds.email, creds.password);
    const body = await login.json();
    const token = body.data.accessToken;
    const id = await getUserId(request, token);
    await use({
      token,
      email: creds.email,
      username: creds.username,
      password: creds.password,
      id,
    });
    await deleteUserByEmail(creds.email);
  },

  authedPage: async ({ page, request }, use) => {
    const creds = await createVerifiedUser(request);
    await page.goto('/login');
    await page.fill('input[placeholder="you@example.com"]', creds.email);
    await page.fill('input[type="password"]', creds.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await use(page);
    await deleteUserByEmail(creds.email);
  },
});

export { expect };
