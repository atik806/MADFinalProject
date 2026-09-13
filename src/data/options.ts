export type IncomeSource = {
  label: string;
  selected: boolean;
};

export const CROPS = ['Rice', 'Jute', 'Wheat', 'Potato', 'Onion', 'Vegetables', 'Tea', 'Mango'];

export const REGISTRATION_CROPS = ['Rice', 'Jute', 'Wheat', 'Potato', 'Onion', 'Vegetables', 'Tea', 'Mango'];

export const INCOME_SOURCES = ['Agricultural Labor', 'Small Business', 'Job', 'Other'];

export const GENDERS = ['Male', 'Female', 'Other'];

export const loanSources = [
  'Bank',
  'NGO',
  'Microfinance',
  'Cooperative Society',
  'Personal Loan',
  'Other',
];

export const otherSources: IncomeSource[] = [
  { label: 'Agricultural Labor', selected: false },
  { label: 'Small Business', selected: false },
  { label: 'Job', selected: false },
  { label: 'Other', selected: false },
];
