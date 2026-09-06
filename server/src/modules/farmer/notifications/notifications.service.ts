import { supabase } from '../../../config/supabase';

// ------------------------------------------------------------------
// Shared notification write path (farmer / field officer / bank officer)
// ------------------------------------------------------------------
// The live notifications table is keyed by `farmer_id` → farmer_profiles.id
// (NOT NULL) and also requires a `message` column — a design that superseded
// the original `user_id`-only shape in the repo schema files. The database is
// the source of truth and is not modified here, so every write:
//
//   1. resolves (or backfills) the target farmer's farmer_profiles row, and
//   2. inserts with BOTH farmer_id (the FK the live table requires) AND
//      user_id (the profiles.id the rest of the app reads notifications by).
//
// A backfill is a data upsert, never a schema change. Failures are
// non-fatal: a notification must never roll back the business action it
// accompanies (submit/verify/forward/decision).

const farmerProfileIdCache = new Map<string, string>();

const resolveFarmersProfileId = async (profileId: string): Promise<string | null> => {
  try {
    if (farmerProfileIdCache.has(profileId)) {
      return farmerProfileIdCache.get(profileId) ?? null;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, farmer_id, name_en, email, phone')
      .eq('id', profileId)
      .maybeSingle();
    if (!profile) {
      return null;
    }

    const code = String(profile.farmer_id ?? '').trim();

    const selectByCode = async () => {
      const { data } = await supabase
        .from('farmer_profiles')
        .select('id')
        .eq('farmer_id', code)
        .maybeSingle();
      return data?.id ?? null;
    };

    if (code) {
      const existing = await selectByCode();
      if (existing) {
        farmerProfileIdCache.set(profileId, existing);
        return existing;
      }
    }

    // farmer_profiles.id is a FK to users.id (the farmer's own auth/user id —
// no DB-side default, so it must be supplied explicitly); the text columns
// are NOT NULL as well.
    const { data: inserted, error } = await supabase
      .from('farmer_profiles')
      .insert({
        id: profileId,
        farmer_id: code,
        name_en: profile.name_en ?? '',
        email: profile.email ?? '',
        phone: profile.phone ?? '',
      })
      .select('id')
      .maybeSingle();

    if (inserted?.id) {
      farmerProfileIdCache.set(profileId, inserted.id);
      return inserted.id;
    }
    if (code && (error as any)?.code === '23505') {
      const raced = await selectByCode();
      if (raced) {
        farmerProfileIdCache.set(profileId, raced);
        return raced;
      }
    }
    return null;
  } catch {
    return null;
  }
};

export const notifyFarmer = async (farmerId: string, title: string, description: string) => {
  try {
    const farmerProfileId = await resolveFarmersProfileId(farmerId);
    const row: Record<string, unknown> = {
      user_id: farmerId,
      title,
      message: description,
      description,
      read: false,
      type: 'info',
    };
    if (farmerProfileId) {
      row.farmer_id = farmerProfileId;
    }
    const { error } = await supabase.from('notifications').insert(row);
    if (error) {
      // A farmer without a resolvable farmer_profiles row fails the NOT NULL
      // farmer_id constraint; there is nothing left to do but not break the
      // caller.
      console.warn('notification insert failed (non-fatal):', error.message);
    }
  } catch (err) {
    console.warn('notification insert failed (non-fatal):', err);
  }
};

export const getNotifications = async (userId?: string) => {
  if (!userId) {
    throw new Error('Unauthorized');
  }
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const markAsRead = async (userId: string, notificationId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('id', notificationId)
    .select()
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const deleteNotification = async (userId: string, notificationId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .eq('id', notificationId)
    .select()
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
};
