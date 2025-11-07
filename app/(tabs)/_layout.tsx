
import React from 'react';
import { Platform } from 'react-native';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import CollapsibleMenu, { MenuItem } from '@/components/CollapsibleMenu';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';

export default function TabLayout() {
  const menuItems: MenuItem[] = [
    {
      name: '(pachinko)',
      title: 'Pachinko',
      icon: 'gamecontroller.fill',
      route: '/(tabs)/(pachinko)',
    },
    {
      name: 'profile',
      title: 'Profile',
      icon: 'person.fill',
      route: '/(tabs)/profile',
    },
  ];

  if (Platform.OS === 'ios') {
    return (
      <>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(pachinko)" />
          <Stack.Screen name="profile" />
        </Stack>
        <CollapsibleMenu items={menuItems} />
      </>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(pachinko)" />
        <Stack.Screen name="profile" />
      </Stack>
      <CollapsibleMenu items={menuItems} />
    </>
  );
}
