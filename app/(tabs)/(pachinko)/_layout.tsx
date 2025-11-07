
import { Stack } from 'expo-router';
import React from 'react';
import { colors } from '@/styles/commonStyles';
import { Platform } from 'react-native';

export default function PachinkoLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: Platform.OS === 'ios',
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.card,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Pachinko Game',
        }}
      />
    </Stack>
  );
}
