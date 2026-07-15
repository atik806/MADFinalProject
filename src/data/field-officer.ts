import type { Ionicons } from '@expo/vector-icons';

export type QuickAction = {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  title: string;
};

export type ScheduledTask = {
  time: string;
  title: string;
  location: string;
  type: string;
};

export type VisitStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

export type FieldVisit = {
  id: string;
  farmerName: string;
  location: string;
  date: string;
  purpose: string;
  status: VisitStatus;
  notes: string;
};

export type LoanAppTab = 'all' | 'pending' | 'verified' | 'forwarded';

export type LoanAppTabConfig = {
  key: LoanAppTab;
  label: string;
};

export const QUICK_ACTIONS: QuickAction[] = [
  { icon: 'person-add-outline', iconBg: '#3A9BD5', title: 'New Farmer\nOnboarding' },
  { icon: 'location-outline', iconBg: '#1A8F5C', title: 'Record Visit' },
  { icon: 'document-text-outline', iconBg: '#7C3AED', title: 'Submit\nApplication' },
  { icon: 'cloud-upload-outline', iconBg: '#F59E0B', title: 'Upload\nDocuments' },
];

export const SCHEDULED_TASKS: ScheduledTask[] = [
  { time: '09:00 AM', title: 'Field Visit - Abdul Karim', location: 'Char Fasson', type: 'Visit' },
  { time: '11:30 AM', title: 'Document Verification', location: 'Office', type: 'Paperwork' },
  { time: '02:00 PM', title: 'Follow-up - Rafiqul Islam', location: 'Osmanganj', type: 'Visit' },
  { time: '04:00 PM', title: 'Report Submission', location: 'Office', type: 'Report' },
];

export const UPCOMING_VISITS: FieldVisit[] = [
  {
    id: 'VIS-001',
    farmerName: 'Abdul Karim',
    location: 'Char Fasson',
    date: '05 Jul 2026',
    purpose: 'Boro Rice Inspection',
    status: 'scheduled',
    notes: 'Check irrigation system and crop health. Farmer reported pest issues.',
  },
  {
    id: 'VIS-002',
    farmerName: 'Rafiqul Islam',
    location: 'Osmanganj',
    date: '06 Jul 2026',
    purpose: 'Land Verification',
    status: 'scheduled',
    notes: 'Verify land documents for new loan application. Measure total cultivated area.',
  },
  {
    id: 'VIS-003',
    farmerName: 'Jahangir Alam',
    location: 'Khaser Hat',
    date: '07 Jul 2026',
    purpose: 'Shrimp Farm Assessment',
    status: 'scheduled',
    notes: 'Assess shrimp pond condition and production capacity for loan eligibility.',
  },
];

export const COMPLETED_VISITS: FieldVisit[] = [
  {
    id: 'VIS-004',
    farmerName: 'Shahinur Begum',
    location: 'Dular Hat',
    date: '28 Jun 2026',
    purpose: 'Jute Field Inspection',
    status: 'completed',
    notes: 'Jute crop in good condition. Yield expected to be above average.',
  },
  {
    id: 'VIS-005',
    farmerName: 'Mizanur Rahman',
    location: 'Char Kukri',
    date: '25 Jun 2026',
    purpose: 'Maize Crop Assessment',
    status: 'completed',
    notes: 'Maize ready for harvest. Farmer advised on market prices.',
  },
];

export const LOAN_APP_TABS: LoanAppTabConfig[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending Verification' },
  { key: 'verified', label: 'Verified' },
  { key: 'forwarded', label: 'Forwarded to Bank' },
];
