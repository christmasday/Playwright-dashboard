import { test, expect } from './fixtures';
import { API_BASE_URL } from './helpers/constants';
import { authPost, authGet, authPatch, authDelete, randomSuffix } from './helpers/api';

test.describe('Conditional Execution API', () => {
  test('create rule requires fields', async ({ request, user }) => {
    const res = await authPost(request, '/conditionalExecution/rules', user.token, {
      name: 'x',
    });
    expect(res.status()).toBe(400);
  });

  test('create, list, update and delete rule', async ({ request, user }) => {
    const s = randomSuffix();
    const create = await authPost(request, '/conditionalExecution/rules', user.token, {
      name: `e2e-${s}`,
      condition: 'result.status === "failed"',
      action: 'retry',
      enabled: true,
    });
    expect(create.status()).toBe(201);
    const body = await create.json();
    const id = body.data ? body.data.id : body.rule.id;

    const list = await authGet(request, '/conditionalExecution/rules', user.token);
    expect(list.status()).toBe(200);

    const upd = await authPatch(
      request,
      `/conditionalExecution/rules/${id}`,
      user.token,
      { enabled: false }
    );
    expect(upd.status()).toBe(200);

    const del = await authDelete(
      request,
      `/conditionalExecution/rules/${id}`,
      user.token
    );
    expect(del.status()).toBe(200);
  });
});
