import { Slot } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { TransactionProvider } from '../contexts/TransactionContext';
import { LoanProvider } from '../contexts/LoanContext';
import { ProfileProvider } from '../contexts/ProfileContext';
import { NotificationProvider } from '../contexts/NotificationContext';

export default function RootLayout() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <TransactionProvider>
          <LoanProvider>
            <ProfileProvider>
              <Slot />
            </ProfileProvider>
          </LoanProvider>
        </TransactionProvider>
      </AuthProvider>
    </NotificationProvider>
  );
}
