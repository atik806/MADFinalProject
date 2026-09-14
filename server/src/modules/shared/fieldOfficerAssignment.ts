import { supabaseAdmin } from '../../config/supabase';

// ensureFieldOfficerAssignment: load-balances a farmer onto whichever active
// field officer currently has the fewest active assignments, so the
// farmer's loan applications are visible to someone. A no-op if the farmer
// already has an assignment, or if no field officer is active yet.
// Assignment is best-effort and must never block the caller, so every
// failure is swallowed. Returns the assigned officer's id, or null if
// nothing changed.
//
// Called from two places:
//  - admin/users/users.service.ts, right when an admin approves a farmer
//    (the normal, immediate path).
//  - farmer/auth/auth.service.ts, on every successful farmer login, as a
//    self-healing fallback for accounts that were approved before this
//    assignment step existed (or otherwise ended up without one) — their
//    existing loan applications were stuck invisible to every field officer
//    and could never reach the bank until this ran once for them.
export const ensureFieldOfficerAssignment = async (farmerId: string): Promise<string | null> => {
  try {
    const { data: existing } = await supabaseAdmin
      .from('field_officer_assignments')
      .select('id')
      .eq('farmer_id', farmerId)
      .limit(1)
      .maybeSingle();
    if (existing) return null;

    const { data: officers, error: officersError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'field_officer')
      .eq('status', 'active');
    if (officersError || !officers || officers.length === 0) return null;

    const { data: assignments, error: assignmentsError } = await supabaseAdmin
      .from('field_officer_assignments')
      .select('field_officer_id')
      .eq('status', 'active')
      .in(
        'field_officer_id',
        officers.map((o: any) => o.id),
      );
    if (assignmentsError) return null;

    const loadByOfficer = new Map<string, number>(officers.map((o: any) => [o.id, 0]));
    for (const row of assignments ?? []) {
      loadByOfficer.set(row.field_officer_id, (loadByOfficer.get(row.field_officer_id) ?? 0) + 1);
    }

    let chosen: string | null = null;
    let lowest = Infinity;
    for (const officer of officers) {
      const load = loadByOfficer.get(officer.id) ?? 0;
      if (load < lowest) {
        lowest = load;
        chosen = officer.id;
      }
    }
    if (!chosen) return null;

    const { error: insertError } = await supabaseAdmin.from('field_officer_assignments').insert({
      field_officer_id: chosen,
      farmer_id: farmerId,
      status: 'active',
    });
    if (insertError) {
      console.error('ensureFieldOfficerAssignment insert failed:', insertError);
      return null;
    }
    return chosen;
  } catch (err) {
    console.error('ensureFieldOfficerAssignment failed:', err);
    return null;
  }
};
