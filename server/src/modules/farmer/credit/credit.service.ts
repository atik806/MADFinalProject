import { supabase } from '../../../config/supabase';

// Farmer credit profile — a strictly READ-ONLY view of the farmer's own
// credit-relevant information. Everything here is either:
//   - farmer-provided (declared income, land, farming experience),
//   - verified (is_verified, credit_score, verification history written by a
//     field officer), or
//   - system-derived (aggregated loan statistics).
// There is intentionally NO write path: farmers can never change verified or
// system-calculated credit data through this module.

export const getCreditProfile = async (farmerId: string) => {
  // 1. Farmer profile row — verified flags + declared financial fields.
  const profileResult = await supabase
    .from('profiles')
    .select('id, farmer_id, name_en, name_bn, is_verified, credit_score, member_since, total_land, own_land, leased_land, farm_size, experience, primary_crop, farming_income, other_income, other_sources, has_loan, loan_amount')
    .eq('id', farmerId)
    .maybeSingle() as { data: Record<string, any> | null; error: { message: string } | null };
  const profile = profileResult.data;
  const profileError = profileResult.error;

  if (profileError) {
    throw new Error(profileError.message);
  }
  if (!profile) {
    throw new Error('Farmer profile not found');
  }

  // 2. Verification history (written by field officers, read-only for farmers).
  const { data: verifications, error: verificationError } = await supabase
    .from('farmer_verifications')
    .select('id, status, verification_type, verified_at, notes, created_at')
    .eq('farmer_id', farmerId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (verificationError) {
    throw new Error(verificationError.message);
  }

  // 3. Loan statistics (system-derived from the farmer's own applications).
  const { data: loans, error: loansError } = await supabase
    .from('loan_applications')
    .select('id, status, amount, verification_status, created_at')
    .eq('farmer_id', farmerId)
    .order('created_at', { ascending: false });

  if (loansError) {
    throw new Error(loansError.message);
  }

  const allLoans = loans ?? [];
  const approvedLoans = allLoans.filter((loan: any) => loan.status === 'approved' || loan.status === 'active' || loan.status === 'completed');

  return {
    farmer: {
      id: profile.id,
      farmerId: profile.farmer_id,
      nameEn: profile.name_en,
      nameBn: profile.name_bn,
      memberSince: profile.member_since,
    },
    // Verified information — written by field officers / the system only.
    verified: {
      isVerified: profile.is_verified ?? false,
      creditScore: profile.credit_score ?? 0,
      lastVerification: (verifications ?? [])[0] ?? null,
      verificationHistory: verifications ?? [],
    },
    // Farmer-provided information (editable via PUT /api/farmer/me).
    declared: {
      totalLand: profile.total_land ?? 0,
      ownLand: profile.own_land ?? 0,
      leasedLand: profile.leased_land ?? 0,
      farmSize: profile.farm_size ?? 0,
      experience: profile.experience ?? 0,
      primaryCrop: profile.primary_crop ?? null,
      farmingIncome: profile.farming_income ?? 0,
      otherIncome: profile.other_income ?? 0,
      otherSources: profile.other_sources ?? [],
      hasExistingLoan: profile.has_loan ?? false,
      existingLoanAmount: profile.loan_amount ?? 0,
    },
    // System-calculated aggregates from the farmer's own applications.
    loanSummary: {
      totalApplications: allLoans.length,
      pending: allLoans.filter((loan: any) => loan.status === 'pending' || loan.status === 'draft').length,
      approved: approvedLoans.length,
      rejected: allLoans.filter((loan: any) => loan.status === 'rejected').length,
      active: allLoans.filter((loan: any) => loan.status === 'active' || loan.status === 'completed').length,
    },
  };
};
