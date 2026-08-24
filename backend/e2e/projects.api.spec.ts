import { test, expect } from './fixtures';
import { API_BASE_URL } from './helpers/constants';
import {
  authPost,
  authGet,
  authPatch,
  authDelete,
  randomSuffix,
  createVerifiedUser,
  getUserId,
} from './helpers/api';

test.describe('Projects API', () => {
  test('create project requires authentication', async ({ request }) => {
    const res = await authPost(request, '/projects', undefined, { name: 'x' });
    expect(res.status()).toBe(401);
  });

  test('create, list, get, update and delete project', async ({ request, user }) => {
    const s = randomSuffix();
    const name = `e2e-${s}`;
    const create = await authPost(request, '/projects', user.token, {
      name,
      description: 'a test project',
    });
    expect(create.status()).toBe(201);
    const project = (await create.json()).data;
    expect(project.name).toBe(name);

    const list = await authGet(request, '/projects', user.token);
    expect(list.status()).toBe(200);
    const listBody = await list.json();
    expect(listBody.data.some((p: any) => p.id === project.id)).toBe(true);

    const get = await authGet(request, `/projects/${project.id}`, user.token);
    expect(get.status()).toBe(200);

    const upd = await authPatch(request, `/projects/${project.id}`, user.token, {
      name: `${name}-upd`,
      status: 'archived',
    });
    expect(upd.status()).toBe(200);
    const updBody = await upd.json();
    expect(updBody.data.status).toBe('archived');

    const members = await authGet(request, `/projects/${project.id}/members`, user.token);
    expect(members.status()).toBe(200);

    const builds = await authGet(request, `/projects/${project.id}/builds`, user.token);
    expect(builds.status()).toBe(200);

    const del = await authDelete(request, `/projects/${project.id}`, user.token);
    expect(del.status()).toBe(200);
  });

  test('project member management', async ({ request, user, admin }) => {
    const s = randomSuffix();
    const create = await authPost(request, '/projects', user.token, {
      name: `e2e-${s}`,
    });
    const projectId = (await create.json()).data.id;

    const adminId = await getUserId(request, admin.token);

    const add = await authPost(request, `/projects/${projectId}/members`, user.token, {
      userId: adminId,
      role: 'maintainer',
    });
    expect(add.status()).toBe(200);

    const list = await authGet(request, `/projects/${projectId}/members`, user.token);
    expect(list.status()).toBe(200);
    const members = (await list.json()).data;
    expect(members.some((m: any) => m.userId === adminId)).toBe(true);

    const remove = await authDelete(
      request,
      `/projects/${projectId}/members/${adminId}`,
      user.token
    );
    expect(remove.status()).toBe(200);
  });
});
