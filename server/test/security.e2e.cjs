// Cross-cutting security regression suite. Complements the per-module E2E
// suites (admin/farmer/field-officer/field-officer-loans) with the auth
// guards every endpoint shares:
//
//  1. Token handling: missing header, empty bearer, malformed tokens of
//     several shapes — all must be 401 (never 500, never a leak).
//  2. Client-supplied role fields in login/register bodies must not grant
//     anything; the server resolves the role from the profile row.
//  3. Admin lockout attempts: farmer/officer credentials against the admin
//     login endpoint are rejected with 401, and the shared login endpoint
//     refuses wrong credentials.
//  4. IDOR: a farmer/officer token cannot read another account's data
//     through the admin user-detail route.
//  5. Suspension is enforced per request: a suspended officer keeps a valid
//     token but every route (officer AND admin) answers 403; reactivation
//     restores it with the same token.
//
// Self-provisioning: admin token from ADMIN_EMAIL/ADMIN_PASSWORD in
// server/.env; a throwaway field officer is provisioned through the admin
// API. Fixtures are cleaned via security-cleanup.tmp + node test/cleanup.cjs.
require('dotenv').config({ path: __dirname + '/../.env' });
const fs = require('fs');
const path = require('path');

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456';

const results = [];

function report(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}

async function req(method, url, opts = {}) {
  const headers = { ...(opts.json ? { 'Content-Type': 'application/json' } : {}) };
  if (opts.token !== undefined) headers['Authorization'] = `Bearer ${opts.token}`;
  else if (opts.rawAuth !== undefined) headers['Authorization'] = opts.rawAuth;
  const res = await fetch(BASE + url, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  return { status: res.status, data };
}

(async () => {
  const stamp = Date.now().toString().slice(-8);
  const cleanupFile = path.join(__dirname, 'security-cleanup.tmp');
  const manifest = { officerIds: [] };
  const saveCleanup = () => {
    let existing = { officerIds: [] };
    if (fs.existsSync(cleanupFile)) {
      try { existing = { ...existing, ...JSON.parse(fs.readFileSync(cleanupFile, 'utf8')) }; } catch (e) {}
    }
    fs.writeFileSync(cleanupFile, JSON.stringify({
      officerIds: [...new Set([...existing.officerIds, ...manifest.officerIds])],
    }));
  };

  // ================= SETUP =================
  let r = await req('POST', '/api/admin/auth/login', { json: true, body: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  const ADMIN_TOKEN = r.data?.token ?? null;
  if (!ADMIN_TOKEN) {
    console.error('SETUP FAILED: admin login returned no token (check ADMIN_EMAIL/ADMIN_PASSWORD in server/.env and that the server is running).');
    process.exit(1);
  }
  report('setup: admin login', true, 'token resolved');

  const officerNid = '61' + stamp.slice(-7);
  r = await req('POST', '/api/admin/field-officers', { token: ADMIN_TOKEN, json: true, body: {
    nameEn: 'Security Suite Officer', nid: officerNid, phone: '0192' + stamp.slice(-7),
    password: 'securitypass123', designation: 'Field Officer',
  }});
  const officerId = r.data?.data?.profile?.id ?? null;
  if (!officerId) {
    console.error('SETUP FAILED: could not provision a throwaway field officer:', r.data?.message ?? '?');
    process.exit(1);
  }
  manifest.officerIds.push(officerId);
  saveCleanup();
  report('setup: officer provisioned', true, `officer=${officerId}`);

  r = await req('POST', '/api/farmer/auth/login', { json: true, body: { identifier: `${officerNid}@sofol.local`, password: 'securitypass123' } });
  const OFFICER_TOKEN = r.data?.token ?? null;
  if (!OFFICER_TOKEN) {
    console.error('SETUP FAILED: throwaway officer login returned no token:', r.data?.message ?? '?');
    process.exit(1);
  }
  report('setup: officer login', true, 'token resolved');

  // ================= 1. TOKEN HANDLING =================
  // 1a. No Authorization header at all -> 401.
  r = await req('GET', '/api/field-officer/farmers', {});
  report('no auth header 401', r.status === 401, `msg=${r.data?.message}`);

  // 1b. Empty bearer -> 401.
  r = await req('GET', '/api/field-officer/farmers', { token: '' });
  report('empty bearer 401', r.status === 401, `msg=${r.data?.message}`);

  // 1c. Malformed tokens of several shapes -> 401 (never 500/leak).
  for (const [label, tok] of [
    ['garbage', 'not-a-real-token'],
    ['jwt-shaped junk', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.badsignature'],
    ['empty-ish', '.'],
  ]) {
    r = await req('GET', '/api/farmer/me', { token: tok });
    report(`malformed token (${label}) 401`, r.status === 401, `status=${r.status}`);
  }

  // 1d. Wrong scheme header (no Bearer prefix) is still treated as a raw
  // token by the middleware and must fail as 401.
  r = await req('GET', '/api/farmer/me', { rawAuth: 'Basic dXNlcjpwYXNz' });
  report('basic auth scheme 401', r.status === 401, `status=${r.status}`);

  // ================= 2. CLIENT-SUPPLIED ROLE IGNORED =================
  // 2a. Role in the login body must not change the resolved profile role.
  r = await req('POST', '/api/farmer/auth/login', { json: true, body: {
    identifier: `${officerNid}@sofol.local`, password: 'securitypass123', role: 'admin',
  }});
  report('login body role ignored', r.status === 200 && r.data?.profile?.role === 'field_officer',
    `role=${r.data?.profile?.role} (must stay field_officer)`);

  // 2b. The forged role does not open admin routes.
  r = await req('GET', '/api/admin/users', { token: r.data?.token });
  report('forged role cannot reach admin routes 403', r.status === 403, `msg=${r.data?.message}`);

  // 2c. Register with role=admin in the body — the created account must
  // still be a farmer, and its token must not reach admin routes.
  const regNid = '62' + stamp.slice(-7);
  r = await req('POST', '/api/farmer/auth/register', { json: true, body: {
    nameEn: 'Security Reg Farmer', nameBn: 'নিরাপত্তা কৃষক', nid: regNid, phone: '0193' + stamp.slice(-7),
    password: 'regfarmer123', dob: '1991-02-02', gender: 'male', role: 'admin', status: 'active',
  }});
  const regFarmerId = r.data?.data?.profile?.id ?? r.data?.data?.id ?? null;
  if (regFarmerId) manifest.officerIds.push(regFarmerId); // cleaned as an account fixture
  saveCleanup();
  report('register body role ignored', r.status === 201 && (r.data?.data?.profile?.role ?? r.data?.data?.role) === 'farmer',
    `role=${r.data?.data?.profile?.role ?? r.data?.data?.role}`);

  r = await req('POST', '/api/farmer/auth/login', { json: true, body: { identifier: `${regNid}@sofol.local`, password: 'regfarmer123' } });
  const REG_TOKEN = r.data?.token ?? null;
  if (REG_TOKEN) {
    r = await req('GET', '/api/admin/users', { token: REG_TOKEN });
    report('registered farmer cannot reach admin routes 403', r.status === 403, `msg=${r.data?.message}`);
  } else {
    report('registered farmer cannot reach admin routes 403', false, 'login after register failed');
  }

  // ================= 3. ADMIN LOCKOUT ATTEMPTS =================
  // 3a. Officer credentials against the admin login endpoint -> 401.
  r = await req('POST', '/api/admin/auth/login', { json: true, body: { identifier: `${officerNid}@sofol.local`, password: 'securitypass123' } });
  report('officer creds on admin login 401', r.status === 401, `status=${r.status}`);

  // 3b. Wrong password on the shared login endpoint -> 401.
  r = await req('POST', '/api/farmer/auth/login', { json: true, body: { identifier: `${officerNid}@sofol.local`, password: 'wrong-password' } });
  report('wrong password 401', r.status === 401, `status=${r.status}`);

  // 3c. Admin login with a wrong password -> 401 (no lockout bypass).
  r = await req('POST', '/api/admin/auth/login', { json: true, body: { identifier: ADMIN_EMAIL, password: 'not-the-admin-password' } });
  report('admin wrong password 401', r.status === 401, `status=${r.status}`);

  // ================= 4. IDOR VIA ADMIN ROUTES =================
  // A valid non-admin token cannot read another account's detail even with
  // the correct UUID in the path.
  r = await req('GET', `/api/admin/users/${officerId}`, { token: OFFICER_TOKEN });
  report('officer token cannot read user detail 403', r.status === 403, `msg=${r.data?.message}`);

  r = await req('GET', `/api/admin/users/${officerId}`, { token: REG_TOKEN });
  report('farmer token cannot read user detail 403', r.status === 403, `msg=${r.data?.message}`);

  // ================= 5. SUSPENSION ENFORCED EVERYWHERE =================
  // Suspend the officer; the still-valid token must be refused on officer
  // routes (403 not-active) and admin routes (403 not-admin) alike.
  r = await req('PATCH', `/api/admin/field-officers/${officerId}/status`, { token: ADMIN_TOKEN, json: true, body: { status: 'suspended' } });
  report('admin suspends officer 200', r.status === 200, `msg=${r.data?.message}`);

  r = await req('GET', '/api/field-officer/farmers', { token: OFFICER_TOKEN });
  report('suspended officer blocked on officer route 403', r.status === 403, `msg=${r.data?.message}`);

  r = await req('GET', '/api/admin/users', { token: OFFICER_TOKEN });
  report('suspended officer blocked on admin route 403', r.status === 403, `msg=${r.data?.message}`);

  r = await req('PATCH', `/api/admin/users/${officerId}/status`, { token: OFFICER_TOKEN, json: true, body: { status: 'active' } });
  report('suspended officer cannot self-reactivate 403', r.status === 403, `msg=${r.data?.message}`);

  // Reactivation restores access with the SAME token.
  r = await req('PATCH', `/api/admin/field-officers/${officerId}/status`, { token: ADMIN_TOKEN, json: true, body: { status: 'active' } });
  report('admin reactivates officer 200', r.status === 200, `msg=${r.data?.message}`);

  r = await req('GET', '/api/field-officer/farmers', { token: OFFICER_TOKEN });
  report('reactivated officer allowed 200', r.status === 200, `status=${r.status}`);

  // ================= 6. NO INTERNAL LEAKS ON ERRORS =================
  // Error bodies must be { message } — no stack traces, no Supabase hints.
  r = await req('POST', '/api/farmer/auth/login', { json: true, body: { identifier: '', password: '' } });
  const body = JSON.stringify(r.data ?? {});
  report('error bodies stay minimal', !/stack|supabase|postgres|PGRST/i.test(body), `len=${body.length}`);

  saveCleanup();

  const pass = results.filter(x => x.ok).length;
  console.log(`\n==== ${pass}/${results.length} passed ====`);
  console.log('Cleanup data written to test/security-cleanup.tmp — run: node test/cleanup.cjs');
  process.exit(pass === results.length ? 0 : 1);
})();
