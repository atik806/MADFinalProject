// One-off: permanently delete an account by auth-user id.
// Deleting the auth user cascades to profiles and every farmer_id/*_id FK
// that is declared `on delete cascade`.
// Usage: node scripts/delete-user.mjs <auth-user-id>
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing');
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const id = (process.argv[2] || '').trim();
if (!id) throw new Error('pass an auth-user id');

const { data: before } = await admin
  .from('profiles')
  .select('id, role, name_en, email, phone')
  .eq('id', id)
  .maybeSingle();
console.log('target profile:', before ?? '(no profile row)');

const { error: authErr } = await admin.auth.admin.deleteUser(id);
if (authErr && !/not found/i.test(authErr.message)) throw authErr;
console.log('auth user deleted', authErr ? `(warn: ${authErr.message})` : '');

// Defensive: clear an orphan profile row if the cascade did not fire.
const { error: profErr } = await admin.from('profiles').delete().eq('id', id);
if (profErr) throw profErr;

const { data: after } = await admin.from('profiles').select('id').eq('id', id).maybeSingle();
console.log('profile row now:', after ?? '(gone)');
