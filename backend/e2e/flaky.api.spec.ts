import { test, expect } from './fixtures';
import { authGet, authPost } from './helpers/api';

test.describe('Flaky Analysis API', () => {
  test('GET /api/flaky/summary returns summary stats', async ({ request, user }) => {
    const res = await authGet(request, '/flaky/summary', user.token);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.summary).toBeDefined();
    expect(typeof body.summary.totalFlakyTests).toBe('number');
  });

  test('POST /api/flaky/analyze triggers analysis scan', async ({ request, user }) => {
    const res = await authPost(request, '/flaky/analyze', user.token, {});
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.analyzedCount).toBeGreaterThanOrEqual(0);
  });

  test('GET /api/flaky lists flaky test records', async ({ request, user }) => {
    const res = await authGet(request, '/flaky', user.token, { limit: 10 });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.tests)).toBe(true);
  });
});
