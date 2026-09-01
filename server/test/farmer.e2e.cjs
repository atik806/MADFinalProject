// Farmer backend E2E: profile (/me + /profile), transactions CRUD + IDOR,
// loans (list/get/apply + status protection), credit profile, dashboard, and
// auth guards. Requires the server on :3000.
//
// Farmers are self-registered through the public register/login endpoints. The
// field-officer token used for wrong-role 403 checks is resolved lazily: an
// existing scripts/token.tmp is reused if it still works, otherwise a
// throwaway field officer is provisioned through the admin API using
// ADMIN_EMAIL / ADMIN_PASSWORD from server/.env. That keeps the suite runnable
// after the previous token has expired without rewriting the token file.
//
// Test farmers are cleaned up via farmer-cleanup.tmp + node test/cleanup.cjs.
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

// Resolves a usable field-officer token. Only needed so the wrong-role checks
// assert a real 403 (role present but wrong) rather than a 401.
async function resolveOfficerToken(stamp, cleanupOfficerIds) {
  const tokenFile = path.join(__dirname, '..', 'scripts', 'token.tmp');
  if (fs.existsSync(tokenFile)) {
    const existing = fs.readFileSync(tokenFile, 'utf8').trim();
    if (existing) {
      const probe = await req('GET', '/api/field-officer/profile/me', { token: existing });
      if (probe.status === 200) return existing;
    }
  }

  const admin = await req('POST', '/api/admin/auth/login', { json: true, body: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  const adminToken = admin.data?.token ?? null;
  if (!adminToken) return null;

  const nid = '73' + stamp.slice(-6);
  const created = await req('POST', '/api/admin/field-officers', { token: adminToken, json: true, body: {
    nameEn: 'Farmer Suite Officer', nid, phone: '0186' + stamp.slice(-7),
    password: 'fieldofficer123', designation: 'Field Officer',
  }});
  const officerId = created.data?.data?.profile?.id;
  if (officerId) cleanupOfficerIds.push(officerId);

  const login = await req('POST', '/api/farmer/auth/login', { json: true, body: { identifier: `${nid}@sofol.local`, password: 'fieldofficer123' } });
  return login.data?.token ?? null;
}

(async () => {
  const stamp = Date.now().toString().slice(-8);
  const provisionedOfficerIds = [];
  const cleanupFile = path.join(__dirname, 'farmer-cleanup.tmp');
  const farmerIds = [];

  // Written eagerly and re-written after every fixture so an early abort still
  // leaves a complete cleanup manifest. Recording it only at the end leaked a
  // provisioned officer when farmer setup failed.
  const saveCleanup = () => {
    fs.writeFileSync(cleanupFile, JSON.stringify({ farmerIds, officerIds: provisionedOfficerIds }));
  };

  const OFFICER_TOKEN = await resolveOfficerToken(stamp, provisionedOfficerIds);
  saveCleanup();
  report('setup: field officer token resolved', !!OFFICER_TOKEN,
    provisionedOfficerIds.length ? 'provisioned via admin API' : 'reused scripts/token.tmp');
  if (!OFFICER_TOKEN) {
    console.log('==== aborted: no field-officer token (check ADMIN_EMAIL / ADMIN_PASSWORD in server/.env) ====');
    process.exit(1);
  }

  // ---------- setup: register + login two farmers ----------
  async function makeFarmer(label) {
    const nid = '77' + stamp.slice(-6) + label;
    const phone = '016' + stamp + label;
    const r = await req('POST', '/api/farmer/auth/register', { json: true, body: {
      nameBn: 'কৃষক ' + label, nameEn: 'Farmer ' + label, nid, phone: '016' + stamp + label,
      password: 'farmerpass123', dob: '1990-01-01', gender: 'male',
      totalLand: '2.5', farmingIncome: '80000', familyMembers: '4',
    }});
    if (r.status !== 201) {
      report(`setup: register farmer ${label}`, false, `status=${r.status} msg=${r.data?.message}`);
      return null;
    }
    const id = r.data?.data?.profile?.id;
    const l = await req('POST', '/api/farmer/auth/login', { json: true, body: { identifier: phone, password: 'farmerpass123' } });
    if (!l.data?.token) {
      report(`setup: login farmer ${label}`, false, `status=${l.status} msg=${l.data?.message}`);
      return null;
    }
    return { id, token: l.data.token, phone, nid };
  }

  const farmerA = await makeFarmer('1');
  if (farmerA) { farmerIds.push(farmerA.id); saveCleanup(); }
  const farmerB = await makeFarmer('2');
  if (farmerB) { farmerIds.push(farmerB.id); saveCleanup(); }
  report('setup: farmers A + B registered/logged in', !!farmerA && !!farmerB, `A=${farmerA?.id} B=${farmerB?.id}`);
  if (!farmerA || !farmerB) { console.log('==== aborted (setup failed) ===='); process.exit(1); }

  saveCleanup();

  const TA = farmerA.token;
  const TB = farmerB.token;

  // ---------- Profile: GET /me ----------
  let r = await req('GET', '/api/farmer/me', { token: TA });
  report('me GET 200 own profile', r.status === 200 && r.data?.data?.id === farmerA.id, `status=${r.status} id=${r.data?.data?.id}`);
  report('me GET has farmer_id + credit fields', r.status === 200 && typeof r.data?.data?.credit_score === 'number' && typeof r.data?.data?.is_verified === 'boolean', `credit=${r.data?.data?.credit_score}`);

  r = await req('GET', '/api/farmer/profile', { token: TA });
  report('profile GET alias 200', r.status === 200 && r.data?.data?.id === farmerA.id, `status=${r.status}`);

  // ---------- Profile: PUT /me ----------
  r = await req('PUT', '/api/farmer/me', { token: TA, json: true, body: { village: 'Char Fasson', district: 'Bhola', occupation: 'Rice farmer', experience: 12 } });
  report('me PUT 200 updates village/district', r.status === 200 && r.data?.data?.village === 'Char Fasson' && r.data?.data?.district === 'Bhola', `village=${r.data?.data?.village}`);
  report('me PUT updates experience', r.status === 200 && Number(r.data?.data?.experience) === 12, `exp=${r.data?.data?.experience}`);

  // Privileged fields must be ignored (mass-assignment guard)
  r = await req('PUT', '/api/farmer/me', { token: TA, json: true, body: {
    isVerified: true, creditScore: 900, farmerId: 'FRM-FAKE', role: 'admin', status: 'active', memberSince: '2000-01-01',
  }});
  const meAfter = (await req('GET', '/api/farmer/me', { token: TA })).data?.data;
  report('me PUT ignores is_verified/credit_score/farmer_id', r.status === 200 && meAfter?.is_verified === false && Number(meAfter?.credit_score) === 0 && meAfter?.farmer_id !== 'FRM-FAKE', `verified=${meAfter?.is_verified} credit=${meAfter?.credit_score} farmerId=${meAfter?.farmer_id}`);
  report('me PUT ignores role/status', meAfter?.role === 'farmer' && meAfter?.status === 'pending', `role=${meAfter?.role} status=${meAfter?.status}`);

  // Cross-farmer: no way to fetch B's profile via A's token (profile is always self)
  r = await req('GET', '/api/farmer/me', { token: TB });
  report('me GET farmer B sees only own profile', r.status === 200 && r.data?.data?.id === farmerB.id && r.data?.data?.id !== farmerA.id, `id=${r.data?.data?.id}`);

  // Auth guards
  r = await req('GET', '/api/farmer/me');
  report('me GET no token 401', r.status === 401, `status=${r.status}`);
  r = await req('GET', '/api/farmer/me', { token: 'bogus-token' });
  report('me GET invalid token 401', r.status === 401, `status=${r.status}`);
  r = await req('GET', '/api/farmer/me', { token: OFFICER_TOKEN });
  report('me GET officer token 403', r.status === 403, `status=${r.status} msg=${r.data?.message}`);

  // ---------- Transactions ----------
  r = await req('POST', '/api/farmer/transactions', { token: TA, json: true, body: {
    title: 'Paddy sale', description: 'Boro harvest', date: '20 Aug 2026', amount: 15000, category: 'income',
  }});
  const txIncome = r.data?.data?.id;
  report('tx create income 201', r.status === 201 && !!txIncome && r.data?.data?.farmer_id === farmerA.id, `id=${txIncome}`);
  report('tx create income stores positive amount', Number(r.data?.data?.amount) === 15000, `amount=${r.data?.data?.amount}`);

  r = await req('POST', '/api/farmer/transactions', { token: TA, json: true, body: {
    title: 'Fertilizer', description: 'Urea', date: '22 Aug 2026', amount: -4500, category: 'expense',
  }});
  const txExpense = r.data?.data?.id;
  report('tx create expense 201', r.status === 201 && !!txExpense, `id=${txExpense}`);
  report('tx create expense stores negative amount', Number(r.data?.data?.amount) === -4500, `amount=${r.data?.data?.amount}`);

  // farmer_id from client must be ignored / rejected — farmer is derived from token
  r = await req('POST', '/api/farmer/transactions', { token: TA, json: true, body: {
    title: 'Hack attempt', description: 'x', date: '23 Aug 2026', amount: 10, category: 'income', farmerId: farmerB.id, farmer_id: farmerB.id,
  }});
  report('tx create ignores client farmer_id', r.status === 201 && r.data?.data?.farmer_id === farmerA.id, `farmer_id=${r.data?.data?.farmer_id}`);

  // validation failures
  r = await req('POST', '/api/farmer/transactions', { token: TA, json: true, body: { title: 'X', date: 'd', amount: 5, category: 'bogus' } });
  report('tx create invalid category 400', r.status === 400, `status=${r.status} msg=${r.data?.message}`);
  r = await req('POST', '/api/farmer/transactions', { token: TA, json: true, body: { title: 'X', date: 'd', amount: -5, category: 'income' } });
  report('tx create income negative amount 400', r.status === 400, `status=${r.status} msg=${r.data?.message}`);
  r = await req('POST', '/api/farmer/transactions', { token: TA, json: true, body: { title: 'X', date: 'd', amount: 5, category: 'expense' } });
  report('tx create expense positive amount 400', r.status === 400, `status=${r.status} msg=${r.data?.message}`);
  r = await req('POST', '/api/farmer/transactions', { token: TA, json: true, body: { date: 'd', amount: 5, category: 'income' } });
  report('tx create missing title 400', r.status === 400, `status=${r.status} msg=${r.data?.message}`);
  r = await req('POST', '/api/farmer/transactions', { token: TA, json: true, body: { title: 'X', amount: 5, category: 'income' } });
  report('tx create missing date 400', r.status === 400, `status=${r.status} msg=${r.data?.message}`);
  r = await req('POST', '/api/farmer/transactions', { token: TA, json: true, body: { title: 'X', date: 'd', category: 'income' } });
  report('tx create missing amount 400', r.status === 400, `status=${r.status} msg=${r.data?.message}`);

  // list + get
  r = await req('GET', '/api/farmer/transactions', { token: TA });
  const listed = (r.data?.data ?? []).some((t) => t.id === txIncome);
  report('tx list 200 includes own', r.status === 200 && listed, `total=${(r.data?.data ?? []).length}`);

  r = await req('GET', `/api/farmer/transactions/${txIncome}`, { token: TA });
  report('tx get own 200', r.status === 200 && r.data?.data?.id === txIncome, `status=${r.status}`);

  r = await req('GET', '/api/farmer/transactions/not-a-uuid', { token: TA });
  report('tx get invalid UUID 400', r.status === 400, `status=${r.status} msg=${r.data?.message}`);

  // farmer B creates a transaction; farmer A must not see/touch it (IDOR)
  r = await req('POST', '/api/farmer/transactions', { token: TB, json: true, body: { title: "B's goat sale", description: '', date: '24 Aug 2026', amount: 7000, category: 'income' } });
  const txB = r.data?.data?.id;
  report('setup: farmer B tx created', r.status === 201 && !!txB, `id=${txB}`);
  r = await req('GET', `/api/farmer/transactions/${txB}`, { token: TA });
  report('tx get foreign 404', r.status === 404, `status=${r.status}`);
  r = await req('PUT', `/api/farmer/transactions/${txB}`, { token: TA, json: true, body: { title: 'stolen', description: '', date: '24 Aug 2026', amount: 1, category: 'income' } });
  report('tx update foreign 404', r.status === 404, `status=${r.status}`);
  r = await req('DELETE', `/api/farmer/transactions/${txB}`, { token: TA });
  report('tx delete foreign 404', r.status === 404, `status=${r.status}`);
  r = await req('GET', '/api/farmer/transactions', { token: TA });
  const aLeak = (r.data?.data ?? []).some((t) => t.id === txB);
  report('tx list does not leak B records', !aLeak, `leak=${aLeak}`);

  // update own
  r = await req('PUT', `/api/farmer/transactions/${txIncome}`, { token: TA, json: true, body: { title: 'Paddy sale (bulk)', description: 'Two buyers', amount: 21000 } });
  report('tx update own 200', r.status === 200 && r.data?.data?.title === 'Paddy sale (bulk)' && Number(r.data?.data?.amount) === 21000, `title=${r.data?.data?.title}`);

  // farmer_id cannot be reassigned via update
  r = await req('PUT', `/api/farmer/transactions/${txIncome}`, { token: TA, json: true, body: { farmer_id: farmerB.id, amount: 22000 } });
  report('tx update ignores farmer_id', r.status === 200 && r.data?.data?.farmer_id === farmerA.id, `farmer_id=${r.data?.data?.farmer_id}`);

  // category change must keep the sign convention
  r = await req('PUT', `/api/farmer/transactions/${txIncome}`, { token: TA, json: true, body: { category: 'expense', amount: 100 } });
  report('tx update category/amount mismatch 400', r.status === 400, `status=${r.status} msg=${r.data?.message}`);

  // delete own
  r = await req('DELETE', `/api/farmer/transactions/${txExpense}`, { token: TA });
  report('tx delete own 200', r.status === 200, `status=${r.status}`);
  r = await req('DELETE', `/api/farmer/transactions/${txExpense}`, { token: TA });
  report('tx delete again 404', r.status === 404, `status=${r.status}`);

  // auth guards
  r = await req('POST', '/api/farmer/transactions', { json: true, body: { title: 'x', date: 'd', amount: 1, category: 'income' } });
  report('tx create no token 401', r.status === 401, `status=${r.status}`);
  r = await req('GET', '/api/farmer/transactions', { token: OFFICER_TOKEN });
  report('tx list officer token 403', r.status === 403, `status=${r.status}`);

  // ---------- Loans ----------
  r = await req('POST', '/api/farmer/loans', { token: TA, json: true, body: {
    title: 'Irrigation pump loan', amount: 30000, duration: '12 months', purpose: 'Buy a pump', installmentType: 'monthly', emi: 2600, interest: 8,
  }});
  const loanA = r.data?.data?.id;
  report('loan apply 201', r.status === 201 && !!loanA, `id=${loanA}`);
  report('loan apply pinned to pending', r.data?.data?.status === 'pending', `status=${r.data?.data?.status}`);
  report('loan apply farmer is self', r.data?.data?.farmer_id === farmerA.id, `farmer_id=${r.data?.data?.farmer_id}`);

  // client-supplied status must be ignored
  r = await req('POST', '/api/farmer/loans', { token: TA, json: true, body: {
    title: 'Sneaky approved loan', amount: 5000, duration: '6 months', purpose: 'p', installmentType: 'monthly', status: 'approved', verificationStatus: 'verified',
  }});
  report('loan apply ignores client status', r.status === 201 && r.data?.data?.status === 'pending' && r.data?.data?.verification_status === 'pending', `status=${r.data?.data?.status} vs=${r.data?.data?.verification_status}`);

  // validation failures
  r = await req('POST', '/api/farmer/loans', { token: TA, json: true, body: { title: 'X', amount: 100, duration: '6 months', purpose: 'p', installmentType: 'weekly' } });
  report('loan apply invalid installmentType 400', r.status === 400, `status=${r.status} msg=${r.data?.message}`);
  r = await req('POST', '/api/farmer/loans', { token: TA, json: true, body: { title: 'X', amount: -5, duration: '6 months', purpose: 'p', installmentType: 'monthly' } });
  report('loan apply negative amount 400', r.status === 400, `status=${r.status} msg=${r.data?.message}`);
  r = await req('POST', '/api/farmer/loans', { token: TA, json: true, body: { amount: 100, duration: '6 months', purpose: 'p', installmentType: 'monthly' } });
  report('loan apply missing title 400', r.status === 400, `status=${r.status} msg=${r.data?.message}`);

  // list + get with timeline
  r = await req('GET', '/api/farmer/loans', { token: TA });
  const loans = r.data?.data ?? [];
  report('loan list 200 includes own', r.status === 200 && loans.some((l) => l.id === loanA), `total=${loans.length}`);
  report('loan list only own', loans.every((l) => l.farmer_id === farmerA.id), 'farmer_id scope');

  r = await req('GET', `/api/farmer/loans/${loanA}`, { token: TA });
  report('loan get own 200 with timeline', r.status === 200 && Array.isArray(r.data?.data?.loan_timeline) && r.data.data.loan_timeline.length === 3, `steps=${(r.data?.data?.loan_timeline ?? []).length}`);

  r = await req('GET', '/api/farmer/loans/not-a-uuid', { token: TA });
  report('loan get invalid UUID 400', r.status === 400, `status=${r.status} msg=${r.data?.message}`);

  r = await req('GET', '/api/farmer/loans/00000000-0000-4000-8000-000000000000', { token: TA });
  report('loan get nonexistent 404', r.status === 404, `status=${r.status}`);

  // farmer B applies; farmer A must not see it (IDOR)
  r = await req('POST', '/api/farmer/loans', { token: TB, json: true, body: {
    title: "B's loan", amount: 10000, duration: '6 months', purpose: 'seeds', installmentType: 'seasonal',
  }});
  const loanB = r.data?.data?.id;
  report('setup: farmer B loan created', r.status === 201 && !!loanB, `id=${loanB}`);
  r = await req('GET', `/api/farmer/loans/${loanB}`, { token: TA });
  report('loan get foreign 404', r.status === 404, `status=${r.status}`);
  r = await req('GET', '/api/farmer/loans', { token: TA });
  report('loan list does not leak B loans', !(r.data?.data ?? []).some((l) => l.id === loanB), 'leak check');

  // auth guards
  r = await req('POST', '/api/farmer/loans', { json: true, body: { title: 'x', amount: 1, duration: 'd', purpose: 'p', installmentType: 'monthly' } });
  report('loan apply no token 401', r.status === 401, `status=${r.status}`);
  r = await req('GET', '/api/farmer/loans', { token: OFFICER_TOKEN });
  report('loan list officer token 403', r.status === 403, `status=${r.status}`);

  // ---------- Credit profile ----------
  r = await req('GET', '/api/farmer/credit', { token: TA });
  const credit = r.data?.data;
  report('credit GET 200 structured', r.status === 200 && !!credit?.verified && !!credit?.declared && !!credit?.loanSummary, `status=${r.status}`);
  report('credit verified fields present', typeof credit?.verified?.isVerified === 'boolean' && typeof credit?.verified?.creditScore === 'number', `verified=${credit?.verified?.isVerified} score=${credit?.verified?.creditScore}`);
  report('credit loanSummary counts own apps', credit?.loanSummary?.totalApplications === 2, `total=${credit?.loanSummary?.totalApplications}`);
  report('credit farmer is self', credit?.farmer?.id === farmerA.id, `id=${credit?.farmer?.id}`);

  r = await req('GET', '/api/farmer/credit', { token: TB });
  report('credit GET farmer B only own', r.status === 200 && r.data?.data?.farmer?.id === farmerB.id, `id=${r.data?.data?.farmer?.id}`);

  // write attempts on credit are not routed (read-only)
  r = await req('PUT', '/api/farmer/credit', { token: TA, json: true, body: { creditScore: 999 } });
  report('credit PUT not routed 404', r.status === 404, `status=${r.status}`);

  r = await req('GET', '/api/farmer/credit');
  report('credit GET no token 401', r.status === 401, `status=${r.status}`);
  r = await req('GET', '/api/farmer/credit', { token: OFFICER_TOKEN });
  report('credit GET officer token 403', r.status === 403, `status=${r.status}`);

  // ---------- Dashboard regression ----------
  r = await req('GET', '/api/farmer/dashboard', { token: TA });
  report('dashboard GET still 200', r.status === 200 && r.data?.loanCount === 2, `status=${r.status} loanCount=${r.data?.loanCount}`);

  // ---------- summary ----------
  const passed = results.filter((x) => x.ok).length;
  console.log(`==== ${passed}/${results.length} passed ====`);
  process.exitCode = passed === results.length ? 0 : 1;
})();
