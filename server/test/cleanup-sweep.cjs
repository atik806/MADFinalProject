// Thorough sweep of ALL test-created records, identified by test markers
// (names/titles only ever used by the E2E suites). Safe to re-run.
require('dotenv').config({ path: __dirname + '/../.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

(async () => {
  const removed = { profiles: 0, authUsers: 0, loans: 0, timeline: 0, assignments: 0, visits: 0, verifications: 0, notifications: 0, notificationsByLoan: 0 };

  // 1. All test farmers / officers created by E2E suites
  const { data: testProfiles } = await supabase
    .from('profiles')
    .select('id, role, name_en')
    .or("name_en.ilike.%Loan Farmer One%,name_en.ilike.%Farmer Test One%,name_en.ilike.%Officer B Loans Test%,name_en.ilike.%Dup%");
  for (const p of testProfiles ?? []) {
    // cascade-linked rows first (FKs may not cascade everywhere)
    await supabase.from('field_officer_assignments').delete().eq('farmer_id', p.id);
    await supabase.from('notifications').delete().eq('user_id', p.id);
    if (p.role === 'farmer') {
      await supabase.from('farmer_verifications').delete().eq('farmer_id', p.id);
    }
    const { data: farmerLoans } = await supabase.from('loan_applications').select('id').eq('farmer_id', p.id);
    for (const l of farmerLoans ?? []) {
      await supabase.from('loan_timeline').delete().eq('loan_application_id', l.id);
      removed.timeline += 1;
      await supabase.from('loan_applications').delete().eq('id', l.id);
      removed.loans += 1;
    }
    const { error } = await supabase.from('profiles').delete().eq('id', p.id);
    if (!error) removed.profiles += 1;
    const { error: auErr } = await supabase.auth.admin.deleteUser(p.id);
    if (!auErr) removed.authUsers += 1;
    console.log(`removed ${p.role} ${p.name_en} (${p.id})`);
  }

  // 2. Any leftover test loans whose farmer was already deleted (farmer_id null)
  const { data: orphanLoans } = await supabase
    .from('loan_applications')
    .select('id, title')
    .or("title.ilike.%Paddy Cultivation Loan%,title.ilike.%Draft For Verify Guard%,title.ilike.%guard test%");
  for (const l of orphanLoans ?? []) {
    await supabase.from('loan_timeline').delete().eq('loan_application_id', l.id);
    const { error } = await supabase.from('loan_applications').delete().eq('id', l.id);
    if (!error) { removed.loans += 1; console.log(`removed orphan loan "${l.title}" (${l.id})`); }
  }

  // 3. Visits/verifications referencing removed farmers
  const { data: orphanVisits } = await supabase.from('field_visits').select('id').or("purpose.ilike.%Land inspection%,notes.ilike.%Check irrigation%,purpose.ilike.%crop assessment%,purpose.ilike.%Inspected%");
  for (const v of orphanVisits ?? []) {
    const { error } = await supabase.from('field_visits').delete().eq('id', v.id);
    if (!error) removed.visits += 1;
  }

  console.log('SWEEP_DONE', JSON.stringify(removed));
})();
