
import React from "react";
import { Stack } from "expo-router";
import { StyleSheet, View, Platform } from "react-native";
import CoinPusher from "@/components/CoinPusher";
import { colors } from "@/styles/commonStyles";

export default function HomeScreen() {
  return (
    <>
      {Platform.OS === 'ios' && (
        <Stack.Screen
          options={{
            title: "Coin Pusher Game",
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
        <CoinPusher />
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
