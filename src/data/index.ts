export { DEMO_USERS } from './auth';
export type { DemoUser } from './auth';

export { MOCK_FARMERS, FARMER_OPTIONS, FARMER_NAMES } from './farmers';
export type { Farmer, FarmerStatus } from './farmers';

export { QUICK_ACTIONS, SCHEDULED_TASKS, UPCOMING_VISITS, COMPLETED_VISITS, LOAN_APP_TABS } from './field-officer';
export type { QuickAction, ScheduledTask, FieldVisit, VisitStatus, LoanAppTab, LoanAppTabConfig } from './field-officer';

export { amountPresets, purposes, durationPresets, statusConfig, labelMap, statusColors, LOAN_MANAGEMENT_FILTERS } from './loans';
export type { FilterTab } from './loans';

export { categories } from './transactions';

export { CROPS, REGISTRATION_CROPS, INCOME_SOURCES, GENDERS, loanSources, otherSources } from './options';
export type { IncomeSource } from './options';

export { BANK_OFFICER_SETTINGS, FIELD_OFFICER_SETTINGS, FARMER_SETTINGS } from './settings';
export type { SettingItem, SettingSection } from './settings';

export { USER_CARD_AVATAR_COLORS, getVisitStatusConfig, getLoanStatusInfo } from './config';
