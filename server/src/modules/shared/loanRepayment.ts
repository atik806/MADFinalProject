// computeRepaymentUpdate: pure repayment math shared by the farmer and
// field-officer loan modules. Each call pays exactly one EMI — there is no
// partial-payment / custom-amount input in this app, so the math only ever
// advances installments_paid by 1 and never needs to reconcile arbitrary
// amounts against a running balance.
export interface RepayableLoan {
  emi: number | string | null | undefined;
  duration: string | null | undefined;
  installments_paid: number | string | null | undefined;
  installments_total: number | string | null | undefined;
  next_payment_date: string | null | undefined;
}

export interface RepaymentUpdate {
  amount: number;
  installments_paid: number;
  installments_total: number;
  progress: number;
  next_payment_date: string | null;
  next_payment_amount: number;
  completed: boolean;
}

export const computeRepaymentUpdate = (loan: RepayableLoan): RepaymentUpdate => {
  const emi = Number(loan.emi) || 0;
  if (emi <= 0) {
    throw new Error('This loan has no EMI amount configured and cannot be repaid');
  }

  const parsedTotal = Number(loan.installments_total);
  const installmentsTotal =
    Number.isFinite(parsedTotal) && parsedTotal > 0
      ? parsedTotal
      : Math.max(parseInt(String(loan.duration ?? ''), 10) || 0, 1);

  const installmentsPaid = Math.max(Number(loan.installments_paid) || 0, 0);
  if (installmentsPaid >= installmentsTotal) {
    throw new Error('This loan has already been fully repaid');
  }

  const nextPaid = installmentsPaid + 1;
  const completed = nextPaid >= installmentsTotal;
  const progress = Math.min(100, Math.round((nextPaid / installmentsTotal) * 100));

  const baseDate = loan.next_payment_date ? new Date(loan.next_payment_date) : new Date();
  const nextDate = new Date(Number.isNaN(baseDate.getTime()) ? Date.now() : baseDate.getTime());
  nextDate.setMonth(nextDate.getMonth() + 1);

  return {
    amount: emi,
    installments_paid: nextPaid,
    installments_total: installmentsTotal,
    progress,
    next_payment_date: completed ? null : nextDate.toISOString().slice(0, 10),
    next_payment_amount: completed ? 0 : emi,
    completed,
  };
};
