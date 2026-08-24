import { test, expect } from './fixtures';
import { API_BASE_URL } from './helpers/constants';
import { authPost, authGet, authPatch, randomSuffix } from './helpers/api';
import { getTestRunIdByBuild } from './helpers/db';

test.describe('Tests API', () => {
  async function ingestSampleBuild(request: any, token: string) {
    const create = await authPost(request, '/builds', token, {
      name: `e2e-${randomSuffix()}`,
    });
    const buildId = (await create.json()).id;

    const payload = {
      buildId,
      results: {
        suites: [
          {
            title: 'Sample suite',
            file: 'sample.spec.ts',
            tests: [
              {
                name: 'passes',
                status: 'passed',
                duration: 120,
                startTime: new Date().toISOString(),
                tags: ['smoke'],
              },
              {
                name: 'fails',
                status: 'failed',
                duration: 80,
                startTime: new Date().toISOString(),
                steps: [
                  {
                    title: 'step one',
                    status: 'failed',
                    duration: 40,
                    error: { message: 'boom', location: 'sample.spec.ts:10' },
                  },
                ],
              },
            ],
          },
        ],
      },
    };
    const ingest = await authPost(request, '/tests/ingest', token, payload);
    expect(ingest.status()).toBe(201);
    return buildId;
  }

  test('ingest results and read summary', async ({ request, user }) => {
    const buildId = await ingestSampleBuild(request, user.token);

    const summary = await authGet(request, `/tests/build/${buildId}/summary`, user.token);
    expect(summary.status()).toBe(200);
    const body = await summary.json();
    expect(body.stats.total).toBeGreaterThanOrEqual(2);
    expect(body.stats.failed).toBeGreaterThanOrEqual(1);
  });

  test('flaky and by-status endpoints', async ({ request, user }) => {
    const buildId = await ingestSampleBuild(request, user.token);

    const flaky = await authGet(request, '/tests/flaky', user.token);
    expect(flaky.status()).toBe(200);

    const byStatus = await authGet(request, '/tests/by-status', user.token, {
      buildId,
      status: 'failed',
    });
    expect(byStatus.status()).toBe(200);
  });

  test('update test status', async ({ request, user }) => {
    const buildId = await ingestSampleBuild(request, user.token);
    const testRunId = await getTestRunIdByBuild(buildId);
    expect(testRunId).toBeTruthy();

    const upd = await authPatch(
      request,
      `/tests/${testRunId}/status`,
      user.token,
      { status: 'quarantined', quarantineReason: 'flaky' }
    );
    expect(upd.status()).toBe(200);
  });
});
