
import React from "react";
import { Stack } from "expo-router";
import { StyleSheet, View, Platform } from "react-native";
import CoinPusher3D from "@/components/CoinPusher3D";
import { colors } from "@/styles/commonStyles";

export default function HomeScreen() {
  return (
    <>
      {Platform.OS === 'ios' && (
        <Stack.Screen
          options={{
            title: "3D Coin Pusher",
            headerStyle: {
              backgroundColor: colors.primary,
            },
            headerTintColor: colors.card,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 20,
            },
          }}
        />
      )}
      <View style={styles.container}>
        <CoinPusher3D />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
