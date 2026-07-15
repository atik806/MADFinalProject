export type IncomeSource = {
  label: string;
  selected: boolean;
};

export const CROPS = ['ধান', 'পাট', 'গম', 'আলু', 'পেঁয়াজ', 'সবজি', 'চা', 'আম'];

export const REGISTRATION_CROPS = ['ধান', 'পাট', 'গম', 'আলু', 'পেঁয়াজ', 'সবজি', 'চা', 'আম'];

export const INCOME_SOURCES = ['কৃষি শ্রমিক', 'ছোট ব্যবসা', 'চাকরি', 'অন্যান্য'];

export const GENDERS = ['পুরুষ', 'মহিলা', 'অন্যান্য'];

export const loanSources = [
  'ব্যাংক',
  'এনজিও',
  'মাইক্রোফাইন্যান্স',
  'সহযোগী সমিতি',
  'ব্যক্তিগত ঋণ',
  'অন্যান্য',
];

export const otherSources: IncomeSource[] = [
  { label: 'কৃষি শ্রমিক', selected: false },
  { label: 'ছোট ব্যবসা', selected: false },
  { label: 'চাকরি', selected: false },
  { label: 'অন্যান্য', selected: false },
];
