
import React from 'react';
import { StyleSheet, View } from 'react-native';
import PachinkoGame from '@/components/PachinkoGame';
import { colors } from '@/styles/commonStyles';

export default function PachinkoScreen() {
  return (
    <View style={styles.container}>
      <PachinkoGame />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
