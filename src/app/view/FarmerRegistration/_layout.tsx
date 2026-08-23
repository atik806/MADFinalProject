import React from 'react';
import { Stack } from 'expo-router';
import { RegistrationProvider } from '../../../contexts/RegistrationContext';

export default function FarmerRegistrationLayout() {
  return (
    <RegistrationProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </RegistrationProvider>
  );
}
