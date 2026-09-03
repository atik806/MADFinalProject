export type FarmerStatus = 'verified' | 'pending' | 'rejected';

export type Farmer = {
  id: string;
  name: string;
  location: string;
  crop: string;
  status: FarmerStatus;
};

export const MOCK_FARMERS: Farmer[] = [
  { id: 'FAR-001', name: 'Abdul Karim', location: 'Char Fasson', crop: 'Boro Rice', status: 'verified' },
  { id: 'FAR-002', name: 'Rafiqul Islam', location: 'Osmanganj', crop: 'Vegetables', status: 'pending' },
  { id: 'FAR-003', name: 'Jahangir Alam', location: 'Khaser Hat', crop: 'Shrimp', status: 'verified' },
  { id: 'FAR-004', name: 'Shahinur Begum', location: 'Dular Hat', crop: 'Jute', status: 'pending' },
  { id: 'FAR-005', name: 'Mizanur Rahman', location: 'Char Kukri', crop: 'Maize', status: 'rejected' },
];

export const FARMER_OPTIONS = ['Abdul Karim', 'Rafiqul Islam', 'Jahangir Alam', 'Shahinur Begum', 'Mizanur Rahman'];

export const FARMER_NAMES: Record<string, string> = {
  'L-2024-001': 'Abdul Karim',
  'L-2024-002': 'Rafiqul Islam',
  'L-2024-003': 'Shahinur Begum',
  'L-2024-004': 'Jahangir Alam',
};
