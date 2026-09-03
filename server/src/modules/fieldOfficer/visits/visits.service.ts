import { supabase } from '../../../config/supabase';
import { recordAuditLog } from '../../admin/audit/audit.service';
import { assertAssigned } from '../farmers/farmers.service';
import { optionalText, parseIsoDate, requireUuid } from '../validation';

const VISIT_STATUSES = ['scheduled', 'in-progress', 'completed', 'cancelled'] as const;

// A field officer can only manage field_visits they own, for farmers they are
// actively assigned to. Protected columns (field_officer_id, farmer_id,
// created_at) are never writable through these endpoints.

// assertVisitOwnedByOfficer: verifies a visit exists and belongs to the given
// officer. Throws a 404-style error when not found or not owned, so an officer
// can never read/update another officer's visit.
const assertVisitOwnedByOfficer = async (officerId: string, visitId: string) => {
  requireUuid(visitId, 'Visit id');
  const { data, error } = await supabase
    .from('field_visits')
    .select('id, status, farmer_id, purpose, notes, visit_date, location, visit_type')
    .eq('id', visitId)
    .eq('field_officer_id', officerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Visit not found or not owned by this field officer');
  }
  return data;
};

export interface ScheduleVisitInput {
  farmerId: string;
  visitDate?: string;
  scheduledDate?: string;
  purpose?: string;
  notes?: string;
  location?: string;
  visitType?: string;
}

// scheduleVisit: creates a visit for an assigned farmer. The officer must be
// assigned to the farmer, and the visit is always tied to the creating officer.
export const scheduleVisit = async (
  officerId: string,
  input: ScheduleVisitInput,
  officer: { id: string; name: string | null },
) => {
  requireUuid(input.farmerId, 'farmerId');
  await assertAssigned(officerId, input.farmerId);

  const requestedDate = input.visitDate ?? input.scheduledDate;
  const visitDate = requestedDate === undefined ? new Date().toISOString() : parseIsoDate(requestedDate, 'visitDate');

  const { data, error } = await supabase
    .from('field_visits')
    .insert({
      field_officer_id: officerId,
      farmer_id: input.farmerId,
      visit_date: visitDate,
      purpose: optionalText(input.purpose, 'purpose', 500),
      notes: optionalText(input.notes, 'notes', 2000),
      location: optionalText(input.location, 'location', 255),
      visit_type: optionalText(input.visitType, 'visitType', 100),
      status: 'scheduled',
    })
    .select()
    .single();

  if (error) {
    if ((error as any).code === '42P01') {
      throw new Error('field_visits table does not exist — run admin.sql schema');
    }
    throw new Error(error.message);
  }

  void recordAuditLog({
    actorId: officerId,
    actorRole: 'field_officer',
    actorName: officer.name ?? 'Field Officer',
    action: 'Scheduled field visit',
    module: 'FieldOfficer',
    targetId: input.farmerId,
    targetType: 'farmer',
    status: 'success',
    details: { visitId: data.id },
  });

  return data;
};

export interface ListVisitsFilters {
  status?: string;
  farmerId?: string;
  page?: number;
  pageSize?: number;
}

export const listVisits = async (officerId: string, filters: ListVisitsFilters) => {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('field_visits')
    .select('*', { count: 'exact' })
    .eq('field_officer_id', officerId)
    .order('visit_date', { ascending: false })
    .range(from, to);

  if (filters.status) {
    if (!VISIT_STATUSES.includes(filters.status as (typeof VISIT_STATUSES)[number])) {
      throw new Error(`Invalid visit status. Allowed: ${VISIT_STATUSES.join(', ')}`);
    }
    query = query.eq('status', filters.status);
  }
  if (filters.farmerId) {
    requireUuid(filters.farmerId, 'farmerId');
    query = query.eq('farmer_id', filters.farmerId);
  }

  const { data, count, error } = await query;
  if (error) {
    if ((error as any).code === '42P01') {
      return { items: [], pagination: { page, pageSize, total: 0, totalPages: 1 } };
    }
    throw new Error(error.message);
  }

  return {
    items: data ?? [],
    pagination: {
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
    },
  };
};

export const getVisit = async (officerId: string, visitId: string) => {
  return assertVisitOwnedByOfficer(officerId, visitId);
};

const VISIT_UPDATE_FIELDS = ['visit_date', 'purpose', 'notes', 'location', 'visit_type'] as const;

// updateVisit: edits a visit owned by the officer. Protected fields
// (field_officer_id, farmer_id, status, created_at) are not editable here —
// status transitions go through markVisitCompleted / cancelVisit.
export const updateVisit = async (
  officerId: string,
  visitId: string,
  payload: Record<string, any>,
  officer: { id: string; name: string | null },
) => {
  const existing = await assertVisitOwnedByOfficer(officerId, visitId);

  const updates: Record<string, any> = {};
  for (const key of VISIT_UPDATE_FIELDS) {
    if (key in payload) {
      const value = payload[key];
      if (key === 'visit_date') {
        updates[key] = parseIsoDate(value, 'visitDate');
      } else {
        const field = key === 'visit_type' ? 'visitType' : key;
        updates[key] = optionalText(value, field, key === 'notes' ? 2000 : key === 'location' ? 255 : key === 'purpose' ? 500 : 100);
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('No updatable fields provided');
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('field_visits')
    .update(updates)
    .eq('id', visitId)
    .eq('field_officer_id', officerId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Visit not found or not owned by this field officer');
  }

  void recordAuditLog({
    actorId: officerId,
    actorRole: 'field_officer',
    actorName: officer.name ?? 'Field Officer',
    action: 'Updated field visit',
    module: 'FieldOfficer',
    targetId: existing.farmer_id,
    targetType: 'farmer',
    status: 'success',
    details: { visitId, fields: Object.keys(updates) },
  });

  return data;
};

// markVisitCompleted: transitions a visit to 'completed' and stamps the
// completion on visit_date scope via updated_at. Only the owning officer can
// mark their own visit completed. Status transitions are validated: a
// cancelled or already-completed visit cannot be (re)completed.
export const markVisitCompleted = async (
  officerId: string,
  visitId: string,
  officer: { id: string; name: string | null },
) => {
  const existing = await assertVisitOwnedByOfficer(officerId, visitId);

  if (String(existing.status).toLowerCase() === 'completed') {
    throw new Error('Visit is already completed');
  }
  if (String(existing.status).toLowerCase() === 'cancelled') {
    throw new Error('Cancelled visits cannot be marked completed');
  }

  const { data, error } = await supabase
    .from('field_visits')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', visitId)
    .eq('field_officer_id', officerId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Visit not found or not owned by this field officer');
  }

  void recordAuditLog({
    actorId: officerId,
    actorRole: 'field_officer',
    actorName: officer.name ?? 'Field Officer',
    action: 'Completed field visit',
    module: 'FieldOfficer',
    targetId: existing.farmer_id,
    targetType: 'farmer',
    status: 'success',
    details: { visitId },
  });

  return data;
};

// cancelVisit: transitions a visit to 'cancelled'. Allowed for scheduled or
// in-progress visits, and only by the owning officer.
export const cancelVisit = async (
  officerId: string,
  visitId: string,
  officer: { id: string; name: string | null },
) => {
  const existing = await assertVisitOwnedByOfficer(officerId, visitId);

  const currentStatus = String(existing.status).toLowerCase();
  if (currentStatus === 'completed') {
    throw new Error('Completed visits cannot be cancelled');
  }
  if (currentStatus === 'cancelled') {
    throw new Error('Visit is already cancelled');
  }

  const { data, error } = await supabase
    .from('field_visits')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', visitId)
    .eq('field_officer_id', officerId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Visit not found or not owned by this field officer');
  }

  void recordAuditLog({
    actorId: officerId,
    actorRole: 'field_officer',
    actorName: officer.name ?? 'Field Officer',
    action: 'Cancelled field visit',
    module: 'FieldOfficer',
    targetId: existing.farmer_id,
    targetType: 'farmer',
    status: 'success',
    details: { visitId },
  });

  return data;
};
