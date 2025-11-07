
import { SafeAreaView } from "react-native-safe-area-context";
import React from "react";
import { View, Text, StyleSheet, ScrollView, Platform } from "react-native";
import { colors } from "@/styles/commonStyles";

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Game Stats</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>High Score:</Text>
            <Text style={styles.statValue}>0</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Coins Collected:</Text>
            <Text style={styles.statValue}>0</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Games Played:</Text>
            <Text style={styles.statValue}>0</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>How to Play</Text>
          <Text style={styles.instructionText}>
            - Tap &quot;DROP COIN&quot; to drop coins into the machine
          </Text>
          <Text style={styles.instructionText}>
            - Watch as the pusher moves back and forth
          </Text>
          <Text style={styles.instructionText}>
            - Coins that fall into the collection zone add to your score
          </Text>
          <Text style={styles.instructionText}>
            - Use the &quot;RESET GAME&quot; button to start over
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>About</Text>
          <Text style={styles.aboutText}>
            Coin Pusher is a classic arcade game where you drop coins and try to push them off the edge to collect them. 
            Time your drops carefully to maximize your score!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: Platform.OS === 'android' ? 100 : 20,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  statLabel: {
    fontSize: 16,
    color: colors.text,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  instructionText: {
    fontSize: 15,
    color: colors.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  aboutText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
});
