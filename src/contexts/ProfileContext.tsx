import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

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

const defaultProfile: FarmerProfile = {
  nameBn: 'মোহাম্মদ রহিম',
  nameEn: 'Mohammad Rahim',
  nid: '1234567890',
  phone: '01711-234567',
  dob: '15 March 1982',
  gender: 'Male',
  totalLand: 35,
  ownLand: 25,
  leasedLand: 10,
  selectedCrops: ['Rice (Boro)', 'Vegetables'],
  location: 'Char Fasson, Bhola',
  farmingIncome: 100000,
  otherSources: ['কৃষি শ্রমিক'],
  otherIncome: 25000,
  familyMembers: 4,
  occupation: 'কৃষি',
  hasLoan: true,
  loanAmount: 60000,
  loanPurpose: 'সেচ ব্যবস্থা',
  loanSource: 'ব্যাংক',
  profilePhoto: null,
  nidPhoto: null,
  landPhoto: null,
  farmerId: 'FAR-2024-001',
  isVerified: true,
  creditScore: 720,
  memberSince: 'January 2024',

  village: 'Char Fasson',
  union: 'Osmanganj',
  upazila: 'Char Fasson',
  district: 'Bhola',
  farmSize: 3.5,
  ownership: 'Own Land',
  primaryCrop: 'Rice (Boro)',
  secondaryCrop: 'Vegetables',
  cropDiversity: 'High',
  experience: 5,
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
