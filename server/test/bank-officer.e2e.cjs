// Bank Officer loan review — live E2E suite.
//
// Self-provisioning: the only credentials it needs are ADMIN_EMAIL /
// ADMIN_PASSWORD from server/.env. It obtains an admin token through the public
// admin login, then creates its own field officer, two bank officers, and a
// farmer, and drives the full loan pipeline (draft -> submit -> verify ->
// forward) before exercising the bank side. No .tmp token files are read, so
// the suite cannot fail because of an expired token.
//
// Run against a live server:  node test/bank-officer.e2e.cjs
// Then clean up:              node test/cleanup.cjs
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
  const cleanup = { farmerIds: [], officerIds: [], loanIds: [] };

  const saveCleanup = () => {
    fs.writeFileSync(path.join(__dirname, 'bank-cleanup.tmp'), JSON.stringify(cleanup));
  };

  // ================= SETUP =================
  let r = await req('POST', '/api/admin/auth/login', { json: true, body: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  const ADMIN_TOKEN = r.data?.token ?? r.data?.data?.token ?? r.data?.session?.access_token ?? null;
  report('setup: admin login', r.status === 200 && !!ADMIN_TOKEN, `status=${r.status}`);
  if (!ADMIN_TOKEN) {
    console.log('\nCannot continue without an admin token. Check ADMIN_EMAIL / ADMIN_PASSWORD in server/.env.');
    process.exit(1);
  }

  // ---- admin provisioning: bank officer (also covers Commit 2's endpoint) ----
  const boNid = '77' + stamp.slice(-6);
  r = await req('POST', '/api/admin/bank-officers', { token: ADMIN_TOKEN, json: true, body: {
    nameEn: 'Bank Officer A', nid: boNid, phone: '018' + stamp, password: 'bankofficer123',
    designation: 'Credit Officer', bankName: 'Sonali Bank', branchName: 'Bhola Branch', branchCode: 'SB-101',
  }});
  const bankOfficerId = r.data?.data?.profile?.id;
  if (bankOfficerId) cleanup.officerIds.push(bankOfficerId);
  report('admin creates bank officer 201', r.status === 201 && !!bankOfficerId, `id=${bankOfficerId} role=${r.data?.data?.profile?.role}`);
  report('admin bank officer role is bank_officer', r.data?.data?.profile?.role === 'bank_officer', `role=${r.data?.data?.profile?.role}`);
  report('admin bank officer posting persisted', r.data?.data?.profile?.bank_name === 'Sonali Bank' && r.data?.data?.profile?.branch_code === 'SB-101',
    `bank=${r.data?.data?.profile?.bank_name} branch_code=${r.data?.data?.profile?.branch_code}`);

  // duplicate NID rejected
  r = await req('POST', '/api/admin/bank-officers', { token: ADMIN_TOKEN, json: true, body: {
    nameEn: 'Dup', nid: boNid, phone: '0181' + stamp.slice(-7), password: 'bankofficer123',
  }});
  report('admin bank officer duplicate NID 400', r.status === 400, `msg=${r.data?.message}`);

  // missing required fields rejected
  r = await req('POST', '/api/admin/bank-officers', { token: ADMIN_TOKEN, json: true, body: { nameEn: 'Incomplete' } });
  report('admin bank officer missing fields 400', r.status === 400, `msg=${r.data?.message}`);

  // short password rejected
  r = await req('POST', '/api/admin/bank-officers', { token: ADMIN_TOKEN, json: true, body: {
    nameEn: 'Weak', nid: '78' + stamp.slice(-6), phone: '0182' + stamp.slice(-7), password: '123',
  }});
  report('admin bank officer short password 400', r.status === 400, `msg=${r.data?.message}`);

  // unauthenticated / wrong role cannot provision
  r = await req('POST', '/api/admin/bank-officers', { json: true, body: { nameEn: 'X', nid: '1', phone: '1', password: 'xxxxxx' } });
  report('admin bank officer create no token 401', r.status === 401, `msg=${r.data?.message}`);

  r = await req('GET', '/api/admin/bank-officers', { token: ADMIN_TOKEN });
  report('admin bank officer list 200', r.status === 200 && (r.data?.data?.items ?? []).some((x) => x.id === bankOfficerId),
    `total=${r.data?.data?.pagination?.total}`);

  // ---- second bank officer: proves the queue is shared, not per-officer ----
  const bo2Nid = '79' + stamp.slice(-6);
  r = await req('POST', '/api/admin/bank-officers', { token: ADMIN_TOKEN, json: true, body: {
    nameEn: 'Bank Officer B', nid: bo2Nid, phone: '0183' + stamp.slice(-7), password: 'bankofficer456',
  }});
  const bankOfficerBId = r.data?.data?.profile?.id;
  if (bankOfficerBId) cleanup.officerIds.push(bankOfficerBId);
  report('setup: second bank officer created', r.status === 201 && !!bankOfficerBId, `id=${bankOfficerBId}`);

  // ---- field officer (drives the pipeline up to "forwarded") ----
  const foNid = '76' + stamp.slice(-6);
  r = await req('POST', '/api/admin/field-officers', { token: ADMIN_TOKEN, json: true, body: {
    nameEn: 'Field Officer BO Test', nid: foNid, phone: '0184' + stamp.slice(-7), password: 'fieldofficer123',
    designation: 'Field Officer',
  }});
  const fieldOfficerId = r.data?.data?.profile?.id;
  if (fieldOfficerId) cleanup.officerIds.push(fieldOfficerId);
  report('setup: field officer created', r.status === 201 && !!fieldOfficerId, `id=${fieldOfficerId}`);
  saveCleanup();

  // ---- tokens ----
  const BO_TOKEN = await login(`${boNid}@sofol.local`, 'bankofficer123');
  report('setup: bank officer login', !!BO_TOKEN);
  const BO2_TOKEN = await login(`${bo2Nid}@sofol.local`, 'bankofficer456');
  report('setup: second bank officer login', !!BO2_TOKEN);
  const FO_TOKEN = await login(`${foNid}@sofol.local`, 'fieldofficer123');
  report('setup: field officer login', !!FO_TOKEN);

  if (!BO_TOKEN || !FO_TOKEN) {
    console.log('\nCannot continue without officer tokens.');
    saveCleanup();
    process.exit(1);
  }

  // ---- farmer + loan pipeline ----
  const farmerNid = '75' + stamp.slice(-6);
  r = await req('POST', '/api/field-officer/farmers', { token: FO_TOKEN, json: true, body: {
    nameEn: 'Bank Review Farmer', nid: farmerNid, phone: '0185' + stamp.slice(-7), password: 'farmerpass123',
    dob: '1988-02-02', gender: 'male', district: 'Bhola',
  }});
  const farmerId = r.data?.data?.profile?.id;
  if (farmerId) cleanup.farmerIds.push(farmerId);
  report('setup: farmer registered by field officer', r.status === 201 && !!farmerId, `id=${farmerId}`);
  saveCleanup();

  const FARMER_TOKEN = await login(`${farmerNid}@sofol.local`, 'farmerpass123');
  report('setup: farmer login', !!FARMER_TOKEN);

  // Helper: build an application and advance it to the requested stage.
  const makeLoan = async (title, amount, stage) => {
    let res = await req('POST', '/api/field-officer/loans', { token: FO_TOKEN, json: true, body: {
      farmerId, title, amount, duration: '12 months', purpose: 'Bank review test',
      installmentType: 'monthly', emi: 1000, interest: 8,
    }});
    const id = res.data?.data?.id;
    if (id) { cleanup.loanIds.push(id); saveCleanup(); }
    if (stage === 'draft') return id;
    await req('POST', `/api/field-officer/loans/${id}/submit`, { token: FO_TOKEN });
    if (stage === 'submitted') return id;
    await req('POST', `/api/field-officer/loans/${id}/verify`, { token: FO_TOKEN, json: true, body: { status: 'verified', notes: 'Field checks done.' } });
    if (stage === 'verified') return id;
    await req('POST', `/api/field-officer/loans/${id}/forward`, { token: FO_TOKEN, json: true, body: { recommendedAmount: Math.round(amount * 0.9) } });
    return id;
  };

  const forwardedLoanId = await makeLoan('Forwarded Paddy Loan', 40000, 'forwarded');
  const rejectLoanId = await makeLoan('Forwarded Loan To Reject', 20000, 'forwarded');
  const amountGuardLoanId = await makeLoan('Forwarded Amount Guard Loan', 10000, 'forwarded');
  const verifiedNotForwardedId = await makeLoan('Verified Not Forwarded', 15000, 'verified');
  const draftLoanId = await makeLoan('Never Submitted Draft', 5000, 'draft');
  report('setup: loan pipeline built', !!forwardedLoanId && !!verifiedNotForwardedId && !!draftLoanId,
    `forwarded=${forwardedLoanId} notForwarded=${verifiedNotForwardedId} draft=${draftLoanId}`);
  saveCleanup();

  // ================= A. PROFILE =================
  r = await req('GET', '/api/bank-officer/profile/me', { token: BO_TOKEN });
  report('profile get 200', r.status === 200 && r.data?.data?.id === bankOfficerId, `role=${r.data?.data?.role}`);
  report('profile get uses success/message/data contract', r.data?.success === true && typeof r.data?.message === 'string');

  r = await req('PUT', '/api/bank-officer/profile/me', { token: BO_TOKEN, json: true, body: { designation: 'Senior Credit Officer' } });
  report('profile update 200', r.status === 200 && r.data?.data?.designation === 'Senior Credit Officer', `designation=${r.data?.data?.designation}`);

  // privileged fields must be ignored (mass-assignment guard)
  r = await req('PUT', '/api/bank-officer/profile/me', { token: BO_TOKEN, json: true, body: {
    role: 'admin', status: 'suspended', is_verified: false, credit_score: 999,
    bank_name: 'Hacked Bank', branch_code: 'HACK', name_en: 'Bank Officer A2',
  }});
  report('profile update ignores privileged fields',
    r.status === 200 && r.data?.data?.role === 'bank_officer' && r.data?.data?.status === 'active'
      && r.data?.data?.bank_name === 'Sonali Bank' && r.data?.data?.branch_code === 'SB-101'
      && Number(r.data?.data?.credit_score) === 0,
    `role=${r.data?.data?.role} status=${r.data?.data?.status} bank=${r.data?.data?.bank_name} cs=${r.data?.data?.credit_score}`);

  r = await req('PUT', '/api/bank-officer/profile/me', { token: BO_TOKEN, json: true, body: { nothing_editable: 1 } });
  report('profile update no updatable fields 400', r.status === 400, `msg=${r.data?.message}`);

  // ================= B. REVIEW QUEUE =================
  r = await req('GET', '/api/bank-officer/loans?page=1&pageSize=50', { token: BO_TOKEN });
  const queue = r.data?.data?.items ?? [];
  report('queue list 200', r.status === 200 && Array.isArray(queue), `total=${r.data?.data?.pagination?.total}`);
  report('queue contains forwarded application', queue.some((x) => x.id === forwardedLoanId));
  report('queue excludes verified-but-not-forwarded application', !queue.some((x) => x.id === verifiedNotForwardedId));
  report('queue excludes draft application', !queue.some((x) => x.id === draftLoanId));
  const queued = queue.find((x) => x.id === forwardedLoanId);
  report('queue row embeds farmer summary', !!queued?.farmer?.name_en, `farmer=${queued?.farmer?.name_en}`);
  report('queue row embeds field officer summary', !!queued?.field_officer?.name_en, `officer=${queued?.field_officer?.name_en}`);

  r = await req('GET', '/api/bank-officer/loans?status=pending', { token: BO_TOKEN });
  report('queue filter status=pending 200', r.status === 200 && (r.data?.data?.items ?? []).some((x) => x.id === forwardedLoanId));

  r = await req('GET', `/api/bank-officer/loans?farmerId=${farmerId}`, { token: BO_TOKEN });
  report('queue filter farmerId 200', r.status === 200 && (r.data?.data?.items ?? []).every((x) => x.farmer_id === farmerId),
    `count=${(r.data?.data?.items ?? []).length}`);

  r = await req('GET', '/api/bank-officer/loans?status=draft', { token: BO_TOKEN });
  report('queue rejects bank-invalid status filter (draft) 400', r.status === 400, `msg=${r.data?.message}`);

  r = await req('GET', '/api/bank-officer/loans?status=teleported', { token: BO_TOKEN });
  report('queue invalid status filter 400', r.status === 400, `msg=${r.data?.message}`);

  r = await req('GET', '/api/bank-officer/loans?verificationStatus=banana', { token: BO_TOKEN });
  report('queue invalid verificationStatus filter 400', r.status === 400, `msg=${r.data?.message}`);

  r = await req('GET', '/api/bank-officer/loans?farmerId=not-a-uuid', { token: BO_TOKEN });
  report('queue invalid farmerId 400', r.status === 400, `msg=${r.data?.message}`);

  r = await req('GET', '/api/bank-officer/loans?pageSize=0', { token: BO_TOKEN });
  report('queue invalid pageSize 400', r.status === 400, `msg=${r.data?.message}`);

  // shared queue: the second bank officer sees the same forwarded application
  if (BO2_TOKEN) {
    r = await req('GET', '/api/bank-officer/loans?pageSize=50', { token: BO2_TOKEN });
    report('queue is shared across bank officers', r.status === 200 && (r.data?.data?.items ?? []).some((x) => x.id === forwardedLoanId));
  }

  // ================= C. DETAIL =================
  r = await req('GET', `/api/bank-officer/loans/${forwardedLoanId}`, { token: BO_TOKEN });
  report('detail get 200', r.status === 200 && r.data?.data?.id === forwardedLoanId);
  report('detail includes timeline', (r.data?.data?.timeline ?? []).length >= 3, `steps=${(r.data?.data?.timeline ?? []).length}`);
  report('detail includes farmer + field officer', !!r.data?.data?.farmer && !!r.data?.data?.field_officer);
  report('detail exposes officer recommendation', r.data?.data?.recommended_amount !== undefined, `rec=${r.data?.data?.recommended_amount}`);

  r = await req('GET', `/api/bank-officer/loans/${verifiedNotForwardedId}`, { token: BO_TOKEN });
  report('detail of not-forwarded application 404', r.status === 404, `msg=${r.data?.message}`);

  r = await req('GET', `/api/bank-officer/loans/${draftLoanId}`, { token: BO_TOKEN });
  report('detail of draft application 404', r.status === 404, `msg=${r.data?.message}`);

  r = await req('GET', '/api/bank-officer/loans/00000000-0000-0000-0000-000000000000', { token: BO_TOKEN });
  report('detail nonexistent 404', r.status === 404, `msg=${r.data?.message}`);

  r = await req('GET', '/api/bank-officer/loans/not-a-uuid', { token: BO_TOKEN });
  report('detail invalid UUID 400', r.status === 400, `msg=${r.data?.message}`);

  // ================= D. UNDER REVIEW TRANSITION =================
  r = await req('POST', `/api/bank-officer/loans/${forwardedLoanId}/review`, { token: BO_TOKEN });
  report('review 200 -> under_review', r.status === 200 && r.data?.data?.status === 'under_review', `status=${r.data?.data?.status}`);
  report('review stamps reviewed_at', !!r.data?.data?.reviewed_at, `reviewed_at=${r.data?.data?.reviewed_at}`);
  report('review stamps bank_officer_id', r.data?.data?.bank_officer_id === bankOfficerId, `bo=${r.data?.data?.bank_officer_id}`);

  r = await req('POST', `/api/bank-officer/loans/${forwardedLoanId}/review`, { token: BO_TOKEN });
  report('review twice 400', r.status === 400, `msg=${r.data?.message}`);

  r = await req('POST', `/api/bank-officer/loans/${verifiedNotForwardedId}/review`, { token: BO_TOKEN });
  report('review not-forwarded application 404', r.status === 404, `msg=${r.data?.message}`);

  r = await req('GET', `/api/bank-officer/loans/${forwardedLoanId}`, { token: BO_TOKEN });
  const step2 = (r.data?.data?.timeline ?? []).find((s) => s.step === 2);
  report('review completes timeline step 2', step2?.completed === true, `step2=${JSON.stringify(step2 ?? null)}`);

  // ================= E. DECISION =================
  r = await req('POST', `/api/bank-officer/loans/${forwardedLoanId}/decision`, { token: BO_TOKEN, json: true, body: {} });
  report('decision missing status 400', r.status === 400, `msg=${r.data?.message}`);

  r = await req('POST', `/api/bank-officer/loans/${forwardedLoanId}/decision`, { token: BO_TOKEN, json: true, body: { status: 'banana' } });
  report('decision invalid status 400', r.status === 400, `msg=${r.data?.message}`);

  // statuses outside the bank's authority
  for (const bad of ['pending', 'under_review', 'active', 'completed', 'draft']) {
    r = await req('POST', `/api/bank-officer/loans/${forwardedLoanId}/decision`, { token: BO_TOKEN, json: true, body: { status: bad } });
    report(`decision rejects out-of-scope status '${bad}' 400`, r.status === 400, `msg=${r.data?.message}`);
  }

  r = await req('POST', `/api/bank-officer/loans/${amountGuardLoanId}/decision`, { token: BO_TOKEN, json: true, body: { status: 'approved', approvedAmount: 999999 } });
  report('decision approvedAmount above requested 400', r.status === 400, `msg=${r.data?.message}`);

  r = await req('POST', `/api/bank-officer/loans/${amountGuardLoanId}/decision`, { token: BO_TOKEN, json: true, body: { status: 'approved', approvedAmount: 0 } });
  report('decision approvedAmount zero 400', r.status === 400, `msg=${r.data?.message}`);

  r = await req('POST', `/api/bank-officer/loans/${rejectLoanId}/decision`, { token: BO_TOKEN, json: true, body: { status: 'rejected' } });
  report('decision reject without notes 400', r.status === 400, `msg=${r.data?.message}`);

  r = await req('POST', `/api/bank-officer/loans/${rejectLoanId}/decision`, { token: BO_TOKEN, json: true, body: { status: 'rejected', notes: 'No', approvedAmount: 100 } });
  report('decision reject with approvedAmount 400', r.status === 400, `msg=${r.data?.message}`);

  // approve, with protected columns injected in the same body
  r = await req('POST', `/api/bank-officer/loans/${forwardedLoanId}/decision`, { token: BO_TOKEN, json: true, body: {
    status: 'approved', approvedAmount: 35000, notes: 'Credit profile acceptable.',
    farmer_id: bankOfficerId, amount: 1, verification_status: 'pending', forwarded_at: null,
    field_officer_id: bankOfficerId, forwarded_by: bankOfficerId, recommended_amount: 1,
  }});
  report('decision approve 200', r.status === 200 && r.data?.data?.status === 'approved', `status=${r.data?.data?.status}`);
  report('decision stores approved_amount', Number(r.data?.data?.approved_amount) === 35000, `approved=${r.data?.data?.approved_amount}`);
  report('decision stamps decision_at', !!r.data?.data?.decision_at, `decision_at=${r.data?.data?.decision_at}`);
  report('decision stamps bank_officer_id', r.data?.data?.bank_officer_id === bankOfficerId);
  report('decision stores decision_notes', r.data?.data?.decision_notes === 'Credit profile acceptable.');
  report('decision ignores protected columns',
    r.data?.data?.farmer_id === farmerId && Number(r.data?.data?.amount) === 40000
      && r.data?.data?.verification_status === 'verified' && !!r.data?.data?.forwarded_at
      && r.data?.data?.field_officer_id === fieldOfficerId,
    `farmer=${r.data?.data?.farmer_id} amount=${r.data?.data?.amount} vs=${r.data?.data?.verification_status}`);
  report('decision preserves officer verification_notes', r.data?.data?.verification_notes === 'Field checks done.',
    `vn=${r.data?.data?.verification_notes}`);

  r = await req('GET', `/api/bank-officer/loans/${forwardedLoanId}`, { token: BO_TOKEN });
  const step3 = (r.data?.data?.timeline ?? []).find((s) => s.step === 3);
  report('decision completes timeline step 3', step3?.completed === true && step3?.label === 'Approved', `step3=${JSON.stringify(step3 ?? null)}`);

  r = await req('POST', `/api/bank-officer/loans/${forwardedLoanId}/decision`, { token: BO_TOKEN, json: true, body: { status: 'rejected', notes: 'Changed my mind.' } });
  report('decision twice 400 (already decided)', r.status === 400, `msg=${r.data?.message}`);

  r = await req('POST', `/api/bank-officer/loans/${forwardedLoanId}/review`, { token: BO_TOKEN });
  report('review after decision 400', r.status === 400, `msg=${r.data?.message}`);

  // reject path (from 'pending' directly, without an explicit review step)
  r = await req('POST', `/api/bank-officer/loans/${rejectLoanId}/decision`, { token: BO_TOKEN, json: true, body: { status: 'rejected', notes: 'Existing debt burden too high.' } });
  report('decision reject 200 from pending', r.status === 200 && r.data?.data?.status === 'rejected', `status=${r.data?.data?.status}`);
  report('decision reject leaves approved_amount null', r.data?.data?.approved_amount === null, `approved=${r.data?.data?.approved_amount}`);
  report('decision reject stores notes', r.data?.data?.decision_notes === 'Existing debt burden too high.');

  // approve defaulting to the officer's recommended amount (10000 * 0.9 = 9000)
  r = await req('POST', `/api/bank-officer/loans/${amountGuardLoanId}/decision`, { token: BO_TOKEN, json: true, body: { status: 'approved' } });
  report('decision approve defaults to recommended amount', r.status === 200 && Number(r.data?.data?.approved_amount) === 9000,
    `approved=${r.data?.data?.approved_amount}`);

  r = await req('POST', `/api/bank-officer/loans/${verifiedNotForwardedId}/decision`, { token: BO_TOKEN, json: true, body: { status: 'approved' } });
  report('decision on not-forwarded application 404', r.status === 404, `msg=${r.data?.message}`);

  r = await req('POST', `/api/bank-officer/loans/${draftLoanId}/decision`, { token: BO_TOKEN, json: true, body: { status: 'approved' } });
  report('decision on draft application 404', r.status === 404, `msg=${r.data?.message}`);

  // ================= F. AUTHORIZATION =================
  for (const [label, url, method] of [
    ['queue', '/api/bank-officer/loans', 'GET'],
    ['detail', `/api/bank-officer/loans/${forwardedLoanId}`, 'GET'],
    ['profile', '/api/bank-officer/profile/me', 'GET'],
  ]) {
    r = await req(method, url, {});
    report(`auth ${label} no token 401`, r.status === 401, `msg=${r.data?.message}`);
  }

  r = await req('GET', '/api/bank-officer/loans', { token: FARMER_TOKEN });
  report('auth farmer token on bank route 403', r.status === 403, `msg=${r.data?.message}`);

  r = await req('GET', '/api/bank-officer/loans', { token: FO_TOKEN });
  report('auth field officer token on bank route 403', r.status === 403, `msg=${r.data?.message}`);

  r = await req('GET', '/api/bank-officer/loans', { token: ADMIN_TOKEN });
  report('auth admin token on bank route 403', r.status === 403, `msg=${r.data?.message}`);

  r = await req('POST', `/api/bank-officer/loans/${amountGuardLoanId}/decision`, { token: FO_TOKEN, json: true, body: { status: 'approved' } });
  report('auth field officer cannot decide 403', r.status === 403, `msg=${r.data?.message}`);

  r = await req('GET', '/api/field-officer/loans', { token: BO_TOKEN });
  report('auth bank officer token on field-officer route 403', r.status === 403, `msg=${r.data?.message}`);

  r = await req('GET', '/api/farmer/me', { token: BO_TOKEN });
  report('auth bank officer token on farmer route 403', r.status === 403, `msg=${r.data?.message}`);

  r = await req('GET', '/api/admin/bank-officers', { token: BO_TOKEN });
  report('auth bank officer token on admin route 403', r.status === 403, `msg=${r.data?.message}`);

  // A suspended officer must lose access immediately, while their token is
  // still cryptographically valid — the guard re-reads profiles.status per
  // request rather than trusting the JWT.
  if (BO2_TOKEN && bankOfficerBId) {
    r = await req('GET', '/api/bank-officer/loans', { token: BO2_TOKEN });
    report('auth second bank officer has access before suspension', r.status === 200, `status=${r.status}`);

    r = await req('PATCH', `/api/admin/bank-officers/${bankOfficerBId}/status`, { token: ADMIN_TOKEN, json: true, body: { status: 'suspended' } });
    report('admin suspends bank officer 200', r.status === 200 && r.data?.data?.status === 'suspended', `status=${r.data?.data?.status}`);

    r = await req('GET', '/api/bank-officer/loans', { token: BO2_TOKEN });
    report('auth suspended bank officer 403', r.status === 403, `msg=${r.data?.message}`);

    r = await req('PATCH', `/api/admin/bank-officers/${bankOfficerBId}/status`, { token: ADMIN_TOKEN, json: true, body: { status: 'nonsense' } });
    report('admin invalid bank officer status 400', r.status === 400, `msg=${r.data?.message}`);

    r = await req('PATCH', `/api/admin/bank-officers/${fieldOfficerId}/status`, { token: ADMIN_TOKEN, json: true, body: { status: 'suspended' } });
    report('admin cannot set status of a non-bank officer 404', r.status === 404, `msg=${r.data?.message}`);

    // restore so cleanup and any re-run start from a sane state
    await req('PATCH', `/api/admin/bank-officers/${bankOfficerBId}/status`, { token: ADMIN_TOKEN, json: true, body: { status: 'active' } });
  }

  // ================= G. FARMER-VISIBLE OUTCOME =================
  if (FARMER_TOKEN) {
    r = await req('GET', `/api/farmer/loans/${forwardedLoanId}`, { token: FARMER_TOKEN });
    report('farmer sees approved status on own application', r.status === 200 && r.data?.data?.status === 'approved',
      `status=${r.data?.data?.status}`);

    r = await req('GET', '/api/farmer/notifications', { token: FARMER_TOKEN });
    const notes = r.data?.data ?? r.data?.notifications ?? [];
    const list = Array.isArray(notes) ? notes : (notes.items ?? []);
    report('farmer notified of bank decision', list.some((n) => /Approved/i.test(n.title ?? '')),
      `count=${list.length}`);
  }

  saveCleanup();

  const pass = results.filter((x) => x.ok).length;
  console.log(`\n==== ${pass}/${results.length} passed ====`);
  console.log('Cleanup data written to test/bank-cleanup.tmp — run: node test/cleanup.cjs');
  process.exit(pass === results.length ? 0 : 1);
})();
