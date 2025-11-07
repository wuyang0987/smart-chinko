
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
      title: 'Coin Pusher',
      icon: 'dollarsign.circle.fill',
      route: '/(tabs)/(home)',
    },
    {
      name: '(pachinko)',
      title: 'Pachinko',
      icon: 'circle.circle.fill',
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
        <NativeTabs>
          <NativeTabs.Screen
            name="(home)"
            options={{
              title: 'Coin Pusher',
              tabBarIcon: ({ color }) => <Icon name="dollarsign.circle.fill" color={color} />,
              tabBarLabel: ({ color }) => <Label color={color}>Coin Pusher</Label>,
            }}
          />
          <NativeTabs.Screen
            name="(pachinko)"
            options={{
              title: 'Pachinko',
              tabBarIcon: ({ color }) => <Icon name="circle.circle.fill" color={color} />,
              tabBarLabel: ({ color }) => <Label color={color}>Pachinko</Label>,
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
        <Stack.Screen name="(pachinko)" />
        <Stack.Screen name="profile" />
      </Stack>
      <FloatingTabBar tabs={tabs} />
    </>
  );
}
