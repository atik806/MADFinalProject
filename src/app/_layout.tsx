import { Slot } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { TransactionProvider } from '../contexts/TransactionContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <TransactionProvider>
        <Slot />
      </TransactionProvider>
    </AuthProvider>
  );
}
