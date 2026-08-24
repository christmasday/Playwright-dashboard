import { test, expect } from './fixtures';
import { API_BASE_URL } from './helpers/constants';
import { authPost, authGet, authPatch, randomSuffix } from './helpers/api';

test.describe('Builds API', () => {
  test('create, get, list, update and metrics', async ({ request, user }) => {
    const create = await authPost(request, '/builds', user.token, {
      name: `e2e-${randomSuffix()}`,
      branch: 'main',
      commitHash: 'abc123',
      commitMessage: 'initial',
      environment: 'ci',
    });
    expect(create.status()).toBe(201);
    const build = await create.json();
    const id = build.id;
    expect(id).toBeTruthy();

    const get = await authGet(request, `/builds/${id}`, user.token);
    expect(get.status()).toBe(200);

    const list = await authGet(request, '/builds', user.token);
    expect(list.status()).toBe(200);
    const listBody = await list.json();
    expect(listBody.builds.some((b: any) => b.id === id)).toBe(true);

    const upd = await authPatch(request, `/builds/${id}`, user.token, {
      status: 'passed',
    });
    expect(upd.status()).toBe(200);
    const updBody = await upd.json();
    expect(updBody.status).toBe('passed');

    const metrics = await authGet(request, `/builds/${id}/metrics`, user.token);
    expect(metrics.status()).toBe(200);
  });

  test('get missing build returns 404', async ({ request, user }) => {
    const get = await authGet(request, '/builds/00000000-0000-0000-0000-000000000000', user.token);
    expect(get.status()).toBe(404);
  });
});
