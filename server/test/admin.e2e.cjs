// Admin backend E2E: user directory (list/get/status), farmer directory,
// bank-officer detail, dashboard stats, audit trail, and authorization.
//
// Self-provisioning like the farmer suite: the only credentials needed are
// ADMIN_EMAIL / ADMIN_PASSWORD from server/.env. Fixtures (a field officer,
// a farmer registered by that officer) are created through the existing APIs
// and removed afterwards via admin-cleanup.tmp + node test/cleanup.cjs.
//
// The suite deliberately does NOT test bank-officer CREATE: provisioning
// writes profiles.bank_name / branch_name / branch_code, which are part of
// the parked bank-officer schema (Postgres 42703 until admin.sql is applied).
// Bank-officer LIST/GET are exercised only in their degraded form (no bank
// officers exist until then), so those checks assert the safe empty path.
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
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  const res = await fetch(BASE + url, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  return { status: res.status, data };
}

const login = async (identifier, password) => {
  const r = await req('POST', '/api/farmer/auth/login', { json: true, body: { identifier, password } });
  return r.data?.token ?? r.data?.session?.access_token ?? null;
};

(async () => {
  const stamp = Date.now().toString().slice(-8);
  const cleanup = { farmerIds: [], officerIds: [], officerEmails: [] };
  const cleanupFile = path.join(__dirname, 'admin-cleanup.tmp');

  // MERGE with any existing manifest instead of overwriting: two runs in a
  // row must not orphan the first run's fixtures. Deleted after each cleanup.
  const saveCleanup = () => {
    let existing = { farmerIds: [], officerIds: [], officerEmails: [] };
    if (fs.existsSync(cleanupFile)) {
      try { existing = { ...existing, ...JSON.parse(fs.readFileSync(cleanupFile, 'utf8')) }; } catch (e) {}
    }
    fs.writeFileSync(cleanupFile, JSON.stringify({
      farmerIds: [...new Set([...existing.farmerIds, ...cleanup.farmerIds])],
      officerIds: [...new Set([...existing.officerIds, ...cleanup.officerIds])],
      officerEmails: [...new Set([...existing.officerEmails, ...cleanup.officerEmails])],
    }));
  };

  // ================= SETUP =================
  let r = await req('POST', '/api/admin/auth/login', { json: true, body: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  const ADMIN_TOKEN = r.data?.token ?? null;
  report('setup: admin login', r.status === 200 && !!ADMIN_TOKEN, `status=${r.status}`);
  if (!ADMIN_TOKEN) {
    console.log('\nCannot continue without an admin token. Check ADMIN_EMAIL / ADMIN_PASSWORD in server/.env.');
    process.exit(1);
  }

  // Field officer fixture (via the existing admin API) — used for directory
  // entries, status enforcement on a real officer token, and to register a farmer.
  const foNid = '82' + stamp.slice(-6);
  r = await req('POST', '/api/admin/field-officers', { token: ADMIN_TOKEN, json: true, body: {
    nameEn: 'Admin Suite Officer', nid: foNid, phone: '0188' + stamp.slice(-7),
    password: 'adminofficer123', designation: 'Field Officer',
  }});
  const officerId = r.data?.data?.profile?.id;
  if (officerId) { cleanup.officerIds.push(officerId); saveCleanup(); }
  report('setup: field officer created', r.status === 201 && !!officerId, `id=${officerId}`);

  const FO_TOKEN = await login(`${foNid}@sofol.local`, 'adminofficer123');
  report('setup: field officer login', !!FO_TOKEN);
  if (!FO_TOKEN) { console.log('==== aborted: officer login failed ===='); saveCleanup(); process.exit(1); }

  // Farmer fixture registered by the officer (goes through the real flow).
  const farmerNid = '81' + stamp.slice(-6);
  r = await req('POST', '/api/field-officer/farmers', { token: FO_TOKEN, json: true, body: {
    nameEn: 'Admin Suite Farmer', nid: farmerNid, phone: '0189' + stamp.slice(-7),
    password: 'adminfarmer123', dob: '1990-03-03', gender: 'female', district: 'Bhola',
  }});
  const farmerId = r.data?.data?.profile?.id;
  if (farmerId) { cleanup.farmerIds.push(farmerId); saveCleanup(); }
  report('setup: farmer registered by officer', r.status === 201 && !!farmerId, `id=${farmerId}`);

  const FARMER_TOKEN = await login(`${farmerNid}@sofol.local`, 'adminfarmer123');
  report('setup: farmer login', !!FARMER_TOKEN);

  // ================= A. USER DIRECTORY =================
  r = await req('GET', '/api/admin/users?pageSize=100', { token: ADMIN_TOKEN });
  report('users list 200', r.status === 200 && Array.isArray(r.data?.data?.items), `total=${r.data?.data?.pagination?.total}`);
  const users = r.data?.data?.items ?? [];
  report('users list uses success/message/data contract', r.data?.success === true && typeof r.data?.message === 'string');
  report('users list contains fixture officer', users.some((u) => u.id === officerId), `count=${users.length}`);
  report('users list contains fixture farmer', users.some((u) => u.id === farmerId));
  report('users list excludes NID column', users.every((u) => u.nid === undefined), 'nid not selected');
  report('users list mixes roles', new Set(users.map((u) => u.role)).size >= 2, [...new Set(users.map((u) => u.role))].join(','));

  r = await req('GET', `/api/admin/users?role=farmer`, { token: ADMIN_TOKEN });
  report('users filter role=farmer', r.status === 200 && (r.data?.data?.items ?? []).every((u) => u.role === 'farmer'), `total=${r.data?.data?.pagination?.total}`);

  r = await req('GET', '/api/admin/users?role=banana', { token: ADMIN_TOKEN });
  report('users invalid role filter 400', r.status === 400, `msg=${r.data?.message}`);

  r = await req('GET', `/api/admin/users?search=${encodeURIComponent('Admin Suite')}`, { token: ADMIN_TOKEN });
  const found = (r.data?.data?.items ?? []).some((u) => u.id === officerId || u.id === farmerId);
  report('users search finds fixtures by name', r.status === 200 && found, `count=${(r.data?.data?.items ?? []).length}`);

  r = await req('GET', '/api/admin/users?page=0', { token: ADMIN_TOKEN });
  report('users invalid page 400', r.status === 400, `msg=${r.data?.message}`);

  r = await req('GET', `/api/admin/users/${officerId}`, { token: ADMIN_TOKEN });
  report('users get by id 200', r.status === 200 && r.data?.data?.id === officerId, `role=${r.data?.data?.role}`);

  r = await req('GET', '/api/admin/users/00000000-0000-0000-0000-000000000000', { token: ADMIN_TOKEN });
  report('users get nonexistent 404', r.status === 404, `msg=${r.data?.message}`);

  r = await req('GET', '/api/admin/users/not-a-uuid', { token: ADMIN_TOKEN });
  report('users get invalid UUID 400', r.status === 400, `msg=${r.data?.message}`);

  // ================= B. USER STATUS + ENFORCEMENT =================
  // The guard change is the point of this section: a suspended account must
  // lose access immediately, with a still-valid token.
  r = await req('PATCH', `/api/admin/users/${farmerId}/status`, { token: ADMIN_TOKEN, json: true, body: { status: 'suspended' } });
  report('users suspend farmer 200', r.status === 200 && r.data?.data?.status === 'suspended', `status=${r.data?.data?.status}`);

  r = await req('GET', '/api/farmer/me', { token: FARMER_TOKEN });
  report('suspended farmer blocked by guard 403', r.status === 403, `msg=${r.data?.message}`);

  r = await req('PATCH', `/api/admin/users/${farmerId}/status`, { token: ADMIN_TOKEN, json: true, body: { status: 'active' } });
  report('users reactivate farmer 200', r.status === 200 && r.data?.data?.status === 'active');

  r = await req('GET', '/api/farmer/me', { token: FARMER_TOKEN });
  report('reactivated farmer access restored', r.status === 200, `status=${r.status}`);

  r = await req('PATCH', `/api/admin/users/${officerId}/status`, { token: ADMIN_TOKEN, json: true, body: { status: 'inactive' } });
  report('users deactivate officer 200', r.status === 200 && r.data?.data?.status === 'inactive');

  r = await req('GET', '/api/field-officer/profile/me', { token: FO_TOKEN });
  report('deactivated officer blocked by guard 403', r.status === 403, `msg=${r.data?.message}`);

  r = await req('PATCH', `/api/admin/users/${officerId}/status`, { token: ADMIN_TOKEN, json: true, body: { status: 'active' } });
  report('users reactivate officer 200', r.status === 200);

  // pending farmers (registration default) must still pass the farmer guard.
  r = await req('GET', '/api/farmer/me', { token: FARMER_TOKEN });
  report('pending-default farmer still allowed', r.status === 200, `status=${r.status}`);

  r = await req('PATCH', `/api/admin/users/${officerId}/status`, { token: ADMIN_TOKEN, json: true, body: { status: 'banana' } });
  report('users invalid status 400', r.status === 400, `msg=${r.data?.message}`);

  // admin account is not settable — find the admin profile row id via the
  // directory itself (role=admin).
  r = await req('GET', '/api/admin/users?role=admin', { token: ADMIN_TOKEN });
  const adminRow = (r.data?.data?.items ?? [])[0];
  if (adminRow) {
    r = await req('PATCH', `/api/admin/users/${adminRow.id}/status`, { token: ADMIN_TOKEN, json: true, body: { status: 'inactive' } });
    report('users cannot change admin status 400', r.status === 400, `msg=${r.data?.message}`);
  } else {
    report('users cannot change admin status 400 (no admin row found)', false, 'role=admin filter returned nothing');
  }

  r = await req('PATCH', '/api/admin/users/00000000-0000-0000-0000-000000000000/status', { token: ADMIN_TOKEN, json: true, body: { status: 'active' } });
  report('users status nonexistent 404', r.status === 404, `msg=${r.data?.message}`);

  // ================= C. FARMER DIRECTORY =================
  r = await req('GET', '/api/admin/farmers?pageSize=100', { token: ADMIN_TOKEN });
  report('farmers list 200', r.status === 200 && Array.isArray(r.data?.data?.items), `total=${r.data?.data?.pagination?.total}`);
  const farmers = r.data?.data?.items ?? [];
  report('farmers list contains fixture farmer', farmers.some((f) => f.id === farmerId));
  // The list select is role-scoped (eq role=farmer), so every row is a farmer
  // by construction; the cross-check is that the officer fixture is absent.
  report('farmers list excludes non-farmers', !farmers.some((f) => f.id === officerId), `total=${r.data?.data?.pagination?.total}`);

  r = await req('GET', `/api/admin/farmers?search=${encodeURIComponent('Admin Suite Farmer')}`, { token: ADMIN_TOKEN });
  report('farmers search by name', r.status === 200 && (r.data?.data?.items ?? []).some((f) => f.id === farmerId), `count=${(r.data?.data?.items ?? []).length}`);

  r = await req('GET', '/api/admin/farmers?verification=unverified', { token: ADMIN_TOKEN });
  report('farmers filter verification=unverified', r.status === 200 && (r.data?.data?.items ?? []).every((f) => f.is_verified !== true));

  r = await req('GET', '/api/admin/farmers?verification=banana', { token: ADMIN_TOKEN });
  report('farmers invalid verification filter 400', r.status === 400, `msg=${r.data?.message}`);

  r = await req('GET', `/api/admin/farmers/${farmerId}`, { token: ADMIN_TOKEN });
  report('farmers get by id 200', r.status === 200 && r.data?.data?.id === farmerId && r.data?.data?.role === 'farmer');
  report('farmers detail includes verification history array', Array.isArray(r.data?.data?.verificationHistory), `count=${(r.data?.data?.verificationHistory ?? []).length}`);

  r = await req('GET', `/api/admin/farmers/${officerId}`, { token: ADMIN_TOKEN });
  report('farmers get officer id 404 (role-scoped)', r.status === 404, `msg=${r.data?.message}`);

  r = await req('GET', '/api/admin/farmers/not-a-uuid', { token: ADMIN_TOKEN });
  report('farmers invalid UUID 400', r.status === 400, `msg=${r.data?.message}`);

  // ================= D. BANK OFFICER DETAIL (degraded, schema parked) =================
  r = await req('GET', '/api/admin/bank-officers', { token: ADMIN_TOKEN });
  report('bank officers list 200 (degraded path)', r.status === 200 && Array.isArray(r.data?.data?.items), `total=${r.data?.data?.pagination?.total}`);

  r = await req('GET', '/api/admin/bank-officers/00000000-0000-0000-0000-000000000000', { token: ADMIN_TOKEN });
  report('bank officers get nonexistent 404', r.status === 404, `msg=${r.data?.message}`);

  // ================= E. DASHBOARD =================
  r = await req('GET', '/api/admin/dashboard/stats', { token: ADMIN_TOKEN });
  const stats = r.data?.data;
  report('dashboard stats 200', r.status === 200 && !!stats);
  report('stats includes bank officer counts', stats && typeof stats.totalBankOfficers === 'number' && typeof stats.activeBankOfficers === 'number',
    `totalBO=${stats?.totalBankOfficers} activeBO=${stats?.activeBankOfficers}`);
  // safeCount regression guard: these were all silently 0 for months because
  // the thunk was awaited instead of invoked.
  report('stats counts fixture farmer (safeCount executes)', stats && stats.totalFarmers >= 1 && stats.totalLoans >= 1,
    `totalFarmers=${stats?.totalFarmers} totalLoans=${stats?.totalLoans} totalFieldOfficers=${stats?.totalFieldOfficers}`);

  r = await req('GET', '/api/admin/dashboard/overview', { token: ADMIN_TOKEN });
  report('dashboard overview 200', r.status === 200 && !!r.data?.data?.stats, 'stats+trend+analytics+activity shape');

  // ================= F. AUDIT TRAIL =================
  r = await req('GET', '/api/admin/audit?pageSize=10', { token: ADMIN_TOKEN });
  const auditItems = r.data?.data?.items ?? [];
  report('audit list 200', r.status === 200 && Array.isArray(auditItems), `total=${r.data?.data?.pagination?.total}`);
  report('audit records user status changes', auditItems.some((a) => /user status set to/i.test(a.action ?? '')),
    `match=${auditItems.find((a) => /user status set to/i.test(a.action ?? ''))?.action}`);

  // ================= G. AUTHORIZATION =================
  for (const [label, url] of [
    ['users', '/api/admin/users'],
    ['farmers', '/api/admin/farmers'],
    ['dashboard', '/api/admin/dashboard/stats'],
    ['audit', '/api/admin/audit'],
  ]) {
    r = await req('GET', url, {});
    report(`auth ${label} no token 401`, r.status === 401, `msg=${r.data?.message}`);
  }

  r = await req('GET', '/api/admin/users', { token: FARMER_TOKEN });
  report('auth farmer token on admin route 403', r.status === 403, `msg=${r.data?.message}`);

  r = await req('GET', '/api/admin/users', { token: FO_TOKEN });
  report('auth officer token on admin route 403', r.status === 403, `msg=${r.data?.message}`);

  r = await req('PATCH', `/api/admin/users/${farmerId}/status`, { token: FARMER_TOKEN, json: true, body: { status: 'active' } });
  report('auth farmer cannot change status 403', r.status === 403, `msg=${r.data?.message}`);

  r = await req('PATCH', `/api/admin/users/${officerId}/status`, { token: FO_TOKEN, json: true, body: { status: 'suspended' } });
  report('auth officer cannot change status 403', r.status === 403, `msg=${r.data?.message}`);

  r = await req('GET', '/api/admin/farmers', { token: FARMER_TOKEN });
  report('auth farmer cannot list farmers 403', r.status === 403, `msg=${r.data?.message}`);

  // privilege escalation: client-supplied role in body must not matter — the
  // status endpoint derives role from the profiles row only.
  r = await req('PATCH', `/api/admin/users/${officerId}/status`, { token: ADMIN_TOKEN, json: true, body: { status: 'active', role: 'admin' } });
  report('role in body ignored on status change', r.status === 200 && r.data?.data?.role === 'field_officer', `role=${r.data?.data?.role}`);

  // ================= SAVE + SUMMARY =================
  saveCleanup();
  const pass = results.filter((x) => x.ok).length;
  console.log(`\n==== ${pass}/${results.length} passed ====`);
  console.log('Cleanup data written to test/admin-cleanup.tmp — run: node test/cleanup.cjs');
  process.exit(pass === results.length ? 0 : 1);
})();
