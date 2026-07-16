const dashboardUrl = (process.env.DASHBOARD_URL || 'https://sentinel-ads-ssk.vercel.app').replace(/\/$/, '');
const apiUrl = (process.env.API_URL || 'https://sentinel-ads-api.onrender.com').replace(/\/$/, '');

const checks = [];

async function check(name, run) {
  const startedAt = Date.now();
  try {
    await run();
    checks.push({ name, ok: true, durationMs: Date.now() - startedAt });
  } catch (error) {
    checks.push({ name, ok: false, durationMs: Date.now() - startedAt, error: error.message });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertSecurityHeaders(response) {
  for (const header of [
    'content-security-policy',
    'strict-transport-security',
    'x-content-type-options',
    'x-frame-options',
    'referrer-policy',
  ]) {
    assert(response.headers.has(header), `missing ${header}`);
  }
}

await check('dashboard availability and security headers', async () => {
  const response = await fetch(`${dashboardUrl}/`, { redirect: 'manual' });
  assert(response.status === 200, `expected 200, received ${response.status}`);
  assert(response.headers.get('content-type')?.includes('text/html'), 'dashboard did not return HTML');
  assertSecurityHeaders(response);
});

for (const path of ['/docs-json', '/metrics/public', '/config/risk-level', '/domains', '/allowlist']) {
  await check(`public API ${path}`, async () => {
    const response = await fetch(`${apiUrl}${path}`);
    assert(response.status === 200, `expected 200, received ${response.status}`);
    assertSecurityHeaders(response);
    assert(!response.headers.has('x-powered-by'), 'x-powered-by must not be exposed');
  });
}

for (const path of ['/cases', '/audit-logs', '/laws', '/risk/logs', '/feedback']) {
  await check(`protected API ${path}`, async () => {
    const response = await fetch(`${apiUrl}${path}`);
    assert(response.status === 401, `expected 401, received ${response.status}`);
  });
}

await check('allowed CORS preflight', async () => {
  const response = await fetch(`${apiUrl}/config/risk-level`, {
    method: 'OPTIONS',
    headers: {
      Origin: dashboardUrl,
      'Access-Control-Request-Method': 'GET',
    },
  });
  assert(response.status === 204, `expected 204, received ${response.status}`);
  assert(response.headers.get('access-control-allow-origin') === dashboardUrl, 'dashboard origin was not allowed');
});

await check('rejected CORS preflight', async () => {
  const response = await fetch(`${apiUrl}/config/risk-level`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://example.com',
      'Access-Control-Request-Method': 'GET',
    },
  });
  assert(response.status === 403, `expected 403, received ${response.status}`);
  assert(!response.headers.has('access-control-allow-origin'), 'rejected origin received a CORS allow header');
});

for (const result of checks) {
  const status = result.ok ? 'PASS' : 'FAIL';
  console.log(`${status} ${result.name} (${result.durationMs} ms)${result.error ? `: ${result.error}` : ''}`);
}

const failures = checks.filter((result) => !result.ok);
console.log(`\n${checks.length - failures.length}/${checks.length} smoke checks passed.`);
if (failures.length > 0) process.exitCode = 1;
