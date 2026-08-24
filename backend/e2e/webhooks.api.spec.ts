import crypto from 'crypto';
import { test, expect } from './fixtures';
import { API_BASE_URL } from './helpers/constants';

test.describe('Webhooks API', () => {
  test('GET /webhooks/status returns config', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/webhooks/status`);
    expect(res.status()).toBe(200);
  });

  test('github webhook rejects missing signature', async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/webhooks/github`, {
      data: { repository: { full_name: 'a/b' } },
      headers: { 'x-github-event': 'push' },
    });
    expect(res.status()).toBe(401);
  });

  test('github webhook rejects invalid signature', async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/webhooks/github`, {
      data: { repository: { full_name: 'a/b' } },
      headers: { 'x-hub-signature': 'sha256=invalid', 'x-github-event': 'push' },
    });
    expect(res.status()).toBe(401);
  });

  test('github webhook accepts valid signature', async ({ request }) => {
    const payload = { repository: { full_name: 'a/b' }, action: 'test' };
    const secret = process.env.GITHUB_WEBHOOK_SECRET || 'your-github-secret';
    const sig =
      'sha256=' +
      crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
    const res = await request.post(`${API_BASE_URL}/webhooks/github`, {
      data: payload,
      headers: { 'x-hub-signature': sig, 'x-github-event': 'push' },
    });
    expect(res.status()).toBe(200);
  });
});
