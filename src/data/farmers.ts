export type FarmerStatus = 'verified' | 'pending' | 'rejected';

export type Farmer = {
  id: string;
  name: string;
  location: string;
  crop: string;
  status: FarmerStatus;
};

export type AdminUser = {
  id: string;
  name: string;
  role: 'Farmer' | 'Field Officer' | 'Bank Officer';
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

export const initialUsers: AdminUser[] = [
  { id: 'U001', name: 'Mohammad Rahim', role: 'Farmer', location: 'Bhola', crop: 'Rice', status: 'verified' },
  { id: 'U002', name: 'Farida Begum', role: 'Farmer', location: 'Noakhali', crop: 'Shrimp', status: 'pending' },
  { id: 'U003', name: 'Karim Ali', role: 'Farmer', location: 'Sirajganj', crop: 'Jute', status: 'rejected' },
  { id: 'U004', name: 'Nasima Khatun', role: 'Farmer', location: 'Faridpur', crop: 'Vegetables', status: 'verified' },
  { id: 'U005', name: 'Jamal Uddin', role: 'Farmer', location: 'Sylhet', crop: 'Tea', status: 'pending' },
  { id: 'U006', name: 'Shamim Reza', role: 'Field Officer', location: 'Dhaka', crop: 'Field Operations', status: 'verified' },
  { id: 'U007', name: 'Ayesha Khatun', role: 'Bank Officer', location: 'Chittagong', crop: 'Credit & Loans', status: 'verified' },
  { id: 'U008', name: 'Rafiq Hasan', role: 'Field Officer', location: 'Rajshahi', crop: 'Field Operations', status: 'pending' },
  { id: 'U009', name: 'Sultana Khan', role: 'Bank Officer', location: 'Mymensingh', crop: 'Credit & Loans', status: 'rejected' },
  { id: 'U010', name: 'Delwar Hossain', role: 'Farmer', location: 'Khulna', crop: 'Jute', status: 'verified' },
  { id: 'U011', name: 'Shahida Parvin', role: 'Farmer', location: 'Bogra', crop: 'Potato', status: 'verified' },
  { id: 'U012', name: 'Abdur Rahman', role: 'Field Officer', location: 'Barisal', crop: 'Field Operations', status: 'rejected' },
];
