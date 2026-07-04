import { Stack } from 'expo-router';

export default function OfficialsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="(bank-officer)" />
      <Stack.Screen name="(field-officer)" />
    </Stack>
  );
}
