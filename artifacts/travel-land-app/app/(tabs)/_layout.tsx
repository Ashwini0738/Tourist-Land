import React from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { useAuthSecurity } from '@/context/AuthSecurityContext';
import { radii, spacing } from '@/constants/theme';
function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 84 : 78,
          paddingTop: 8,
          paddingBottom: isWeb ? 10 : 8,
        },
        tabBarItemStyle: { flex: 1, minHeight: 58, minWidth: 0 },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
          flexShrink: 1,
          textAlign: 'center',
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Feather name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <Feather name="compass" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, focused }) => (
            <View style={{
               width: 52, height: 52, borderRadius: radii.pill,
               backgroundColor: focused ? colors.primary : colors.card,
               borderWidth: focused ? 0 : 1, borderColor: colors.border,
               alignItems: 'center', justifyContent: 'center',
               marginTop: -8,
               shadowColor: focused ? colors.primary : '#000', shadowOpacity: focused ? 0.24 : 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: focused ? 6 : 0
            }}>
              <Feather name="calendar" size={20} color={focused ? colors.primaryForeground : color} />
            </View>
          ),
          tabBarLabel: 'Bookings',
        }}
      />
      <Tabs.Screen
        name="land"
        options={{
          title: 'Land',
          tabBarIcon: ({ color }) => <Feather name="map" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Feather name="user" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { isSignedIn } = useAuth();
  const { isReady, isUnlocked, biometricsEnabled, deviceAuthSetupComplete } = useAuthSecurity();
  if (!isSignedIn) return <Redirect href="/login" />;
  if (!isReady) return null;
  if (!isUnlocked && !deviceAuthSetupComplete) return <Redirect href="/biometric" />;
  if (!isUnlocked && biometricsEnabled) return <Redirect href="/biometric-login" />;
  return <ClassicTabLayout />;
}
