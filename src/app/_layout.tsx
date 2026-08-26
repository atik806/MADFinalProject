import { Slot, DefaultTheme, ThemeProvider } from 'expo-router';
import { ActivityIndicator, useColorScheme, View } from 'react-native';

import { ThemeProvider as AppThemeProvider } from '../contexts/ThemeContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { TransactionProvider } from '../contexts/TransactionContext';
import { LoanProvider } from '../contexts/LoanContext';
import { ProfileProvider } from '../contexts/ProfileContext';
import { NotificationProvider } from '../contexts/NotificationContext';

// Holds the app on a splash until the saved session has been restored/validated,
// so we never briefly render the landing page for an already-logged-in user.
function AuthGate() {
  const { isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#006847' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AppThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <NotificationProvider>
            <TransactionProvider>
              <LoanProvider>
                <ProfileProvider>
                  <ThemeProvider value={colorScheme === 'dark' ? DefaultTheme : DefaultTheme}>
                    <AuthGate />
                  </ThemeProvider>
                </ProfileProvider>
              </LoanProvider>
            </TransactionProvider>
          </NotificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </AppThemeProvider>
  );
}
