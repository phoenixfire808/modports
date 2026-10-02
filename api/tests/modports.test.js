import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';
import { TERMS_VERSION } from '../terms-version.js';

for (const domain of ['rustports.com', 'modports.com']) {
  test(`${domain}: exact-origin OAuth start uses its callback and cookie domain`, async () => {
    let writes = 0;
    const env = {
      SITE_ORIGIN: `https://${domain}`, GITHUB_CALLBACK_URL: `https://api.${domain}/auth/github/callback`,
      GITHUB_CLIENT_ID: 'fixture', GITHUB_CLIENT_SECRET: 'fixture-only',
      DB: { prepare() { return { bind() { return { async run() { writes++; } }; } }; } }
    };
    const request = origin => new Request(`https://api.${domain}/auth/github/start`, {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ termsAccepted: 'yes', termsVersion: TERMS_VERSION })
    });
    const response = await worker.fetch(request(env.SITE_ORIGIN), env);
    assert.equal(response.status, 302);
    assert.equal(new URL(response.headers.get('Location')).searchParams.get('redirect_uri'), env.GITHUB_CALLBACK_URL);
    assert.ok(response.headers.get('Set-Cookie').includes(`Domain=.${domain}`));
    assert.match(response.headers.get('Set-Cookie'), /SameSite=Lax; Secure; HttpOnly/);
    assert.equal(writes, 1);
    const wrongOrigin = await worker.fetch(request('https://evil.example'), env);
    assert.equal(wrongOrigin.status, 403);
    assert.equal(writes, 1);
    assert.equal(wrongOrigin.headers.get('Access-Control-Allow-Origin'), null);
    const options = await worker.fetch(new Request(`https://api.${domain}/api/projects`, {
      method: 'OPTIONS', headers: { Origin: env.SITE_ORIGIN }
    }), env);
    assert.equal(options.headers.get('Access-Control-Allow-Origin'), env.SITE_ORIGIN);
  });
}
