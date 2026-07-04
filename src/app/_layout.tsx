import { Slot, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { LanguageProvider } from '../contexts/LanguageContext';
import { AuthProvider } from '../contexts/AuthContext';
import { TransactionProvider } from '../contexts/TransactionContext';
import { LoanProvider } from '../contexts/LoanContext';
import { ProfileProvider } from '../contexts/ProfileContext';
import { NotificationProvider } from '../contexts/NotificationContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <LanguageProvider>
      <NotificationProvider>
        <AuthProvider>
          <TransactionProvider>
            <LoanProvider>
              <ProfileProvider>
                <ThemeProvider value={colorScheme === 'dark' ? DefaultTheme : DefaultTheme}>
                  <Slot />
                </ThemeProvider>
              </ProfileProvider>
            </LoanProvider>
          </TransactionProvider>
        </AuthProvider>
      </NotificationProvider>
    </LanguageProvider>
  );
}
