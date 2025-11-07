
import React from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';

export default function TabLayout() {
  if (Platform.OS === 'ios') {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(pachinko)" />
        <Stack.Screen name="profile" />
      </Stack>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(pachinko)" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
