// One-off: inspect an officer account's role across profiles + auth metadata.
// Usage: node scripts/inspect-officer.mjs <email|phone|nid|name-fragment>
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing');
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const term = (process.argv[2] || '').trim();
if (!term) throw new Error('pass an email / phone / nid / name fragment');

const { data: profiles, error } = await admin
  .from('profiles')
  .select('id, role, status, name_en, name_bn, nid, phone, email, designation, bank_name, branch_name, supervised_district')
  .or(
    `name_en.ilike.%${term}%,name_bn.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,nid.ilike.%${term}%`,
  );
if (error) throw error;

if (!profiles?.length) {
  console.log('No profile matched:', term);
  process.exit(0);
}

for (const p of profiles) {
  const { data: authRes } = await admin.auth.admin.getUserById(p.id);
  const u = authRes?.user;
  console.log('────────────────────────────────');
  console.log('name        ', p.name_en ?? p.name_bn);
  console.log('id          ', p.id);
  console.log('profiles.role', p.role, '| status', p.status);
  console.log('designation ', p.designation);
  console.log('bank/branch ', p.bank_name, '/', p.branch_name);
  console.log('supervised  ', p.supervised_district);
  console.log('auth app_metadata.role ', u?.app_metadata?.role);
  console.log('auth user_metadata.role', u?.user_metadata?.role);
  console.log('email/phone ', p.email, '/', p.phone);
}
