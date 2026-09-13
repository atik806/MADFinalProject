// Field Officer LOAN workflow E2E: draft create/update/submit/verify/
// forward, validation failures, protected-field injection guards,
// cross-officer IDOR (officer B is not assigned to officer A's farmer),
// and status-enforcement (suspension blocks access mid-token).
//
// Self-provisioning: no dependency on scripts/token.tmp or
// test/admin_token.tmp. The admin token comes from ADMIN_EMAIL/
// ADMIN_PASSWORD in server/.env; officers A and B are provisioned through
// the admin API and log in through the login route.
//
// Fixtures are cleaned via loan-cleanup.tmp + node test/cleanup.cjs. The
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

// Provision a throwaway field officer through the admin API and return
// { id, token }. Used for both the primary officer (A) and the IDOR
// officer (B).
async function provisionOfficer(adminToken, nameEn, nid, phone, password) {
  const created = await req('POST', '/api/admin/field-officers', { token: adminToken, json: true, body: {
    nameEn, nid, phone, password, designation: 'Field Officer',
  }});
  const id = created.data?.data?.profile?.id ?? null;
  if (!id) return { error: created.data?.message ?? 'no officer id' };
  const login = await req('POST', '/api/farmer/auth/login', { json: true, body: { identifier: `${nid}@sofol.local`, password } });
  const token = login.data?.token ?? null;
  if (!token) return { error: login.data?.message ?? 'officer login failed' };
  return { id, token };
}

(async () => {
  const stamp = Date.now().toString().slice(-8);
  const cleanupFile = path.join(__dirname, 'loan-cleanup.tmp');
  const manifest = { farmerId: null, officerAId: null, officerBId: null, loanIds: [], officerBEmail: null };
  const saveCleanup = () => fs.writeFileSync(cleanupFile, JSON.stringify(manifest));

  // ---------- self-provisioned tokens ----------
  const admin = await req('POST', '/api/admin/auth/login', { json: true, body: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  const ADMIN_TOKEN = admin.data?.token ?? null;
  if (!ADMIN_TOKEN) {
    console.error('SETUP FAILED: admin login returned no token (check ADMIN_EMAIL/ADMIN_PASSWORD in server/.env and that the server is running).');
    process.exit(1);
  }
  report('setup: admin login', true, 'token resolved');

  // Officer A — drives the whole positive workflow.
  const officerA = await provisionOfficer(ADMIN_TOKEN, 'Officer A Loans Test', '88' + stamp.slice(-6), '014' + stamp.slice(-7), 'officerapass123');
  if (!officerA.token) {
    console.error('SETUP FAILED: officer A provisioning:', officerA.error);
    process.exit(1);
  }
  const TOKEN = officerA.token;
  manifest.officerAId = officerA.id;
  saveCleanup();

  // Officer B — real field officer with NO assignments; proves scoping/IDOR.
  const officerB = await provisionOfficer(ADMIN_TOKEN, 'Officer B Loans Test', '99' + stamp.slice(-6), '017' + stamp.slice(-7), 'officerbpass123');
  if (!officerB.token) {
    console.error('SETUP FAILED: officer B provisioning:', officerB.error);
    process.exit(1);
  }
  manifest.officerBId = officerB.id;
  manifest.officerBEmail = `99${stamp.slice(-6)}@sofol.local`;
  saveCleanup();
  report('setup: officers A and B provisioned', true, `A=${officerA.id} B=${officerB.id}`);

  // ---------- Officer A positive workflow ----------
  // A1. Create a farmer to own the loans (officer A registers)
  const NID = '66' + Date.now().toString().slice(-7);
  const FPHONE = '015' + Date.now().toString().slice(-8);
  let r = await req('POST', '/api/field-officer/farmers', { token: TOKEN, json: true, body: {
    nameEn: 'Loan Farmer One', nid: NID, phone: FPHONE, password: 'farmerpass123',
    dob: '1985-05-05', gender: 'female', district: 'Bhola'
  }});
  const farmerId = r.data?.data?.profile?.id;
  manifest.farmerId = farmerId ?? null;
  saveCleanup();
  report('setup: farmer registered', r.status === 201 && !!farmerId, `farmer=${farmerId}`);

  // A2. Create a draft loan application for the assigned farmer
  r = await req('POST', '/api/field-officer/loans', { token: TOKEN, json: true, body: {
    farmerId, title: 'Paddy Cultivation Loan', amount: 25000, duration: '12 months',
    purpose: 'Buy seeds and fertilizer', installmentType: 'monthly', emi: 2200, interest: 9
  }});
  const loanId = r.data?.data?.id;
  if (loanId) { manifest.loanIds.push(loanId); saveCleanup(); }
  report('loans create draft 201', r.status === 201 && !!loanId, `loan=${loanId} status=${r.data?.data?.status} vs=${r.data?.data?.verification_status}`);
  report('loans create draft has officer stamp', r.status === 201 && r.data?.data?.field_officer_id !== undefined, `field_officer_id=${r.data?.data?.field_officer_id}`);

  // A3. Draft rejection reasons recorded server-side
  report('loans create persisted draft status', r.data?.data?.status === 'draft');

  // A4. Invalid create: bad installmentType -> 400
  r = await req('POST', '/api/field-officer/loans', { token: TOKEN, json: true, body: {
    farmerId, title: 'X', amount: 100, duration: '6 months', purpose: 'p', installmentType: 'weekly'
  }});
  report('loans create invalid installmentType 400', r.status === 400, `msg=${r.data?.message}`);

  // A5. Invalid create: zero amount -> 400
  r = await req('POST', '/api/field-officer/loans', { token: TOKEN, json: true, body: {
    farmerId, title: 'X', amount: 0, duration: '6 months', purpose: 'p', installmentType: 'monthly'
  }});
  report('loans create zero amount 400', r.status === 400, `msg=${r.data?.message}`);

  // A6. Invalid create: missing required field -> 400
  r = await req('POST', '/api/field-officer/loans', { token: TOKEN, json: true, body: { farmerId, title: 'Only title' } });
  report('loans create missing fields 400', r.status === 400, `msg=${r.data?.message}`);

  // A7. Create for a NON-assigned farmer -> 404
  r = await req('POST', '/api/field-officer/loans', { token: TOKEN, json: true, body: {
    farmerId: '00000000-0000-0000-0000-000000000000', title: 'X', amount: 100, duration: '6m', purpose: 'p', installmentType: 'monthly'
  }});
  report('loans create unassigned farmer 404', r.status === 404, `msg=${r.data?.message}`);

  // A8. Invalid farmer UUID -> 400
  r = await req('POST', '/api/field-officer/loans', { token: TOKEN, json: true, body: {
    farmerId: 'not-a-uuid', title: 'X', amount: 100, duration: '6m', purpose: 'p', installmentType: 'monthly'
  }});
  report('loans create invalid farmer UUID 400', r.status === 400, `msg=${r.data?.message}`);

  // A9. List loan applications (scoped to officer A's assignments)
  r = await req('GET', '/api/field-officer/loans?page=1&pageSize=10', { token: TOKEN });
  const loanListTotal = r.data?.data?.pagination?.total ?? 0;
  report('loans list 200', r.status === 200 && Array.isArray(r.data?.data?.items), `total=${loanListTotal}`);
  const listedLoan = (r.data?.data?.items ?? []).find((x) => x.id === loanId);
  report('loans list includes created draft', !!listedLoan, `found=${!!listedLoan} farmer_name=${listedLoan?.farmer?.name_en ?? '?'}`);

  // A10. List filter: status=draft
  r = await req('GET', '/api/field-officer/loans?status=draft', { token: TOKEN });
  report('loans list filter status=draft 200', r.status === 200 && (r.data?.data?.items ?? []).some((x) => x.id === loanId), `count=${r.data?.data?.pagination?.total}`);

  // A11. List filter: invalid status -> 400
  r = await req('GET', '/api/field-officer/loans?status=teleported', { token: TOKEN });
  report('loans list invalid status filter 400', r.status === 400, `msg=${r.data?.message}`);

  // A12. List filter: invalid verificationStatus -> 400
  r = await req('GET', '/api/field-officer/loans?verificationStatus=banana', { token: TOKEN });
  report('loans list invalid verification filter 400', r.status === 400, `msg=${r.data?.message}`);

  // A13. Get the loan application
  r = await req('GET', `/api/field-officer/loans/${loanId}`, { token: TOKEN });
  report('loans get 200', r.status === 200 && r.data?.data?.id === loanId, `timeline_steps=${(r.data?.data?.timeline ?? []).length}`);

  // A14. Get nonexistent loan -> 404
  r = await req('GET', '/api/field-officer/loans/00000000-0000-0000-0000-000000000000', { token: TOKEN });
  report('loans get nonexistent 404', r.status === 404, `msg=${r.data?.message}`);

  // A15. Get invalid UUID -> 400
  r = await req('GET', '/api/field-officer/loans/not-a-uuid', { token: TOKEN });
  report('loans get invalid UUID 400', r.status === 400, `msg=${r.data?.message}`);

  // A16. Update the draft (permitted fields)
  r = await req('PUT', `/api/field-officer/loans/${loanId}`, { token: TOKEN, json: true, body: { amount: 30000, purpose: 'Seeds, fertilizer and irrigation' } });
  report('loans update draft 200', r.status === 200 && Number(r.data?.data?.amount) === 30000, `amount=${r.data?.data?.amount}`);

  // A17. Update cannot set protected fields (status/verification/officer ignored)
  r = await req('PUT', `/api/field-officer/loans/${loanId}`, { token: TOKEN, json: true, body: {
    status: 'approved', verification_status: 'verified', farmer_id: officerB.id, field_officer_id: officerB.id,
    title: 'Paddy Cultivation Loan v2'
  }});
  report('loans update ignores protected fields', r.status === 200 && r.data?.data?.status === 'draft' && r.data?.data?.verification_status === 'pending' && r.data?.data?.farmer_id === farmerId,
    `status=${r.data?.data?.status} vs=${r.data?.data?.verification_status} title=${r.data?.data?.title}`);

  // A18. Submit the draft -> pending
  r = await req('POST', `/api/field-officer/loans/${loanId}/submit`, { token: TOKEN });
  report('loans submit 200', r.status === 200 && r.data?.data?.status === 'pending', `status=${r.data?.data?.status} app_date=${r.data?.data?.application_date}`);

  // A19. Submit again -> rejected (invalid transition)
  r = await req('POST', `/api/field-officer/loans/${loanId}/submit`, { token: TOKEN });
  report('loans submit twice rejected', r.status !== 200, `status=${r.status} msg=${r.data?.message}`);

  // A20. Update a submitted (non-draft) loan -> rejected
  r = await req('PUT', `/api/field-officer/loans/${loanId}`, { token: TOKEN, json: true, body: { amount: 1 } });
  report('loans update after submit rejected', r.status === 400, `msg=${r.data?.message}`);

  // A21. Verify the submitted loan
  r = await req('POST', `/api/field-officer/loans/${loanId}/verify`, { token: TOKEN, json: true, body: { status: 'verified', notes: 'Land and documents checked on site.' } });
  report('loans verify 200', r.status === 200 && r.data?.data?.verification_status === 'verified', `vs=${r.data?.data?.verification_status} verified_at=${r.data?.data?.verified_at}`);

  // A22. Invalid verdict -> 400
  r = await req('POST', `/api/field-officer/loans/${loanId}/verify`, { token: TOKEN, json: true, body: { status: 'maybe' } });
  report('loans verify invalid verdict 400', r.status === 400, `msg=${r.data?.message}`);

  // A23. Forward (after verification)
  r = await req('POST', `/api/field-officer/loans/${loanId}/forward`, { token: TOKEN, json: true, body: { recommendedAmount: 28000 } });
  report('loans forward 200', r.status === 200 && !!r.data?.data?.forwarded_at, `fwd_at=${r.data?.data?.forwarded_at} rec=${r.data?.data?.recommended_amount}`);

  // A23b. Forward twice -> rejected (already with the bank)
  r = await req('POST', `/api/field-officer/loans/${loanId}/forward`, { token: TOKEN, json: true, body: {} });
  report('loans forward twice blocked', r.status === 400, `msg=${r.data?.message}`);

  // A23c. Verify after forward -> rejected (bank domain now)
  r = await req('POST', `/api/field-officer/loans/${loanId}/verify`, { token: TOKEN, json: true, body: { status: 'verified' } });
  report('loans verify after forward blocked', r.status === 400, `msg=${r.data?.message}`);

  // A24. Draft cannot be verified (new draft needed)
  r = await req('POST', '/api/field-officer/loans', { token: TOKEN, json: true, body: {
    farmerId, title: 'Draft For Verify Guard', amount: 500, duration: '3 months', purpose: 'guard test', installmentType: 'seasonal'
  }});
  const draft2Id = r.data?.data?.id;
  if (draft2Id) { manifest.loanIds.push(draft2Id); saveCleanup(); }
  r = await req('POST', `/api/field-officer/loans/${draft2Id}/verify`, { token: TOKEN, json: true, body: { status: 'verified' } });
  report('loans verify draft rejected', r.status === 400, `msg=${r.data?.message}`);

  // A25. Draft cannot be forwarded
  r = await req('POST', `/api/field-officer/loans/${draft2Id}/forward`, { token: TOKEN, json: true, body: {} });
  report('loans forward unverified/draft rejected', r.status === 400, `msg=${r.data?.message}`);

  // A26. Rejected verification cannot forward: verify reject on draft2 after submit
  r = await req('POST', `/api/field-officer/loans/${draft2Id}/submit`, { token: TOKEN });
  r = await req('POST', `/api/field-officer/loans/${draft2Id}/verify`, { token: TOKEN, json: true, body: { status: 'rejected', notes: 'Insufficient land documents.' } });
  report('loans verify rejected verdict 200', r.status === 200 && r.data?.data?.verification_status === 'rejected', `vs=${r.data?.data?.verification_status}`);
  r = await req('POST', `/api/field-officer/loans/${draft2Id}/forward`, { token: TOKEN, json: true, body: {} });
  report('loans forward rejected verdict blocked', r.status === 400, `msg=${r.data?.message}`);

  // ---------- Authorization ----------
  // B1. No token -> 401
  r = await req('GET', '/api/field-officer/loans', { token: '' });
  report('loans no token 401', r.status === 401, `msg=${r.data?.message}`);

  // B2. Admin token on officer route -> 403
  r = await req('GET', '/api/field-officer/loans', { token: ADMIN_TOKEN });
  report('loans admin token 403', r.status === 403, `msg=${r.data?.message}`);

  // B3. Wrong-role token cannot create
  r = await req('POST', '/api/field-officer/loans', { token: ADMIN_TOKEN, json: true, body: { farmerId, title: 'X', amount: 1, duration: '1m', purpose: 'x', installmentType: 'monthly' } });
  report('loans create admin token 403', r.status === 403, `msg=${r.data?.message}`);

  // B4. Officer B (a real field officer, but NOT assigned to this farmer)
  // must not see officer A's loan.
  {
    const officerBToken = officerB.token;
    // B4a. Officer B list is scoped to their own assignments (empty)
    r = await req('GET', '/api/field-officer/loans', { token: officerBToken });
    report('loans officer B scoped empty list 200', r.status === 200 && (r.data?.data?.items ?? []).length === 0, `total=${r.data?.data?.pagination?.total ?? '?'}`);

    // B4b. Officer B cannot get officer A's loan (IDOR) -> 404
    r = await req('GET', `/api/field-officer/loans/${loanId}`, { token: officerBToken });
    report('loans IDOR get foreign loan 404', r.status === 404, `msg=${r.data?.message}`);

    // B4c. Officer B cannot update officer A's loan -> 404
    r = await req('PUT', `/api/field-officer/loans/${loanId}`, { token: officerBToken, json: true, body: { amount: 1 } });
    report('loans IDOR update foreign loan blocked', r.status === 404, `msg=${r.data?.message}`);

    // B4d. Officer B cannot submit officer A's loan -> 404
    r = await req('POST', `/api/field-officer/loans/${loanId}/submit`, { token: officerBToken });
    report('loans IDOR submit foreign loan blocked', r.status === 404, `msg=${r.data?.message}`);

    // B4e. Officer B cannot verify officer A's loan -> 404
    r = await req('POST', `/api/field-officer/loans/${loanId}/verify`, { token: officerBToken, json: true, body: { status: 'verified' } });
    report('loans IDOR verify foreign loan blocked', r.status === 404, `msg=${r.data?.message}`);

    // B4f. Officer B cannot forward officer A's loan -> 404
    r = await req('POST', `/api/field-officer/loans/${loanId}/forward`, { token: officerBToken, json: true, body: {} });
    report('loans IDOR forward foreign loan blocked', r.status === 404, `msg=${r.data?.message}`);

    // B4g. Officer B cannot create a loan for officer A's farmer -> 404
    r = await req('POST', '/api/field-officer/loans', { token: officerBToken, json: true, body: {
      farmerId, title: 'X', amount: 100, duration: '6m', purpose: 'p', installmentType: 'monthly'
    }});
    report('loans IDOR create for foreign farmer 404', r.status === 404, `msg=${r.data?.message}`);

    // B5. Suspended officer B keeps a valid token but loses access
    // immediately (status re-read per request); reactivation restores it.
    r = await req('PATCH', `/api/admin/users/${officerB.id}/status`, { token: ADMIN_TOKEN, json: true, body: { status: 'suspended' } });
    report('admin suspends officer B 200', r.status === 200, `msg=${r.data?.message}`);

    r = await req('GET', '/api/field-officer/loans', { token: officerBToken });
    report('suspended officer B blocked 403', r.status === 403, `msg=${r.data?.message}`);

    r = await req('PATCH', `/api/admin/users/${officerB.id}/status`, { token: ADMIN_TOKEN, json: true, body: { status: 'active' } });
    report('admin reactivates officer B 200', r.status === 200, `msg=${r.data?.message}`);

    r = await req('GET', '/api/field-officer/loans', { token: officerBToken });
    report('reactivated officer B allowed 200', r.status === 200, `status=${r.status}`);
  }

  // ---------- Data persistence & relationships ----------
  // C1. Timeline rows exist for the submitted loan
  r = await req('GET', `/api/field-officer/loans/${loanId}`, { token: TOKEN });
  report('loans timeline persisted', r.status === 200 && (r.data?.data?.timeline ?? []).length >= 3, `steps=${(r.data?.data?.timeline ?? []).length}`);

  // C2. Notification was created for the farmer
  // (farmer token is not available here; verified indirectly via DB later in cleanup script)

  saveCleanup();

  const pass = results.filter(x => x.ok).length;
  console.log(`\n==== ${pass}/${results.length} passed ====`);
  process.exit(pass === results.length ? 0 : 1);
})();
