
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const COIN_SIZE = 35;
const PUSHER_HEIGHT = 50;
const PUSHER_WIDTH = SCREEN_WIDTH * 0.85;
const DROP_ZONE_HEIGHT = 140;
const PLAY_AREA_HEIGHT = SCREEN_HEIGHT - DROP_ZONE_HEIGHT - 250;
const GRAVITY = 0.6;
const FRICTION = 0.985;
const BOUNCE_DAMPING = 0.6;
const PUSHER_SPEED = 2500;
const COLLECTION_ZONE_Y = PLAY_AREA_HEIGHT + 20;

interface Coin {
  id: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  collected: boolean;
  onPusher: boolean;
}

export default function CoinPusher() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [score, setScore] = useState(0);
  const [coinCount, setCoinCount] = useState(15);
  const [highScore, setHighScore] = useState(0);
  const pusherProgress = useSharedValue(0);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  // Pusher animation - moves back and forth
  useEffect(() => {
    pusherProgress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: PUSHER_SPEED, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: PUSHER_SPEED, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [pusherProgress]);

  const pusherAnimatedStyle = useAnimatedStyle(() => {
    const translateY = pusherProgress.value * 60;
    return {
      transform: [{ translateY }],
    };
  });

  // Main physics simulation loop
  useEffect(() => {
    gameLoopRef.current = setInterval(() => {
      setCoins((prevCoins) => {
        if (prevCoins.length === 0) return prevCoins;

        const pusherY = PLAY_AREA_HEIGHT - PUSHER_HEIGHT - 10;
        const pusherExtension = (pusherProgress.value * 60);
        const activePusherY = pusherY + pusherExtension;

        const updatedCoins = prevCoins.map((coin) => {
          if (coin.collected) return coin;

          // Apply gravity
          let newVelocityY = coin.velocityY + GRAVITY;
          let newVelocityX = coin.velocityX * FRICTION;
          let newY = coin.y + newVelocityY;
          let newX = coin.x + newVelocityX;
          let newRotation = coin.rotation + (newVelocityX * 2);
          let onPusher = false;

          // Wall collision detection
          if (newX < COIN_SIZE / 2) {
            newX = COIN_SIZE / 2;
            newVelocityX = -newVelocityX * BOUNCE_DAMPING;
          } else if (newX > SCREEN_WIDTH - COIN_SIZE / 2) {
            newX = SCREEN_WIDTH - COIN_SIZE / 2;
            newVelocityX = -newVelocityX * BOUNCE_DAMPING;
          }

          // Pusher collision detection
          const coinBottom = newY + COIN_SIZE / 2;
          const coinTop = newY - COIN_SIZE / 2;
          
          if (coinBottom >= activePusherY && coinTop <= activePusherY + PUSHER_HEIGHT) {
            const pusherLeft = (SCREEN_WIDTH - PUSHER_WIDTH) / 2;
            const pusherRight = pusherLeft + PUSHER_WIDTH;
            
            if (newX >= pusherLeft && newX <= pusherRight) {
              // Coin is on the pusher
              onPusher = true;
              newY = activePusherY - COIN_SIZE / 2;
              newVelocityY = Math.max(newVelocityY, 1);
              
              // Push the coin forward
              if (pusherProgress.value > 0.3 && pusherProgress.value < 0.7) {
                newVelocityY += 2;
                newVelocityX += (Math.random() - 0.5) * 1.5;
              }
            }
          }

          // Ground collision
          if (newY >= PLAY_AREA_HEIGHT - COIN_SIZE / 2 && !onPusher) {
            newY = PLAY_AREA_HEIGHT - COIN_SIZE / 2;
            newVelocityY = -newVelocityY * BOUNCE_DAMPING;
            
            if (Math.abs(newVelocityY) < 0.5) {
              newVelocityY = 0;
            }
          }

          // Check if coin reached collection zone
          if (newY > COLLECTION_ZONE_Y) {
            return { ...coin, collected: true };
          }

          // Coin-to-coin collision (simplified)
          prevCoins.forEach((otherCoin) => {
            if (otherCoin.id !== coin.id && !otherCoin.collected) {
              const dx = newX - otherCoin.x;
              const dy = newY - otherCoin.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance < COIN_SIZE) {
                const angle = Math.atan2(dy, dx);
                const targetX = otherCoin.x + Math.cos(angle) * COIN_SIZE;
                const targetY = otherCoin.y + Math.sin(angle) * COIN_SIZE;
                
                newX = targetX;
                newY = targetY;
                
                const bounce = 0.5;
                newVelocityX += Math.cos(angle) * bounce;
                newVelocityY += Math.sin(angle) * bounce;
              }
            }
          });

          return {
            ...coin,
            x: newX,
            y: newY,
            velocityX: newVelocityX,
            velocityY: newVelocityY,
            rotation: newRotation,
            onPusher,
            collected: false,
          };
        });

        // Handle collected coins
        const newlyCollected = updatedCoins.filter(
          (coin, index) => coin.collected && !prevCoins[index].collected
        );
        
        if (newlyCollected.length > 0) {
          const points = newlyCollected.length * 10;
          setScore((prev) => {
            const newScore = prev + points;
            setHighScore((hs) => Math.max(hs, newScore));
            return newScore;
          });
          
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }

        return updatedCoins.filter((coin) => !coin.collected);
      });
    }, 1000 / 60); // 60 FPS

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [pusherProgress.value]);

  const dropCoin = () => {
    if (coinCount <= 0) {
      console.log('No coins left!');
      return;
    }

    const dropX = SCREEN_WIDTH / 2 + (Math.random() - 0.5) * 80;
    
    const newCoin: Coin = {
      id: `${Date.now()}-${Math.random()}`,
      x: dropX,
      y: 0,
      velocityX: (Math.random() - 0.5) * 2,
      velocityY: 1,
      rotation: Math.random() * 360,
      collected: false,
      onPusher: false,
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
    setCoinCount(15);
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.header}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Score</Text>
          <Text style={styles.statValue}>{score}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>High Score</Text>
          <Text style={styles.statValue}>{highScore}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Coins</Text>
          <Text style={styles.statValue}>{coinCount}</Text>
        </View>
      </View>

      {/* Drop Zone */}
      <View style={styles.dropZone}>
        <Pressable
          style={[
            styles.dropButton,
            coinCount <= 0 && styles.dropButtonDisabled
          ]}
          onPress={dropCoin}
          disabled={coinCount <= 0}
        >
          <Text style={styles.dropButtonText}>
            {coinCount > 0 ? '💰 DROP COIN' : '❌ NO COINS'}
          </Text>
        </Pressable>
        <Text style={styles.dropHint}>Tap to drop a coin!</Text>
      </View>

      {/* Play Area */}
      <View style={styles.playArea}>
        {/* Side walls indicators */}
        <View style={styles.leftWall} />
        <View style={styles.rightWall} />

        {/* Coins */}
        {coins.map((coin) => (
          <Animated.View
            key={coin.id}
            style={[
              styles.coin,
              {
                left: coin.x - COIN_SIZE / 2,
                top: coin.y - COIN_SIZE / 2,
                transform: [{ rotate: `${coin.rotation}deg` }],
              },
            ]}
          >
            <View style={[
              styles.coinInner,
              coin.onPusher && styles.coinOnPusher
            ]}>
              <Text style={styles.coinText}>🪙</Text>
            </View>
          </Animated.View>
        ))}

        {/* Pusher Mechanism */}
        <Animated.View
          style={[
            styles.pusher,
            pusherAnimatedStyle,
          ]}
        >
          <View style={styles.pusherBar}>
            <View style={styles.pusherGrip} />
            <View style={styles.pusherGrip} />
            <View style={styles.pusherGrip} />
          </View>
        </Animated.View>

        {/* Ground line */}
        <View style={styles.ground} />
      </View>

      {/* Collection Zone */}
      <View style={styles.collectionZone}>
        <Text style={styles.collectionText}>💎 Collection Zone 💎</Text>
        <Text style={styles.collectionSubtext}>Coins that fall here count!</Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <Pressable 
          style={styles.resetButton} 
          onPress={resetGame}
        >
          <Text style={styles.resetButtonText}>🔄 RESET GAME</Text>
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
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor: colors.card,
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
    boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.15)',
    elevation: 4,
  },
  statBox: {
    alignItems: 'center',
    minWidth: 80,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 28,
    color: colors.primary,
    fontWeight: 'bold',
    marginTop: 2,
  },
  dropZone: {
    height: DROP_ZONE_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderBottomWidth: 4,
    borderBottomColor: colors.accent,
    paddingVertical: 20,
  },
  dropButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 50,
    paddingVertical: 18,
    borderRadius: 25,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.25)',
    elevation: 6,
    borderWidth: 3,
    borderColor: colors.secondary,
  },
  dropButtonDisabled: {
    backgroundColor: colors.accent,
    opacity: 0.5,
  },
  dropButtonText: {
    color: colors.card,
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  dropHint: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  playArea: {
    height: PLAY_AREA_HEIGHT,
    backgroundColor: '#E8DCC4',
    position: 'relative',
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderColor: colors.accent,
    overflow: 'hidden',
  },
  leftWall: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.primary,
  },
  rightWall: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.primary,
  },
  coin: {
    position: 'absolute',
    width: COIN_SIZE,
    height: COIN_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: COIN_SIZE / 2,
    backgroundColor: 'transparent',
  },
  coinOnPusher: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  coinText: {
    fontSize: 32,
  },
  pusher: {
    position: 'absolute',
    bottom: 10,
    left: (SCREEN_WIDTH - PUSHER_WIDTH) / 2,
    width: PUSHER_WIDTH,
    height: PUSHER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pusherBar: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: colors.primary,
    boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.3)',
    elevation: 5,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  pusherGrip: {
    width: 6,
    height: '60%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  ground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary,
  },
  collectionZone: {
    height: 90,
    backgroundColor: colors.highlight,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderColor: colors.primary,
    boxShadow: '0px -2px 6px rgba(0, 0, 0, 0.15)',
    elevation: 3,
  },
  collectionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  collectionSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  controls: {
    padding: 15,
    backgroundColor: colors.card,
    borderTopWidth: 2,
    borderTopColor: colors.accent,
  },
  resetButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.15)',
    elevation: 3,
    borderWidth: 2,
    borderColor: colors.textSecondary,
  },
  resetButtonText: {
    color: colors.card,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
