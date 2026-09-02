import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { api, ApiError } from '../lib/api';
import type { ApiResponse, ProfileRow } from '../lib/api-types';
import { useAuth } from './AuthContext';

export type FarmerProfile = {
  nameBn: string;
  nameEn: string;
  nid: string;
  phone: string;
  dob: string;
  gender: string;
  totalLand: number;
  ownLand: number;
  leasedLand: number;
  selectedCrops: string[];
  location: string;
  farmingIncome: number;
  otherSources: string[];
  otherIncome: number;
  familyMembers: number;
  occupation: string;
  hasLoan: boolean;
  loanAmount: number;
  loanPurpose: string;
  loanSource: string;
  profilePhoto: string | null;
  nidPhoto: string | null;
  landPhoto: string | null;
  farmerId: string;
  isVerified: boolean;
  creditScore: number;
  memberSince: string;

  village: string;
  union: string;
  upazila: string;
  district: string;
  farmSize: number;
  ownership: string;
  primaryCrop: string;
  secondaryCrop: string;
  cropDiversity: string;
  experience: number;
};

// Neutral placeholder shown before the first successful fetch — recognizably
// empty rather than a realistic-looking fake person.
const defaultProfile: FarmerProfile = {
  nameBn: '',
  nameEn: '',
  nid: '',
  phone: '',
  dob: '',
  gender: '',
  totalLand: 0,
  ownLand: 0,
  leasedLand: 0,
  selectedCrops: [],
  location: '',
  farmingIncome: 0,
  otherSources: [],
  otherIncome: 0,
  familyMembers: 0,
  occupation: '',
  hasLoan: false,
  loanAmount: 0,
  loanPurpose: '',
  loanSource: '',
  profilePhoto: null,
  nidPhoto: null,
  landPhoto: null,
  farmerId: '—',
  isVerified: false,
  creditScore: 0,
  memberSince: '',

  village: '',
  union: '',
  upazila: '',
  district: '',
  farmSize: 0,
  ownership: '',
  primaryCrop: '',
  secondaryCrop: '',
  cropDiversity: '',
  experience: 0,
};

// The inverse of the backend's PROFILE_FIELD_MAP: profiles row (snake_case)
// → the FarmerProfile shape the screens already render (camelCase).
const ROW_MAP: Record<string, keyof FarmerProfile> = {
  name_bn: 'nameBn',
  name_en: 'nameEn',
  nid: 'nid',
  phone: 'phone',
  dob: 'dob',
  gender: 'gender',
  total_land: 'totalLand',
  own_land: 'ownLand',
  leased_land: 'leasedLand',
  selected_crops: 'selectedCrops',
  location: 'location',
  village: 'village',
  union_: 'union',
  upazila: 'upazila',
  district: 'district',
  farm_size: 'farmSize',
  ownership: 'ownership',
  primary_crop: 'primaryCrop',
  secondary_crop: 'secondaryCrop',
  crop_diversity: 'cropDiversity',
  experience: 'experience',
  farming_income: 'farmingIncome',
  other_sources: 'otherSources',
  other_income: 'otherIncome',
  family_members: 'familyMembers',
  occupation: 'occupation',
  has_loan: 'hasLoan',
  loan_amount: 'loanAmount',
  loan_purpose: 'loanPurpose',
  loan_source: 'loanSource',
  profile_photo_url: 'profilePhoto',
  nid_photo_url: 'nidPhoto',
  land_photo_url: 'landPhoto',
  farmer_id: 'farmerId',
  is_verified: 'isVerified',
  credit_score: 'creditScore',
  member_since: 'memberSince',
};

const profileFromRow = (row: ProfileRow): FarmerProfile => {
  const out: Record<string, unknown> = { ...defaultProfile };
  for (const [col, key] of Object.entries(ROW_MAP)) {
    const value = (row as Record<string, unknown>)[col];
    if (value !== undefined && value !== null) {
      out[key] = value;
    }
  }
  return out as FarmerProfile;
};

type ProfileContextType = {
  profile: FarmerProfile;
  loading: boolean;
  error: string | null;
  updateProfile: (data: Partial<FarmerProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetProfile: () => void;
};

const ProfileContext = createContext<ProfileContextType | null>(null);

const errorMessage = (err: unknown): string =>
  err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';

// Fields the edit screen may send — the exact set the backend's
// PROFILE_FIELD_MAP accepts. Privileged fields (is_verified, credit_score,
// farmer_id, member_since, role, status) are NEVER included here; the backend
// filters them too, but the client not sending them is defense in depth.
const EDITABLE_KEYS: (keyof FarmerProfile)[] = [
  'nameBn', 'nameEn', 'nid', 'phone', 'dob', 'gender',
  'totalLand', 'ownLand', 'leasedLand', 'selectedCrops', 'location',
  'village', 'union', 'upazila', 'district', 'farmSize', 'ownership',
  'primaryCrop', 'secondaryCrop', 'cropDiversity', 'experience',
  'farmingIncome', 'otherSources', 'otherIncome', 'familyMembers',
  'occupation', 'hasLoan', 'loanAmount', 'loanPurpose', 'loanSource',
];

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<FarmerProfile>(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Tracks which session the cached data belongs to. When the authenticated
  // user changes (login switch or 401-driven logout) the stale profile is
  // dropped instead of leaking into the next session. `user?.id` is
  // normalized to null so the guard converges (see NotificationContext for
  // the full rationale).
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const currentSessionUserId = user?.id ?? null;
  if (currentSessionUserId !== sessionUserId) {
    setSessionUserId(currentSessionUserId);
    setProfile(defaultProfile);
    setError(null);
    setLoading(true);
  }

  const refreshProfile = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<ApiResponse<ProfileRow> & { profile?: ProfileRow }>('/api/farmer/me');
      // The profile endpoints return { success, message, data }; the legacy
      // auth /me returns { data, profile } — both are accepted.
      const row = res?.data?.id ? res.data : res?.profile ?? res?.data;
      if (row?.id) {
        setProfile(profileFromRow(row));
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (data: Partial<FarmerProfile>) => {
    // Local-first so the edit screen feels instant; rolled back on failure.
    const snapshot = profile;
    setProfile((prev) => ({ ...prev, ...data }));
    try {
      const body: Record<string, unknown> = {};
      for (const key of EDITABLE_KEYS) {
        if (key in data) {
          body[key] = (data as Record<string, unknown>)[key];
        }
      }
      const res = await api.put<ApiResponse<ProfileRow>>('/api/farmer/me', body);
      if (res?.data?.id) {
        setProfile(profileFromRow(res.data));
      }
    } catch (err) {
      setProfile(snapshot);
      throw err instanceof ApiError ? err : new Error(errorMessage(err));
    }
  }, [profile]);

  const resetProfile = useCallback(() => {
    setProfile(defaultProfile);
    setLoading(true);
    setError(null);
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, loading, error, updateProfile, refreshProfile, resetProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
