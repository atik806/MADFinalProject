// Field Officer backend E2E: profile (GET/PUT + protected-field guard),
// assigned farmers (list/get/register/update + duplicate + IDOR), farmer
// verification (verify/update/reject/invalid), field visits (create/get/
// update/complete/protected fields), and cross-role auth checks.
//
// Self-provisioning: the suite no longer reads scripts/token.tmp or
// admin_token.tmp (which expired constantly). It logs in the admin from
// ADMIN_EMAIL/ADMIN_PASSWORD in server/.env, provisions a throwaway field
// officer, and logs in as that officer. If the .env admin is unavailable
// the suite exits with a clear setup error instead of a stream of 401s.
//
// Fixtures are cleaned via cleanup.tmp + node test/cleanup.cjs. The
// manifest is written eagerly after every created record so an early
// abort still leaves a complete removal list.
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

(async () => {
  const stamp = Date.now().toString().slice(-8);
  const cleanupFile = path.join(__dirname, 'cleanup.tmp');
  const manifest = { farmerId: null, officerId: null, visitId: null };
  const saveCleanup = () => fs.writeFileSync(cleanupFile, JSON.stringify(manifest));

  // ---------- self-provisioned tokens ----------
  const admin = await req('POST', '/api/admin/auth/login', { json: true, body: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  const ADMIN_TOKEN = admin.data?.token ?? null;
  if (!ADMIN_TOKEN) {
    console.error('SETUP FAILED: admin login returned no token (check ADMIN_EMAIL/ADMIN_PASSWORD in server/.env and that the server is running).');
    process.exit(1);
  }
  report('setup: admin login', true, 'token resolved');

  const NID_OFFICER = '55' + stamp.slice(-7);
  const created = await req('POST', '/api/admin/field-officers', { token: ADMIN_TOKEN, json: true, body: {
    nameEn: 'FO Suite Officer', nid: NID_OFFICER, phone: '019' + stamp.slice(-7),
    password: 'officersuite123', designation: 'Field Officer',
  }});
  const officerId = created.data?.data?.profile?.id ?? null;
  if (!officerId) {
    console.error('SETUP FAILED: could not provision a throwaway field officer:', created.data?.message ?? '?');
    process.exit(1);
  }
  manifest.officerId = officerId;
  saveCleanup();
  report('setup: officer provisioned', true, `officer=${officerId}`);

  const login = await req('POST', '/api/farmer/auth/login', { json: true, body: { identifier: `${NID_OFFICER}@sofol.local`, password: 'officersuite123' } });
  const TOKEN = login.data?.token ?? null;
  if (!TOKEN) {
    console.error('SETUP FAILED: throwaway officer login returned no token:', login.data?.message ?? '?');
    process.exit(1);
  }
  report('setup: officer login', true, 'token resolved');

  // 1. Profile GET /me
  let r = await req('GET', '/api/field-officer/profile/me', { token: TOKEN });
  report('profile/me 200', r.status === 200, `role=${r.data?.profile?.role ?? '?'} status=${r.data?.profile?.status ?? '?'}`);

  // 2. Profile PUT /me (updatable fields)
  r = await req('PUT', '/api/field-officer/profile/me', { token: TOKEN, json: true, body: { designation: 'Senior Field Officer', name_en: 'FO Suite Officer Renamed' } });
  report('profile/me PUT 200', r.status === 200, `designation=${r.data?.profile?.designation ?? '?'}`);

  // 3. Protected field not settable via PUT /me (role ignored, editable field applied)
  r = await req('PUT', '/api/field-officer/profile/me', { token: TOKEN, json: true, body: { role: 'admin', designation: 'Lead Field Officer' } });
  report('profile/me PUT ignores role', r.status === 200 && r.data?.profile?.role === 'field_officer', `role=${r.data?.profile?.role ?? '?'} (must stay field_officer) designation=${r.data?.profile?.designation ?? '?'}`);

  // 3b. Profile PUT with no updatable fields -> 400
  r = await req('PUT', '/api/field-officer/profile/me', { token: TOKEN, json: true, body: {} });
  report('profile/me PUT empty body 400', r.status === 400, `msg=${r.data?.message ?? '?'}`);

  // 3c. Malformed token -> 401 (invalid credentials surface as 401, not 500)
  r = await req('GET', '/api/field-officer/profile/me', { token: 'not-a-real-token' });
  report('profile/me malformed token 401', r.status === 401, `status=${r.status}`);

  // 4. Farmers list (the live database may already contain assigned farmers)
  r = await req('GET', '/api/field-officer/farmers?page=1&pageSize=10', { token: TOKEN });
  const initialFarmerTotal = r.data?.data?.pagination?.total ?? 0;
  report('farmers list 200', r.status === 200 && Array.isArray(r.data?.data?.items), `total=${initialFarmerTotal}`);

  // 5. Attempt to get unassigned farmer -> 404
  r = await req('GET', '/api/field-officer/farmers/00000000-0000-0000-0000-000000000000', { token: TOKEN });
  report('farmers get unassigned 404', r.status === 404, `msg=${r.data?.message ?? '?'}`);

  // 5b. Invalid farmer UUID -> 400 (validation before lookup)
  r = await req('GET', '/api/field-officer/farmers/not-a-uuid', { token: TOKEN });
  report('farmers get invalid uuid 400', r.status === 400, `msg=${r.data?.message ?? '?'}`);

  // 5c. Invalid pagination -> 400
  r = await req('GET', '/api/field-officer/farmers?page=-1&pageSize=999999', { token: TOKEN });
  report('farmers invalid pagination 400', r.status === 400, `msg=${r.data?.message ?? '?'}`);

  // 6. Register a new farmer via the officer (auth created + assigned)
  const NID = '77' + Date.now().toString().slice(-7);
  const FPHONE = '016' + Date.now().toString().slice(-8);
  r = await req('POST', '/api/field-officer/farmers', { token: TOKEN, json: true, body: {
    nameEn: 'Farmer Test One', nameBn: 'কৃষক', nid: NID, phone: FPHONE, password: 'farmerpass123',
    dob: '1990-01-01', gender: 'male', district: 'Bhola', upazila: 'Char Fasson'
  }});
  const farmerId = r.data?.data?.profile?.id;
  manifest.farmerId = farmerId ?? null;
  saveCleanup();
  report('farmers register 201', r.status === 201 && !!farmerId, `farmer=${farmerId} role=${r.data?.data?.profile?.role ?? '?'}`);
  report('farmers register no password leak', r.status === 201 && !JSON.stringify(r.data).includes('farmerpass123'), 'password not in response');

  // 7. Duplicate registration (same NID) -> 409
  r = await req('POST', '/api/field-officer/farmers', { token: TOKEN, json: true, body: {
    nameEn: 'Dup', nid: NID, phone: FPHONE, password: 'whatever123'
  }});
  report('farmers register duplicate 409', r.status === 409, `msg=${r.data?.message ?? '?'}`);

  // 9. Get the registered farmer (assigned to officer) -> 200
  r = await req('GET', `/api/field-officer/farmers/${farmerId}`, { token: TOKEN });
  report('farmers get assigned 200', r.status === 200, `farmer_id=${r.data?.data?.farmer_id ?? '?'}`);

  // 10. Farmers list now has 1 more
  r = await req('GET', '/api/field-officer/farmers', { token: TOKEN });
  report('farmers list includes new farmer', r.status === 200 && r.data?.data?.pagination?.total === initialFarmerTotal + 1, `total=${r.data?.data?.pagination?.total ?? '?'}`);

  // 11. Update the farmer
  r = await req('PUT', `/api/field-officer/farmers/${farmerId}`, { token: TOKEN, json: true, body: { occupation: 'Farmer', total_land: 3.5 } });
  report('farmers update 200', r.status === 200, `occupation=${r.data?.data?.occupation ?? '?'} total_land=${r.data?.data?.total_land ?? '?'}`);

  // 12. Update farmer cannot set privileged fields (ignored, editable applied)
  r = await req('PUT', `/api/field-officer/farmers/${farmerId}`, { token: TOKEN, json: true, body: { role: 'admin', is_verified: true, occupation: 'Sharecropper' } });
  report('farmers update ignores privileged', r.status === 200 && r.data?.data?.role === 'farmer' && r.data?.data?.is_verified !== true, `role=${r.data?.data?.role ?? '?'} is_verified=${r.data?.data?.is_verified ?? '?'} occupation=${r.data?.data?.occupation ?? '?'}`);

  // 13. Verification - verify the farmer
  r = await req('POST', `/api/field-officer/verification/farmers/${farmerId}`, { token: TOKEN, json: true, body: { status: 'verified', notes: 'All documents verified on site.' } });
  const verificationId = r.data?.data?.verification?.id;
  report('verification verify 200', r.status === 200, `status=${r.data?.data?.verification?.status ?? '?'} is_verified=${r.data?.data?.is_verified ?? '?'}`);

  // 13b. Update the officer-owned verification record
  r = await req('PUT', `/api/field-officer/verification/${verificationId}`, { token: TOKEN, json: true, body: { notes: 'Updated after second document review.' } });
  report('verification update 200', r.status === 200 && r.data?.data?.verification?.notes === 'Updated after second document review.', `status=${r.data?.data?.verification?.status ?? '?'}`);

  // 14. Verify current farmer profile is_verified = true
  r = await req('GET', `/api/field-officer/farmers/${farmerId}`, { token: TOKEN });
  report('farmer is_verified now true', r.data?.data?.is_verified === true, `is_verified=${r.data?.data?.is_verified ?? '?'}`);

  // 15. Verification history list
  r = await req('GET', '/api/field-officer/verification?status=verified', { token: TOKEN });
  report('verification list 200', r.status === 200 && Array.isArray(r.data?.data?.items), `total=${r.data?.data?.pagination?.total ?? '?'}`);

  // 16. Verification - reject -> is_verified back to false
  r = await req('POST', `/api/field-officer/verification/farmers/${farmerId}`, { token: TOKEN, json: true, body: { status: 'rejected', notes: 'Found mismatch in land documents.' } });
  report('verification reject 200', r.status === 200, `is_verified=${r.data?.data?.is_verified ?? '?'} (expect false)`);

  // 17. Invalid verification status -> 400
  r = await req('POST', `/api/field-officer/verification/farmers/${farmerId}`, { token: TOKEN, json: true, body: { status: 'hacked' } });
  report('verification invalid status 400', r.status === 400, `msg=${r.data?.message ?? '?'}`);

  // 18. Schedule a visit
  r = await req('POST', '/api/field-officer/visits', { token: TOKEN, json: true, body: { farmerId, scheduledDate: '2026-09-05T09:00:00Z', purpose: 'Land inspection', notes: 'Check irrigation' } });
  const visitId = r.data?.data?.id;
  manifest.visitId = visitId ?? null;
  saveCleanup();
  report('visits create 201', r.status === 201 && !!visitId, `visit=${visitId} status=${r.data?.data?.status ?? '?'}`);

  // 18b. Invalid dates are client errors, not server errors
  r = await req('POST', '/api/field-officer/visits', { token: TOKEN, json: true, body: { farmerId, visitDate: 'not-a-date' } });
  report('visits invalid date 400', r.status === 400, `msg=${r.data?.message ?? '?'}`);

  // 19. Schedule a visit for unassigned farmer -> 404 (use random id)
  r = await req('POST', '/api/field-officer/visits', { token: TOKEN, json: true, body: { farmerId: '00000000-0000-0000-0000-000000000000' } });
  report('visits create unassigned 404', r.status === 404, `msg=${r.data?.message ?? '?'}`);

  // 20. List visits
  r = await req('GET', '/api/field-officer/visits', { token: TOKEN });
  report('visits list 200', r.status === 200 && Array.isArray(r.data?.data?.items), `total=${r.data?.data?.pagination?.total ?? '?'}`);

  // 21. Get visit
  r = await req('GET', `/api/field-officer/visits/${visitId}`, { token: TOKEN });
  report('visits get 200', r.status === 200, `status=${r.data?.data?.status ?? '?'}`);

  // 22. Update visit
  r = await req('PUT', `/api/field-officer/visits/${visitId}`, { token: TOKEN, json: true, body: { purpose: 'Land inspection + crop assessment' } });
  report('visits update 200', r.status === 200, `purpose=${r.data?.data?.purpose ?? '?'}`);

  // 23. Update visit cannot set protected fields (ignored, editable applied)
  r = await req('PUT', `/api/field-officer/visits/${visitId}`, { token: TOKEN, json: true, body: { status: 'completed', field_officer_id: officerId, purpose: 'Inspected + notes added' } });
  report('visits update ignores protected', r.status === 200 && r.data?.data?.status === 'scheduled', `status=${r.data?.data?.status ?? '?'} (must stay scheduled) purpose=${r.data?.data?.purpose ?? '?'}`);

  // 24. Complete the visit
  r = await req('POST', `/api/field-officer/visits/${visitId}/complete`, { token: TOKEN });
  report('visits complete 200', r.status === 200 && r.data?.data?.status === 'completed', `status=${r.data?.data?.status ?? '?'}`);

  // 25. Complete already-completed -> 400/409
  r = await req('POST', `/api/field-officer/visits/${visitId}/complete`, { token: TOKEN });
  report('visits complete twice rejected', r.status !== 200, `msg=${r.data?.message ?? '?'}`);

  // 26. Access another officer's visit -> 404 (random id)
  r = await req('GET', '/api/field-officer/visits/00000000-0000-0000-0000-000000000000', { token: TOKEN });
  report('visits foreign get 404', r.status === 404, `msg=${r.data?.message ?? '?'}`);

  // 27. No token -> 401
  r = await req('GET', '/api/field-officer/farmers', { token: '' });
  report('farmers no token 401', r.status === 401, `msg=${r.data?.message ?? '?'}`);

  // 28. Admin token on officer route -> 403
  r = await req('GET', '/api/field-officer/farmers', { token: ADMIN_TOKEN });
  report('farmers admin token 403', r.status === 403, `msg=${r.data?.message ?? '?'}`);

  // 29. Admin token on /me -> 403
  r = await req('GET', '/api/field-officer/profile/me', { token: ADMIN_TOKEN });
  report('profile/me admin token 403', r.status === 403, `msg=${r.data?.message ?? '?'}`);

  // 30. Suspended officer keeps token but loses access immediately.
  // Admin suspends the throwaway officer; the still-valid token must now
  // get 403 on a protected route (status is re-read per request).
  r = await req('PATCH', `/api/admin/field-officers/${officerId}/status`, { token: ADMIN_TOKEN, json: true, body: { status: 'suspended' } });
  report('admin suspends officer 200', r.status === 200, `msg=${r.data?.message ?? '?'}`);

  r = await req('GET', '/api/field-officer/farmers', { token: TOKEN });
  report('suspended officer blocked 403', r.status === 403, `msg=${r.data?.message ?? '?'}`);

  // 31. Reactivation restores access with the SAME token.
  r = await req('PATCH', `/api/admin/field-officers/${officerId}/status`, { token: ADMIN_TOKEN, json: true, body: { status: 'active' } });
  report('admin reactivates officer 200', r.status === 200, `msg=${r.data?.message ?? '?'}`);

  r = await req('GET', '/api/field-officer/farmers', { token: TOKEN });
  report('reactivated officer allowed 200', r.status === 200, `status=${r.status}`);

  // 32. Invalid status transition value -> 400
  r = await req('PATCH', `/api/admin/field-officers/${officerId}/status`, { token: ADMIN_TOKEN, json: true, body: { status: 'teleported' } });
  report('admin invalid status 400', r.status === 400, `msg=${r.data?.message ?? '?'}`);

  // Manifest is already saved with officerId/farmerId/visitId.
  saveCleanup();

  const pass = results.filter(x => x.ok).length;
  console.log(`\n==== ${pass}/${results.length} passed ====`);
  process.exit(pass === results.length ? 0 : 1);
})();
