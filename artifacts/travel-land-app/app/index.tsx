import { Redirect } from 'expo-router';
import { useMobileAuth } from '@/context/AuthContext';

export default function Index() {
  const { isSignedIn } = useMobileAuth();

  return <Redirect href={isSignedIn ? '/(tabs)' : '/login'} />;
}