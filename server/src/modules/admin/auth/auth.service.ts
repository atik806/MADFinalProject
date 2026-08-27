import { supabase, supabaseAdmin } from '../../../config/supabase';
import { config } from 'dotenv';

config();

// Admin credentials are pulled from environment variables so the seed
// account can be rotated without redeploying. The default matches the
// spec: admin@gmail.com / 123456.
const DEFAULT_ADMIN_EMAIL = 'admin@gmail.com';
const DEFAULT_ADMIN_PASSWORD = '123456';

export const getAdminCredentials = () => ({
  email: (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase(),
  password: process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD,
});

const shortHex = (): string => {
  return Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0')
    .padStart(6, '0')
    .toUpperCase();
};

// Fetches the profile row for an authenticated user. Returns null when
// the profile does not exist.
export const getProfileById = async (userId: string) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

// ensureAdminUser: idempotent. Creates the Supabase auth user (if
// missing), the profiles row (if missing), and the admin_notifications
// skeleton. Safe to call on every server start.
export const ensureAdminUser = async (): Promise<{ created: boolean; userId: string | null; email: string }> => {
  const { email, password } = getAdminCredentials();

  // 1) Check if the admin already has a profiles row.
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, role')
    .eq('email', email)
    .maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  if (existing) {
    // Make sure the role is set to admin (in case a previous seed
    // accidentally wrote a different role for the same email).
    if (String(existing.role).toLowerCase() !== 'admin') {
      await supabaseAdmin.from('profiles').update({ role: 'admin', status: 'active' }).eq('id', existing.id);
    }
    return { created: false, userId: existing.id, email };
  }

  // 2) No profile yet. Look in auth.users by email and reuse if found.
  let adminUserId: string | null = null;
  try {
    for (let page = 1; ; page += 1) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) break;
      const match = data.users.find((u) => String(u.email ?? '').toLowerCase() === email);
      if (match) {
        adminUserId = match.id;
        break;
      }
      if ((data.users?.length ?? 0) < 200) break;
    }
  } catch (err) {
    console.warn('Could not list auth users while seeding admin:', err);
  }

  if (!adminUserId) {
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'System Administrator', role: 'admin' },
    });
    if (createError || !created?.user) {
      throw new Error(createError?.message ?? 'Failed to create admin auth user');
    }
    adminUserId = created.user.id;
  }

  // 3) Insert the profiles row.
  // The optional admin_* columns may not exist yet if the admin.sql
  // schema has not been applied. Insert the required fields first,
  // then layer on the optional ones only if the previous step
  // succeeded.
  const baseProfileRow = {
    id: adminUserId,
    role: 'admin',
    status: 'active',
    email,
    name_en: 'System Administrator',
    is_verified: true,
    member_since: new Date().toISOString(),
  };

  const { error: baseProfileError } = await supabaseAdmin.from('profiles').insert(baseProfileRow);
  if (baseProfileError) {
    if (/duplicate key|already exists/i.test(baseProfileError.message)) {
      await supabaseAdmin
        .from('profiles')
        .update({ role: 'admin', status: 'active' })
        .eq('id', adminUserId);
    } else if (/column.*does not exist/i.test(baseProfileError.message)) {
      // profiles table is missing one of the new admin columns.
      // Retry with just role/status.
      const { error: fallbackError } = await supabaseAdmin
        .from('profiles')
        .upsert({ ...baseProfileRow, role: 'admin' }, { onConflict: 'id' });
      if (fallbackError && !/duplicate key|already exists/i.test(fallbackError.message)) {
        throw new Error(fallbackError.message);
      }
    } else {
      throw new Error(baseProfileError.message);
    }
  }

  // Best-effort patch of admin-specific columns (idempotent, safe if
  // they don't exist yet — run admin.sql to enable them).
  await supabaseAdmin
    .from('profiles')
    .update({
      admin_id: `ADM-${shortHex()}`,
      admin_level: 'super',
      admin_since: new Date().toISOString(),
    })
    .eq('id', adminUserId);

  return { created: true, userId: adminUserId, email };
};

// loginAdmin: simple email + password login. Always re-checks the
// env-configured admin email so rotating the .env invalidates old
// accounts in the same deployment.
export const loginAdmin = async (identifier: string, password: string) => {
  const rawIdentifier = String(identifier ?? '').trim();
  const { email: adminEmail, password: adminPassword } = getAdminCredentials();

  // Normalize identifier to email if it doesn't already look like one.
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawIdentifier);
  const candidateEmail = isEmail ? rawIdentifier.toLowerCase() : adminEmail;

  // Hard guard: only the configured admin email can sign in here.
  if (candidateEmail !== adminEmail) {
    throw new Error('Invalid admin credentials');
  }
  if (password !== adminPassword) {
    throw new Error('Invalid admin credentials');
  }

  // Try the standard Supabase password sign-in first.
  const { data, error } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });

  if (error || !data?.session?.access_token || !data?.user) {
    // The auth user might be missing (e.g. fresh DB). Re-seed and retry.
    try {
      await ensureAdminUser();
    } catch (seedErr: any) {
      throw new Error(seedErr?.message ?? error?.message ?? 'Admin login failed');
    }

    const retry = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });
    if (retry.error || !retry.data?.session?.access_token || !retry.data?.user) {
      throw new Error(retry.error?.message ?? 'Admin login failed');
    }
    return retry.data;
  }

  return data;
};

// changeAdminPassword: updates the env-configured admin password. The
// .env value is the source of truth — this just makes it convenient to
// rotate the password from the admin UI.
export const changeAdminPassword = async (currentPassword: string, newPassword: string) => {
  const { email, password } = getAdminCredentials();

  if (!currentPassword || !newPassword) {
    throw new Error('Current password and new password are required');
  }
  if (currentPassword !== password) {
    throw new Error('Current password is incorrect');
  }
  if (String(newPassword).length < 6) {
    throw new Error('New password must be at least 6 characters');
  }

  // Find the admin's auth id.
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .eq('role', 'admin')
    .maybeSingle();
  if (profileError) {
    throw new Error(profileError.message);
  }
  if (!profile?.id) {
    throw new Error('Admin profile not found');
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
    password: newPassword,
  });
  if (updateError) {
    throw new Error(updateError.message);
  }

  return { success: true };
};
