import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { defaultProfile } from '@/data/profile';

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



type ProfileContextType = {
  profile: FarmerProfile;
  updateProfile: (data: Partial<FarmerProfile>) => void;
  resetProfile: () => void;
};

const ProfileContext = createContext<ProfileContextType | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<FarmerProfile>(defaultProfile);

  const updateProfile = useCallback((data: Partial<FarmerProfile>) => {
    setProfile((prev) => ({ ...prev, ...data }));
  }, []);

  const resetProfile = useCallback(() => {
    setProfile(defaultProfile);
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, resetProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
