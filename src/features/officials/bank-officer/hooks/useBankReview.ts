import { useCallback, useEffect, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import type { ApiResponse, BankDecisionInput, BankReviewRow, ListResult } from '@/lib/api-types';

// useBankReview: the bank officer's loan-review queue, backed by
// /api/bank-officer/loans. The queue is every application a field officer has
// forwarded; `refresh` re-pulls it, and the two actions (`startReview`,
// `decide`) hit the mutation endpoints and refresh on success.
export function useBankReview() {
  const [rows, setRows] = useState<BankReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await api.get<ApiResponse<ListResult<BankReviewRow>>>(
        '/api/bank-officer/loans?pageSize=100',
      );
      setRows(res.data?.items ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load the review queue.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load('initial');
  }, [load]);

  const refresh = useCallback(() => load('refresh'), [load]);

  const startReview = useCallback(
    async (id: string) => {
      setActingId(id);
      try {
        await api.post<ApiResponse<BankReviewRow>>(`/api/bank-officer/loans/${id}/review`);
        await load('refresh');
        return { ok: true as const };
      } catch (e) {
        return { ok: false as const, message: e instanceof ApiError ? e.message : 'Could not start review.' };
      } finally {
        setActingId(null);
      }
    },
    [load],
  );

  const decide = useCallback(
    async (id: string, input: BankDecisionInput) => {
      setActingId(id);
      try {
        await api.post<ApiResponse<BankReviewRow>>(`/api/bank-officer/loans/${id}/decision`, input);
        await load('refresh');
        return { ok: true as const };
      } catch (e) {
        return { ok: false as const, message: e instanceof ApiError ? e.message : 'Could not record the decision.' };
      } finally {
        setActingId(null);
      }
    },
    [load],
  );

  return { rows, loading, refreshing, error, actingId, refresh, startReview, decide };
}

// Amounts come back as strings or numbers depending on the driver; normalize.
export const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const farmerName = (row: BankReviewRow): string =>
  row.farmer?.name_en ?? row.farmer?.name_bn ?? row.farmer?.farmer_id ?? 'Farmer';
