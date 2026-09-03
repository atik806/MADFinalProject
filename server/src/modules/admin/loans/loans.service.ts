import { supabase, supabaseAdmin } from '../../../config/supabase';

export interface ListLoansFilters {
  search?: string;
  status?: string;
  verificationStatus?: string;
  fieldOfficerId?: string;
  farmerId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminLoanSummary {
  id: string;
  farmer_id: string;
  farmer_name: string;
  farmer_phone: string | null;
  amount: number;
  purpose: string | null;
  status: string;
  verification_status: string;
  verified_at: string | null;
  verification_notes: string | null;
  forwarded_at: string | null;
  recommended_amount: number;
  field_officer_id: string | null;
  field_officer_name: string | null;
  created_at: string;
}

const buildSummary = (row: any, farmer: any, officer: any): AdminLoanSummary => ({
  id: row.id,
  farmer_id: row.farmer_id,
  farmer_name: farmer?.name_en ?? farmer?.name_bn ?? 'Unknown',
  farmer_phone: farmer?.phone ?? null,
  amount: Number(row.amount ?? 0),
  purpose: row.purpose ?? null,
  status: row.status ?? 'pending',
  verification_status: row.verification_status ?? 'pending',
  verified_at: row.verified_at ?? null,
  verification_notes: row.verification_notes ?? null,
  forwarded_at: row.forwarded_at ?? null,
  recommended_amount: Number(row.recommended_amount ?? 0),
  field_officer_id: row.field_officer_id ?? null,
  field_officer_name: officer?.name_en ?? officer?.name_bn ?? null,
  created_at: row.created_at,
});

export const listLoans = async (filters: ListLoansFilters) => {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from('loan_applications')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.verificationStatus) {
    query = query.eq('verification_status', filters.verificationStatus);
  }
  if (filters.fieldOfficerId) {
    query = query.eq('field_officer_id', filters.fieldOfficerId);
  }
  if (filters.farmerId) {
    query = query.eq('farmer_id', filters.farmerId);
  }
  if (filters.from) {
    query = query.gte('created_at', filters.from);
  }
  if (filters.to) {
    query = query.lte('created_at', filters.to);
  }

  const { data, count, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  // Resolve farmer and officer names in bulk.
  const farmerIds = Array.from(new Set((data ?? []).map((r: any) => r.farmer_id).filter(Boolean)));
  const officerIds = Array.from(
    new Set((data ?? []).map((r: any) => r.field_officer_id).filter(Boolean)),
  );

  const [{ data: farmers }, { data: officers }] = await Promise.all([
    farmerIds.length > 0
      ? supabaseAdmin.from('profiles').select('id, name_en, name_bn, phone').in('id', farmerIds)
      : Promise.resolve({ data: [] as any[] }),
    officerIds.length > 0
      ? supabaseAdmin.from('profiles').select('id, name_en, name_bn').in('id', officerIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const farmerById = new Map<string, any>();
  (farmers ?? []).forEach((f: any) => farmerById.set(f.id, f));
  const officerById = new Map<string, any>();
  (officers ?? []).forEach((o: any) => officerById.set(o.id, o));

  let items = (data ?? []).map((row: any) => buildSummary(row, farmerById.get(row.farmer_id), officerById.get(row.field_officer_id)));

  if (filters.search) {
    const term = filters.search.toLowerCase();
    items = items.filter(
      (i) =>
        i.farmer_name.toLowerCase().includes(term) ||
        (i.farmer_phone ?? '').toLowerCase().includes(term) ||
        (i.purpose ?? '').toLowerCase().includes(term) ||
        (i.field_officer_name ?? '').toLowerCase().includes(term),
    );
  }

  return {
    items,
    pagination: {
      page,
      pageSize,
      total: count ?? items.length,
      totalPages: Math.max(1, Math.ceil((count ?? items.length) / pageSize)),
    },
  };
};

export interface AdminLoanDetail extends AdminLoanSummary {
  farmer_location: string | null;
  farmer_nid: string | null;
  crop: string | null;
  duration_months: number | null;
  documents: string[];
  notes: string | null;
  loan_history: {
    id: string;
    action: string;
    previous_status: string | null;
    new_status: string | null;
    notes: string | null;
    created_at: string;
    actor_name: string | null;
  }[];
}

export const getLoanById = async (id: string): Promise<AdminLoanDetail> => {
  const { data, error } = await supabaseAdmin
    .from('loan_applications')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Loan application not found');
  }

  let farmer: any = null;
  if (data.farmer_id) {
    const { data: f } = await supabaseAdmin
      .from('profiles')
      .select('id, name_en, name_bn, phone, location, nid, primary_crop, selected_crops')
      .eq('id', data.farmer_id)
      .maybeSingle();
    farmer = f;
  }

  let officer: any = null;
  if (data.field_officer_id) {
    const { data: o } = await supabaseAdmin
      .from('profiles')
      .select('id, name_en, name_bn')
      .eq('id', data.field_officer_id)
      .maybeSingle();
    officer = o;
  }

  const base = buildSummary(data, farmer, officer);

  const { data: timeline, error: timelineError } = await supabaseAdmin
    .from('loan_verifications')
    .select('id, action, previous_status, new_status, notes, created_at, field_officer_id')
    .eq('loan_application_id', id)
    .order('created_at', { ascending: false });
  if (timelineError) {
    console.error('Failed to load loan timeline:', timelineError);
  }

  const actorIds = Array.from(
    new Set((timeline ?? []).map((t: any) => t.field_officer_id).filter(Boolean)),
  );
  let actorById = new Map<string, any>();
  if (actorIds.length > 0) {
    const { data: actors } = await supabaseAdmin
      .from('profiles')
      .select('id, name_en, name_bn')
      .in('id', actorIds);
    (actors ?? []).forEach((a: any) => actorById.set(a.id, a));
  }

  const loan_history = (timeline ?? []).map((t: any) => ({
    id: t.id,
    action: t.action,
    previous_status: t.previous_status ?? null,
    new_status: t.new_status ?? null,
    notes: t.notes ?? null,
    created_at: t.created_at,
    actor_name: actorById.get(t.field_officer_id)?.name_en ?? actorById.get(t.field_officer_id)?.name_bn ?? null,
  }));

  return {
    ...base,
    farmer_location: farmer?.location ?? null,
    farmer_nid: farmer?.nid ?? null,
    crop: farmer?.primary_crop ?? (Array.isArray(farmer?.selected_crops) ? farmer.selected_crops[0] : null) ?? null,
    duration_months: data.duration_months ?? data.duration ?? null,
    documents: Array.isArray(data.documents) ? data.documents : Array.isArray(data.document_urls) ? data.document_urls : [],
    notes: data.notes ?? null,
    loan_history,
  };
};
