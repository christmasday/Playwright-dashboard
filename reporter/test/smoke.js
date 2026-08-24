'use strict';

/**
 * Smoke test: validates the transform, the payload shape, and the
 * API-key-gated "disabled" behavior without hitting a real server.
 */

const Reporter = require('../index.js');

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    failures++;
    console.error('  ✗ ' + msg);
  } else {
    console.log('  ✓ ' + msg);
  }
}

async function main() {
  // 1) Disabled without an API key
  const disabled = new Reporter({});
  assert(disabled.enabled === false, 'reporter is disabled when no API key is attached');

  // 2) Enabled with an API key
  const calls = [];
  global.fetch = async (url, opts) => {
    calls.push({ url, method: opts.method, key: opts.headers['X-API-Key'], body: JSON.parse(opts.body) });
    if (url.endsWith('/builds')) return { ok: true, status: 201, json: async () => ({ id: 'build_1' }) };
    if (url.endsWith('/tests/ingest')) return { ok: true, status: 201, json: async () => ({ ok: true }) };
    return { ok: false, status: 500, text: async () => 'err' };
  };

  const enabled = new Reporter({ url: 'http://localhost:3001/api', apiKey: 'sk_test', buildName: 'ci-42' });
  assert(enabled.enabled === true, 'reporter is enabled when an API key is attached');

  const fakeResult = {
    suites: [
      {
        title: 'root',
        file: 'a.spec.ts',
        tests: [
          {
            title: 'login',
            tags: ['smoke'],
            results: [
              {
                status: 'passed',
                duration: 120,
                startTime: new Date(),
                steps: [{ title: 'navigate', duration: 50 }],
                attachments: [],
              },
            ],
          },
        ],
        suites: [
          {
            title: 'child',
            file: 'a.spec.ts',
            tests: [
              {
                title: 'sub',
                tags: [],
                results: [
                  {
                    status: 'failed',
                    duration: 80,
                    startTime: new Date(),
                    steps: [{ title: 's', duration: 10, error: { message: 'boom', location: { file: 'x', line: 1, column: 1 } } }],
                    attachments: [{ name: 'shot', contentType: 'image/png', path: '/tmp/x.png' }],
                  },
                ],
              },
            ],
            suites: [],
          },
        ],
      },
    ],
  };

  await enabled.onEnd(fakeResult);

  assert(calls.length === 2, 'made create-build + ingest calls');
  assert(calls[0].url === 'http://localhost:3001/api/builds', 'create-build hits /builds');
  assert(calls[0].key === 'sk_test', 'create-build sends X-API-Key');
  assert(calls[1].url === 'http://localhost:3001/api/tests/ingest', 'ingest hits /tests/ingest');
  const payload = calls[1].body;
  assert(payload.buildId === 'build_1', 'ingest uses the created build id');
  assert(payload.results && Array.isArray(payload.results.suites) && payload.results.suites.length === 1, 'ingest body.results has suites');
  const rootSuite = payload.results.suites[0];
  assert(rootSuite.tests[0].name === 'login' && rootSuite.tests[0].status === 'passed', 'test transformed with name + status');
  const childTest = rootSuite.suites[0].tests[0];
  const stepErrMsg = typeof childTest.steps[0].error === 'object' ? childTest.steps[0].error.message : childTest.steps[0].error;
  assert(childTest.status === 'failed' && childTest.steps[0].status === 'failed' && stepErrMsg === 'boom', 'failed step carries error');
  assert(childTest.attachments[0].type === 'image/png' && childTest.attachments[0].path === '/tmp/x.png', 'attachment transformed');

  if (failures > 0) {
    console.error(`\n${failures} assertion(s) failed`);
    process.exit(1);
  }
  console.log('\nAll smoke assertions passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
