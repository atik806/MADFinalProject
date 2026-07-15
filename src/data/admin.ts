import type { Ionicons } from '@expo/vector-icons';

export type LogStatus = 'success' | 'pending' | 'failed';
export type LogModule = 'User' | 'Loan' | 'System';

export type LogEntry = {
  id: string;
  user: string;
  action: string;
  module: LogModule;
  time: string;
  status: LogStatus;
};

export type Report = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  accent: string;
};

export type StatItem = {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  color: string;
};

export type HeroStat = {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  value: string;
  label: string;
  trend?: string;
  trendLabel?: string;
  sub?: string;
};

export type RegistrationDatum = {
  label: string;
  value: number;
};

export type LoanDatum = {
  label: string;
  values: { key: 'approved' | 'pending'; value: number; color: string }[];
};

export type AdminAction = {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  title: string;
  route: string;
};

export const heroStats: HeroStat[] = [
  { icon: 'leaf', iconBg: '#A78BFA', value: '510', label: 'Total Farmers', trend: '+48', trendLabel: 'this month' },
  { icon: 'wallet', iconBg: '#60A5FA', value: '234', label: 'Total Loans', sub: '৳4.2 Crore total' },
  { icon: 'checkmark-circle', iconBg: '#34D399', value: '72%', label: 'Approval Rate', trend: '+5%', trendLabel: 'vs last month' },
  { icon: 'people', iconBg: '#F472B6', value: '89', label: 'Active Users', sub: 'Field + Bank Officers' },
];

export const registrationData: RegistrationDatum[] = [
  { label: 'Jan', value: 120 },
  { label: 'Feb', value: 250 },
  { label: 'Mar', value: 380 },
  { label: 'Apr', value: 520 },
  { label: 'May', value: 480 },
  { label: 'Jun', value: 560 },
];

export const loanData: LoanDatum[] = [
  { label: 'Apr', values: [{ key: 'approved', value: 45, color: '#22C55E' }, { key: 'pending', value: 20, color: '#F59E0B' }] },
  { label: 'May', values: [{ key: 'approved', value: 62, color: '#22C55E' }, { key: 'pending', value: 15, color: '#F59E0B' }] },
  { label: 'Jun', values: [{ key: 'approved', value: 78, color: '#22C55E' }, { key: 'pending', value: 12, color: '#F59E0B' }] },
];

export const adminActions: AdminAction[] = [
  { icon: 'people', iconBg: '#3A9BD5', title: 'User Management', route: '/officials/(admin)/users' },
  { icon: 'document-text', iconBg: '#22C55E', title: 'Reports', route: '/officials/(admin)/reports' },
  { icon: 'settings', iconBg: '#8B5CF6', title: 'System Config', route: '/officials/(admin)/settings' },
  { icon: 'document-lock', iconBg: '#F59E0B', title: 'Audit Logs', route: '/officials/(admin)/audit-logs' },
];

export const MOCK_LOGS: LogEntry[] = [
  { id: 'L001', user: 'Mohammad Rahim', action: 'Created new farmer profile', module: 'User', time: '2 mins ago', status: 'success' },
  { id: 'L002', user: 'Ayesha Khatun', action: 'Approved loan application L-2024-0089', module: 'Loan', time: '15 mins ago', status: 'success' },
  { id: 'L003', user: 'Shamim Reza', action: 'Updated system configuration', module: 'System', time: '1 hour ago', status: 'pending' },
  { id: 'L004', user: 'Karim Ali', action: 'Uploaded document verification', module: 'User', time: '2 hours ago', status: 'success' },
  { id: 'L005', user: 'Nasima Khatun', action: 'Loan disbursement failed', module: 'Loan', time: '3 hours ago', status: 'failed' },
  { id: 'L006', user: 'Rafiq Hasan', action: 'Field visit report submitted', module: 'System', time: '5 hours ago', status: 'success' },
  { id: 'L007', user: 'Jamal Uddin', action: 'Password change request', module: 'User', time: '1 day ago', status: 'pending' },
  { id: 'L008', user: 'System Admin', action: 'Database backup completed', module: 'System', time: '1 day ago', status: 'success' },
  { id: 'L009', user: 'Farida Begum', action: 'Applied for seasonal loan', module: 'Loan', time: '2 days ago', status: 'pending' },
  { id: 'L010', user: 'Delwar Hossain', action: 'Profile deactivated', module: 'User', time: '3 days ago', status: 'failed' },
];

export const MODULE_FILTERS = ['All', 'User', 'Loan', 'System'] as const;

export const MODULE_COLORS: Record<LogModule, string> = {
  User: '#3B82F6',
  Loan: '#22C55E',
  System: '#A78BFA',
};

export const STATUS_CONFIG: Record<LogStatus, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  success: { color: '#22C55E', bg: '#22C55E20', icon: 'checkmark-circle', label: 'Success' },
  pending: { color: '#F59E0B', bg: '#F59E0B20', icon: 'time', label: 'Pending' },
  failed: { color: '#EF4444', bg: '#EF444420', icon: 'close-circle', label: 'Failed' },
};

export const AVATAR_COLORS = ['#047857', '#1D4ED8', '#7C3AED', '#B45309', '#BE185D', '#0D9488', '#4F46E5', '#C026D3'];

export const ADMIN_USER_TABS = ['Farmers', 'Field Officers', 'Bank Officers'] as const;

export const ROLES: ('Farmer' | 'Field Officer' | 'Bank Officer')[] = ['Farmer', 'Field Officer', 'Bank Officer'];

export const REPORTS: Report[] = [
  { icon: 'people', title: 'Farmer Report', description: 'All registered farmers, profiles, and credit scores', accent: '#1A8F5C' },
  { icon: 'cash', title: 'Loan Report', description: 'Application stats, approvals, rejections, disbursements', accent: '#3A9BD5' },
  { icon: 'location', title: 'Regional Report', description: 'District-wise farmer and loan distribution', accent: '#8B5CF6' },
  { icon: 'analytics', title: 'Credit Score Report', description: 'Score distribution and risk assessment summary', accent: '#F59E0B' },
];

export const STATS: StatItem[] = [
  { icon: 'leaf', value: '510', label: 'Total Farmers', color: '#22C55E' },
  { icon: 'wallet', value: '234', label: 'Total Loans', color: '#3B82F6' },
  { icon: 'checkmark-circle', value: '72%', label: 'Approval Rate', color: '#A78BFA' },
  { icon: 'people', value: '89', label: 'Active Users', color: '#F472B6' },
];
