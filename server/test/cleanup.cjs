// Cleanup for test-created loan workflow records (loan-cleanup.tmp),
// milestone-2 records (cleanup.tmp), farmer records (farmer-cleanup.tmp) and
// bank-officer review records (bank-cleanup.tmp).
// Safe to re-run; reports what it removed.
require('dotenv').config({ path: __dirname + '/../.env' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

(async () => {
  const removed = { loans: 0, timeline: 0, notifications: 0, visits: 0, farmers: 0, officers: 0, authUsers: 0 };

  const loanFile = path.join(__dirname, 'loan-cleanup.tmp');
  if (fs.existsSync(loanFile)) {
    const { farmerId, officerBId, loanIds } = JSON.parse(fs.readFileSync(loanFile, 'utf8'));
    for (const loanId of loanIds ?? []) {
      const { error: tlErr } = await supabase.from('loan_timeline').delete().eq('loan_application_id', loanId);
      if (!tlErr) removed.timeline += 1;
      const { error: lErr } = await supabase.from('loan_applications').delete().eq('id', loanId);
      if (!lErr) removed.loans += 1;
    }
    // notifications for the test farmer
    const { error: nErr } = await supabase.from('notifications').delete().eq('user_id', farmerId);
    if (!nErr) removed.notifications += 1;
    // farmer profile + auth user
    const { data: farmerProfile } = await supabase.from('profiles').select('id').eq('id', farmerId).maybeSingle();
    if (farmerProfile) {
      await supabase.from('field_officer_assignments').delete().eq('farmer_id', farmerId);
      const { error: pErr } = await supabase.from('profiles').delete().eq('id', farmerId);
      if (!pErr) removed.farmers += 1;
      const { error: aErr } = await supabase.auth.admin.deleteUser(farmerId);
      if (!aErr) removed.authUsers += 1;
    }
    // officer B (profile + auth user)
    if (officerBId) {
      const { data: officerProfile } = await supabase.from('profiles').select('id').eq('id', officerBId).maybeSingle();
      if (officerProfile) {
        const { error: pErr } = await supabase.from('profiles').delete().eq('id', officerBId);
        if (!pErr) removed.officers += 1;
        const { error: aErr } = await supabase.auth.admin.deleteUser(officerBId);
        if (!aErr) removed.authUsers += 1;
      }
    }
    fs.unlinkSync(loanFile);
  }

  const m2File = path.join(__dirname, 'cleanup.tmp');
  if (fs.existsSync(m2File)) {
    const { farmerId, visitId } = JSON.parse(fs.readFileSync(m2File, 'utf8'));
    if (visitId) {
      const { error } = await supabase.from('field_visits').delete().eq('id', visitId);
      if (!error) removed.visits += 1;
    }
    if (farmerId) {
      await supabase.from('field_officer_assignments').delete().eq('farmer_id', farmerId);
      await supabase.from('notifications').delete().eq('user_id', farmerId);
      const { data: farmerProfile } = await supabase.from('profiles').select('id').eq('id', farmerId).maybeSingle();
      if (farmerProfile) {
        await supabase.from('farmer_verifications').delete().eq('farmer_id', farmerId);
        const { error: pErr } = await supabase.from('profiles').delete().eq('id', farmerId);
        if (!pErr) removed.farmers += 1;
        const { error: aErr } = await supabase.auth.admin.deleteUser(farmerId);
        if (!aErr) removed.authUsers += 1;
      }
    }
    fs.unlinkSync(m2File);
  }

  const farmerFile = path.join(__dirname, 'farmer-cleanup.tmp');
  if (fs.existsSync(farmerFile)) {
    const { farmerIds } = JSON.parse(fs.readFileSync(farmerFile, 'utf8'));
    for (const fid of farmerIds ?? []) {
      // dependent rows first (transactions/loans cascade on profile delete,
      // but timeline/notifications need explicit cleanup for loan children)
      const { data: loans } = await supabase.from('loan_applications').select('id').eq('farmer_id', fid);
      for (const loan of loans ?? []) {
        const { error: tlErr } = await supabase.from('loan_timeline').delete().eq('loan_application_id', loan.id);
        if (!tlErr) removed.timeline += 1;
      }
      await supabase.from('transactions').delete().eq('farmer_id', fid);
      await supabase.from('notifications').delete().eq('user_id', fid);
      const { data: farmerProfile } = await supabase.from('profiles').select('id').eq('id', fid).maybeSingle();
      if (farmerProfile) {
        const { error: pErr } = await supabase.from('profiles').delete().eq('id', fid);
        if (!pErr) removed.farmers += 1;
        const { error: aErr } = await supabase.auth.admin.deleteUser(fid);
        if (!aErr) removed.authUsers += 1;
      }
    }
    fs.unlinkSync(farmerFile);
  }

  const bankFile = path.join(__dirname, 'bank-cleanup.tmp');
  if (fs.existsSync(bankFile)) {
    const { farmerIds, officerIds, loanIds } = JSON.parse(fs.readFileSync(bankFile, 'utf8'));

    // Loan children first: loan_timeline has no cascade from a profile delete.
    for (const loanId of loanIds ?? []) {
      const { error: tlErr } = await supabase.from('loan_timeline').delete().eq('loan_application_id', loanId);
      if (!tlErr) removed.timeline += 1;
      const { error: lErr } = await supabase.from('loan_applications').delete().eq('id', loanId);
      if (!lErr) removed.loans += 1;
    }

    for (const fid of farmerIds ?? []) {
      await supabase.from('field_officer_assignments').delete().eq('farmer_id', fid);
      await supabase.from('farmer_verifications').delete().eq('farmer_id', fid);
      await supabase.from('transactions').delete().eq('farmer_id', fid);
      const { error: nErr } = await supabase.from('notifications').delete().eq('user_id', fid);
      if (!nErr) removed.notifications += 1;
      const { data: farmerProfile } = await supabase.from('profiles').select('id').eq('id', fid).maybeSingle();
      if (farmerProfile) {
        const { error: pErr } = await supabase.from('profiles').delete().eq('id', fid);
        if (!pErr) removed.farmers += 1;
        const { error: aErr } = await supabase.auth.admin.deleteUser(fid);
        if (!aErr) removed.authUsers += 1;
      }
    }

    // Officers (field + bank) created by the suite. loan_applications carries
    // FK references to them (field_officer_id / forwarded_by / bank_officer_id)
    // so the loans above must be gone first.
    for (const oid of officerIds ?? []) {
      await supabase.from('field_officer_assignments').delete().eq('field_officer_id', oid);
      await supabase.from('field_visits').delete().eq('field_officer_id', oid);
      const { data: officerProfile } = await supabase.from('profiles').select('id').eq('id', oid).maybeSingle();
      if (officerProfile) {
        const { error: pErr } = await supabase.from('profiles').delete().eq('id', oid);
        if (!pErr) removed.officers += 1;
        const { error: aErr } = await supabase.auth.admin.deleteUser(oid);
        if (!aErr) removed.authUsers += 1;
      }
    }

    fs.unlinkSync(bankFile);
  }

  console.log('CLEANUP_DONE', JSON.stringify(removed));
})();
