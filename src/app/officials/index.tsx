import { Redirect } from 'expo-router';

export default function OfficialsIndex() {
  return <Redirect href={'/officials/login' as any} />;
}
