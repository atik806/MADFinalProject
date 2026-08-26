import { api } from '@/config/api';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

const isFarmerRole = (role?: string) =>
  String(role ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-') === 'farmer';

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

const emptyProfile: FarmerProfile = {
  nameBn: '', nameEn: '', nid: '', phone: '', dob: '', gender: '',
  totalLand: 0, ownLand: 0, leasedLand: 0, selectedCrops: [], location: '',
  farmingIncome: 0, otherSources: [], otherIncome: 0, familyMembers: 0, occupation: '',
  hasLoan: false, loanAmount: 0, loanPurpose: '', loanSource: '',
  profilePhoto: null, nidPhoto: null, landPhoto: null,
  farmerId: '', isVerified: false, creditScore: 0, memberSince: '',
  village: '', union: '', upazila: '', district: '', farmSize: 0, ownership: '',
  primaryCrop: '', secondaryCrop: '', cropDiversity: '', experience: 0,
};

const mapProfile = (row: any): FarmerProfile => ({
  nameBn: row?.name_bn ?? '',
  nameEn: row?.name_en ?? '',
  nid: row?.nid ?? '',
  phone: row?.phone ?? '',
  dob: row?.dob ?? '',
  gender: row?.gender ?? '',
  totalLand: Number(row?.total_land) || 0,
  ownLand: Number(row?.own_land) || 0,
  leasedLand: Number(row?.leased_land) || 0,
  selectedCrops: row?.selected_crops ?? [],
  location: row?.location ?? '',
  farmingIncome: Number(row?.farming_income) || 0,
  otherSources: row?.other_sources ?? [],
  otherIncome: Number(row?.other_income) || 0,
  familyMembers: Number(row?.family_members) || 0,
  occupation: row?.occupation ?? '',
  hasLoan: Boolean(row?.has_loan),
  loanAmount: Number(row?.loan_amount) || 0,
  loanPurpose: row?.loan_purpose ?? '',
  loanSource: row?.loan_source ?? '',
  profilePhoto: row?.profile_photo_url ?? null,
  nidPhoto: row?.nid_photo_url ?? null,
  landPhoto: row?.land_photo_url ?? null,
  farmerId: row?.farmer_id ?? '',
  isVerified: Boolean(row?.is_verified),
  creditScore: Number(row?.credit_score) || 0,
  memberSince: row?.member_since ?? '',
  village: row?.village ?? '',
  union: row?.union_ ?? '',
  upazila: row?.upazila ?? '',
  district: row?.district ?? '',
  farmSize: Number(row?.farm_size) || 0,
  ownership: row?.ownership ?? '',
  primaryCrop: row?.primary_crop ?? '',
  secondaryCrop: row?.secondary_crop ?? '',
  cropDiversity: row?.crop_diversity ?? '',
  experience: Number(row?.experience) || 0,
});

type ProfileContextType = {
  profile: FarmerProfile;
  loading: boolean;
  updateProfile: (data: Partial<FarmerProfile>) => Promise<void>;
  refresh: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextType | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<FarmerProfile>(emptyProfile);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isFarmerRole(user?.role)) return;
    try {
      setLoading(true);
      const row = await api.get<any>('/api/farmer/profile');
      setProfile(mapProfile(row));
    } catch (error) {
      // profile may not exist yet (e.g., right after registration)
      console.warn('Profile refresh failed:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateProfile = useCallback(async (data: Partial<FarmerProfile>) => {
    const res = await api.put<any>('/api/farmer/profile', data);
    const row = res?.data ?? res;
    setProfile(mapProfile(row));
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, loading, updateProfile, refresh }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
