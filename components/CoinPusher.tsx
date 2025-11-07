
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const COIN_SIZE = 40;
const PUSHER_HEIGHT = 60;
const PUSHER_WIDTH = SCREEN_WIDTH * 0.8;
const DROP_ZONE_HEIGHT = 150;
const PLAY_AREA_HEIGHT = SCREEN_HEIGHT - DROP_ZONE_HEIGHT - 200;

interface Coin {
  id: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  collected: boolean;
}

export default function CoinPusher() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [score, setScore] = useState(0);
  const [coinCount, setCoinCount] = useState(10);
  const pusherPosition = useRef(new Animated.Value(0)).current;
  const [isPushing, setIsPushing] = useState(false);

  // Pusher animation
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pusherPosition, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pusherPosition, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  // Physics simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setCoins((prevCoins) => {
        const updatedCoins = prevCoins.map((coin) => {
          if (coin.collected) return coin;

          let newY = coin.y + coin.velocityY;
          let newX = coin.x + coin.velocityX;
          let newVelocityY = coin.velocityY + 0.5; // Gravity
          let newVelocityX = coin.velocityX * 0.98; // Friction
          let newRotation = coin.rotation + 5;

          // Bounce off walls
          if (newX < COIN_SIZE / 2) {
            newX = COIN_SIZE / 2;
            newVelocityX = -newVelocityX * 0.7;
          }
          if (newX > SCREEN_WIDTH - COIN_SIZE / 2) {
            newX = SCREEN_WIDTH - COIN_SIZE / 2;
            newVelocityX = -newVelocityX * 0.7;
          }

          // Check if coin reached the pusher level
          const pusherY = DROP_ZONE_HEIGHT + PLAY_AREA_HEIGHT - PUSHER_HEIGHT;
          if (newY >= pusherY && newY < pusherY + PUSHER_HEIGHT) {
            // Coin is at pusher level - push it forward
            if (isPushing) {
              newVelocityY = 2;
              newVelocityX += (Math.random() - 0.5) * 2;
            } else {
              newY = pusherY;
              newVelocityY = 0;
            }
          }

          // Check if coin fell off the edge (collected)
          if (newY > SCREEN_HEIGHT - 100) {
            return { ...coin, collected: true };
          }

          // Stop at bottom if not collected
          if (newY > SCREEN_HEIGHT - 150) {
            newY = SCREEN_HEIGHT - 150;
            newVelocityY = 0;
          }

          return {
            ...coin,
            x: newX,
            y: newY,
            velocityX: newVelocityX,
            velocityY: newVelocityY,
            rotation: newRotation,
          };
        });

        // Count collected coins
        const newlyCollected = updatedCoins.filter(
          (coin, index) => coin.collected && !prevCoins[index].collected
        );
        if (newlyCollected.length > 0) {
          setScore((prev) => prev + newlyCollected.length);
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }

        // Remove collected coins after a delay
        return updatedCoins.filter((coin) => !coin.collected);
      });
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [isPushing]);

  // Pusher push effect
  useEffect(() => {
    const interval = setInterval(() => {
      setIsPushing((prev) => !prev);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const dropCoin = () => {
    if (coinCount <= 0) {
      console.log('No coins left!');
      return;
    }

    const newCoin: Coin = {
      id: Date.now().toString() + Math.random(),
      x: SCREEN_WIDTH / 2 + (Math.random() - 0.5) * 100,
      y: DROP_ZONE_HEIGHT,
      velocityX: (Math.random() - 0.5) * 3,
      velocityY: 2,
      rotation: 0,
      collected: false,
    };

    setCoins((prev) => [...prev, newCoin]);
    setCoinCount((prev) => prev - 1);

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const resetGame = () => {
    setCoins([]);
    setScore(0);
    setCoinCount(10);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const pusherTranslateY = pusherPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 50],
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>
        <View style={styles.coinCountContainer}>
          <Text style={styles.coinCountLabel}>Coins Left</Text>
          <Text style={styles.coinCountValue}>{coinCount}</Text>
        </View>
      </View>

      {/* Drop Zone */}
      <View style={styles.dropZone}>
        <Pressable
          style={styles.dropButton}
          onPress={dropCoin}
          disabled={coinCount <= 0}
        >
          <Text style={styles.dropButtonText}>
            {coinCount > 0 ? 'DROP COIN' : 'NO COINS'}
          </Text>
        </Pressable>
      </View>

      {/* Play Area */}
      <View style={styles.playArea}>
        {/* Coins */}
        {coins.map((coin) => (
          <View
            key={coin.id}
            style={[
              styles.coin,
              {
                left: coin.x - COIN_SIZE / 2,
                top: coin.y - DROP_ZONE_HEIGHT - COIN_SIZE / 2,
                transform: [{ rotate: `${coin.rotation}deg` }],
              },
            ]}
          >
            <Text style={styles.coinText}>🪙</Text>
          </View>
        ))}

        {/* Pusher */}
        <Animated.View
          style={[
            styles.pusher,
            {
              transform: [{ translateY: pusherTranslateY }],
            },
          ]}
        >
          <View style={styles.pusherBar} />
        </Animated.View>
      </View>

      {/* Collection Area */}
      <View style={styles.collectionArea}>
        <Text style={styles.collectionText}>Collection Zone</Text>
      </View>

      {/* Reset Button */}
      <View style={styles.footer}>
        <Pressable style={styles.resetButton} onPress={resetGame}>
          <Text style={styles.resetButtonText}>RESET GAME</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    backgroundColor: colors.card,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 32,
    color: colors.primary,
    fontWeight: 'bold',
  },
  coinCountContainer: {
    alignItems: 'center',
  },
  coinCountLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  coinCountValue: {
    fontSize: 32,
    color: colors.secondary,
    fontWeight: 'bold',
  },
  dropZone: {
    height: DROP_ZONE_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderBottomWidth: 3,
    borderBottomColor: colors.accent,
  },
  dropButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 15,
    boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.2)',
    elevation: 5,
  },
  dropButtonText: {
    color: colors.card,
    fontSize: 20,
    fontWeight: 'bold',
  },
  playArea: {
    height: PLAY_AREA_HEIGHT,
    backgroundColor: colors.background,
    position: 'relative',
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: colors.accent,
  },
  coin: {
    position: 'absolute',
    width: COIN_SIZE,
    height: COIN_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinText: {
    fontSize: 36,
  },
  pusher: {
    position: 'absolute',
    bottom: 0,
    left: (SCREEN_WIDTH - PUSHER_WIDTH) / 2,
    width: PUSHER_WIDTH,
    height: PUSHER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pusherBar: {
    width: '100%',
    height: '80%',
    backgroundColor: colors.secondary,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: colors.primary,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)',
    elevation: 4,
  },
  collectionArea: {
    height: 80,
    backgroundColor: colors.highlight,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 3,
    borderTopColor: colors.primary,
  },
  collectionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  footer: {
    padding: 15,
    backgroundColor: colors.card,
    borderTopWidth: 2,
    borderTopColor: colors.accent,
  },
  resetButton: {
    backgroundColor: colors.accent,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  resetButtonText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
