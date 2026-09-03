import { supabaseAdmin } from '../../config/supabase';

// ------------------------------------------------------------------
// Shared officer account provisioning primitives
// ------------------------------------------------------------------
// Officer accounts (field officer, bank officer) are always created by an
// admin — there is no self-registration for staff roles. Every officer needs
// the same three things: a normalized phone, a short human-readable staff id,
// and a Supabase Auth user that survives a half-finished earlier attempt.
//
// These helpers are shared so a new officer type cannot silently drift from
// the established behaviour (e.g. storing an un-normalized phone that then
// fails duplicate detection).

export const shortHex = (): string =>
  Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0')
    .toUpperCase();

// Bangladeshi numbers are stored in E.164 so duplicate checks and Supabase
// Auth agree on a single representation.
export const normalizePhone = (phone: string): string => {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('880')) return `+${digits}`;
  if (digits.startsWith('0')) return `+88${digits}`;
  return `+880${digits}`;
};

// findOrphanAuthUser: an Auth user with no matching profiles row, left behind
// when a previous provisioning attempt created the Auth user but failed before
// inserting the profile. Such a user blocks re-registration with the same
// NID/phone, so it is safe to remove and recreate.
export const findOrphanAuthUser = async (email: string, phone: string) => {
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    for (const user of data.users) {
      if (user.email === email || user.phone === phone) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();
        if (!profile) return user;
      }
    }
    if ((data.users?.length ?? 0) < 200) return null;
  }
};

export interface OfficerAuthUserInput {
  email: string;
  phone: string;
  password: string;
  fullName: string;
  role: string;
}

// createOfficerAuthUser: creates the Auth user, retrying once after clearing an
// orphaned user. Staff accounts are pre-confirmed because the admin has
// already vetted them offline.
export const createOfficerAuthUser = async (input: OfficerAuthUserInput) => {
  const attempt = () =>
    supabaseAdmin.auth.admin.createUser({
      phone: input.phone,
      email: input.email,
      password: input.password,
      phone_confirm: true,
      email_confirm: true,
      // full_name for display; role in BOTH:
      //  - app_metadata is settable only with the service-role key, so the
      //    role guards can trust it (the profiles row stays the primary check)
      //  - user_metadata mirrors it for any client-side display code
      app_metadata: { role: input.role },
      user_metadata: { full_name: input.fullName, role: input.role },
    });

  let { data, error } = await attempt();

  if (error && /already (been )?registered/i.test(error.message)) {
    const orphan = await findOrphanAuthUser(input.email, input.phone);
    if (orphan) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(orphan.id);
      if (!deleteError) {
        ({ data, error } = await attempt());
      }
    }
  }

  return { data, error };
};
