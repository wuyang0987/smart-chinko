
import React from 'react';
import { Platform } from 'react-native';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';

export default function TabLayout() {
  const tabs: TabBarItem[] = [
    {
      name: '(home)',
      title: 'Game',
      icon: 'gamecontroller.fill',
      route: '/(tabs)/(home)',
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
        <NativeTabs>
          <NativeTabs.Screen
            name="(home)"
            options={{
              title: 'Game',
              tabBarIcon: ({ color }) => <Icon name="gamecontroller.fill" color={color} />,
              tabBarLabel: ({ color }) => <Label color={color}>Game</Label>,
            }}
          />
          <NativeTabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ color }) => <Icon name="person.fill" color={color} />,
              tabBarLabel: ({ color }) => <Label color={color}>Profile</Label>,
            }}
          />
        </NativeTabs>
      </>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(home)" />
        <Stack.Screen name="profile" />
      </Stack>
      <FloatingTabBar tabs={tabs} />
    </>
  );
}
