import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type RegistrationData = {
  nameBn?: string;
  nameEn?: string;
  nid?: string;
  phone?: string;
  password?: string;
  dob?: string;
  gender?: string;
  totalLand?: string;
  ownLand?: string;
  leasedLand?: string;
  selectedCrops?: string[];
  location?: string;
  farmingIncome?: string;
  otherIncome?: string;
  familyMembers?: string;
  occupation?: string;
  otherSources?: string[];
  hasLoan?: boolean;
  loanAmount?: string;
  loanPurpose?: string;
  loanSource?: string;
  profilePhotoUrl?: string;
  nidPhotoUrl?: string;
  landPhotoUrl?: string;
};

type RegistrationContextType = {
  data: RegistrationData;
  patch: (fields: RegistrationData) => void;
  reset: () => void;
};

const RegistrationContext = createContext<RegistrationContextType | null>(null);

export function RegistrationProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<RegistrationData>({});

  const patch = useCallback((fields: RegistrationData) => {
    setData((prev) => ({ ...prev, ...fields }));
  }, []);

  const reset = useCallback(() => setData({}), []);

  return (
    <RegistrationContext.Provider value={{ data, patch, reset }}>
      {children}
    </RegistrationContext.Provider>
  );
}

export function useRegistration() {
  const ctx = useContext(RegistrationContext);
  if (!ctx) throw new Error('useRegistration must be used within RegistrationProvider');
  return ctx;
}
