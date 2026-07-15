import type { User } from '@/contexts/AuthContext';

export type DemoUser = {
  identifier: string;
  password: string;
  user: User;
};

export const DEMO_USERS: DemoUser[] = [
  {
    identifier: '01302228993',
    password: '123456',
    user: { id: 'f1', name: 'Mohammad Rahim', phone: '01302228993', role: 'farmer' },
  },
  {
    identifier: 'admin@gmail.com',
    password: '123456',
    user: { id: '1', name: 'System Administrator', email: 'admin@gmail.com', role: 'admin' },
  },
  {
    identifier: 'bank@gmail.com',
    password: '123456',
    user: { id: '2', name: 'Ayesha Khatun', email: 'bank@gmail.com', role: 'bank-officer' },
  },
  {
    identifier: 'field@gmail.com',
    password: '123456',
    user: { id: '3', name: 'Shamim Reza', email: 'field@gmail.com', role: 'field-officer' },
  },
];
