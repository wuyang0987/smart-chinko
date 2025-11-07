
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
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BALL_SIZE = 20;
const PEG_SIZE = 12;
const DROP_ZONE_HEIGHT = 120;
const TAB_BAR_HEIGHT = 90;
const TAB_BAR_MARGIN = 20;
const PLAY_AREA_HEIGHT = SCREEN_HEIGHT - DROP_ZONE_HEIGHT - TAB_BAR_MARGIN - 60;
const GRAVITY = 0.5;
const FRICTION = 0.98;
const BOUNCE_DAMPING = 0.7;
const PEG_BOUNCE = 0.8;

interface Ball {
  id: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  collected: boolean;
  scoreZone: number | null;
}

interface Peg {
  x: number;
  y: number;
}

interface ScoreZone {
  x: number;
  width: number;
  multiplier: number;
  color: string;
}

// Generate pegs in a triangular pattern
const generatePegs = (): Peg[] => {
  const pegs: Peg[] = [];
  const rows = 12;
  const startY = 80;
  const rowSpacing = (PLAY_AREA_HEIGHT - 200) / rows;
  const pegSpacing = 45;

  for (let row = 0; row < rows; row++) {
    const pegsInRow = 6 + Math.floor(row / 2);
    const rowWidth = pegsInRow * pegSpacing;
    const startX = (SCREEN_WIDTH - rowWidth) / 2;

    for (let col = 0; col < pegsInRow; col++) {
      const offsetX = (row % 2) * (pegSpacing / 2);
      pegs.push({
        x: startX + col * pegSpacing + offsetX,
        y: startY + row * rowSpacing,
      });
    }
  }

  return pegs;
};

// Define score zones at the bottom
const generateScoreZones = (): ScoreZone[] => {
  const zoneCount = 7;
  const zoneWidth = SCREEN_WIDTH / zoneCount;
  const multipliers = [5, 3, 2, 10, 2, 3, 5]; // Center has highest multiplier
  const zoneColors = [
    '#FF6B6B', // Red
    '#FFA500', // Orange
    '#FFD700', // Gold
    '#00FF00', // Green (jackpot)
    '#FFD700', // Gold
    '#FFA500', // Orange
    '#FF6B6B', // Red
  ];

  return multipliers.map((multiplier, index) => ({
    x: index * zoneWidth,
    width: zoneWidth,
    multiplier,
    color: zoneColors[index],
  }));
};

export default function PachinkoGame() {
  const [balls, setBalls] = useState<Ball[]>([]);
  const [score, setScore] = useState(0);
  const [ballCount, setBallCount] = useState(20);
  const [highScore, setHighScore] = useState(0);
  const [pegs] = useState<Peg[]>(generatePegs());
  const [scoreZones] = useState<ScoreZone[]>(generateScoreZones());
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  // Main physics simulation loop
  useEffect(() => {
    gameLoopRef.current = setInterval(() => {
      setBalls((prevBalls) => {
        if (prevBalls.length === 0) return prevBalls;

        const updatedBalls = prevBalls.map((ball) => {
          if (ball.collected) return ball;

          // Apply gravity
          let newVelocityY = ball.velocityY + GRAVITY;
          let newVelocityX = ball.velocityX * FRICTION;
          let newY = ball.y + newVelocityY;
          let newX = ball.x + newVelocityX;

          // Wall collision detection
          if (newX < BALL_SIZE / 2) {
            newX = BALL_SIZE / 2;
            newVelocityX = -newVelocityX * BOUNCE_DAMPING;
          } else if (newX > SCREEN_WIDTH - BALL_SIZE / 2) {
            newX = SCREEN_WIDTH - BALL_SIZE / 2;
            newVelocityX = -newVelocityX * BOUNCE_DAMPING;
          }

          // Peg collision detection
          pegs.forEach((peg) => {
            const dx = newX - peg.x;
            const dy = newY - peg.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = (BALL_SIZE + PEG_SIZE) / 2;

            if (distance < minDistance) {
              // Calculate bounce angle
              const angle = Math.atan2(dy, dx);
              const targetX = peg.x + Math.cos(angle) * minDistance;
              const targetY = peg.y + Math.sin(angle) * minDistance;

              newX = targetX;
              newY = targetY;

              // Apply bounce velocity
              const bounceStrength = Math.sqrt(
                newVelocityX * newVelocityX + newVelocityY * newVelocityY
              ) * PEG_BOUNCE;

              newVelocityX = Math.cos(angle) * bounceStrength;
              newVelocityY = Math.sin(angle) * bounceStrength;

              // Add some randomness for more interesting gameplay
              newVelocityX += (Math.random() - 0.5) * 1.5;

              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }
          });

          // Ground collision - check which score zone
          const groundLevel = PLAY_AREA_HEIGHT - BALL_SIZE / 2 - 10;
          if (newY >= groundLevel) {
            newY = groundLevel;
            newVelocityY = -newVelocityY * 0.3;

            if (Math.abs(newVelocityY) < 1) {
              newVelocityY = 0;
              newVelocityX *= 0.9;

              // Determine which score zone the ball is in
              const zoneIndex = Math.floor(newX / (SCREEN_WIDTH / scoreZones.length));
              const zone = scoreZones[Math.min(zoneIndex, scoreZones.length - 1)];

              if (Math.abs(newVelocityX) < 0.5 && !ball.scoreZone) {
                return { ...ball, scoreZone: zone.multiplier, collected: true };
              }
            }
          }

          // Ball-to-ball collision (simplified)
          prevBalls.forEach((otherBall) => {
            if (otherBall.id !== ball.id && !otherBall.collected) {
              const dx = newX - otherBall.x;
              const dy = newY - otherBall.y;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance < BALL_SIZE) {
                const angle = Math.atan2(dy, dx);
                const targetX = otherBall.x + Math.cos(angle) * BALL_SIZE;
                const targetY = otherBall.y + Math.sin(angle) * BALL_SIZE;

                newX = targetX;
                newY = targetY;

                const bounce = 0.4;
                newVelocityX += Math.cos(angle) * bounce;
                newVelocityY += Math.sin(angle) * bounce;
              }
            }
          });

          return {
            ...ball,
            x: newX,
            y: newY,
            velocityX: newVelocityX,
            velocityY: newVelocityY,
          };
        });

        // Handle collected balls
        const newlyCollected = updatedBalls.filter(
          (ball, index) => ball.collected && !prevBalls[index].collected
        );

        if (newlyCollected.length > 0) {
          const points = newlyCollected.reduce(
            (sum, ball) => sum + (ball.scoreZone || 0) * 10,
            0
          );
          setScore((prev) => {
            const newScore = prev + points;
            setHighScore((hs) => Math.max(hs, newScore));
            return newScore;
          });

          if (Platform.OS !== 'web') {
            const maxMultiplier = Math.max(...newlyCollected.map(b => b.scoreZone || 0));
            if (maxMultiplier >= 10) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
          }
        }

        return updatedBalls.filter((ball) => !ball.collected);
      });
    }, 1000 / 60); // 60 FPS

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [pegs, scoreZones]);

  const dropBall = () => {
    if (ballCount <= 0) {
      console.log('No balls left!');
      return;
    }

    const dropX = SCREEN_WIDTH / 2 + (Math.random() - 0.5) * 60;

    const newBall: Ball = {
      id: `${Date.now()}-${Math.random()}`,
      x: dropX,
      y: 0,
      velocityX: (Math.random() - 0.5) * 1,
      velocityY: 1,
      collected: false,
      scoreZone: null,
    };

    setBalls((prev) => [...prev, newBall]);
    setBallCount((prev) => prev - 1);

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const resetGame = () => {
    setBalls([]);
    setScore(0);
    setBallCount(20);

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
          <Text style={styles.statLabel}>Balls</Text>
          <Text style={styles.statValue}>{ballCount}</Text>
        </View>
      </View>

      {/* Drop Zone */}
      <View style={styles.dropZone}>
        <Pressable
          style={[
            styles.dropButton,
            ballCount <= 0 && styles.dropButtonDisabled,
          ]}
          onPress={dropBall}
          disabled={ballCount <= 0}
        >
          <Text style={styles.dropButtonText}>
            {ballCount > 0 ? '🎯 DROP BALL' : '❌ NO BALLS'}
          </Text>
        </Pressable>
        <Text style={styles.dropHint}>Aim for the green zone!</Text>
      </View>

      {/* Play Area */}
      <View style={styles.playArea}>
        {/* Side walls */}
        <View style={styles.leftWall} />
        <View style={styles.rightWall} />

        {/* Pegs */}
        {pegs.map((peg, index) => (
          <View
            key={`peg-${index}`}
            style={[
              styles.peg,
              {
                left: peg.x - PEG_SIZE / 2,
                top: peg.y - PEG_SIZE / 2,
              },
            ]}
          />
        ))}

        {/* Balls */}
        {balls.map((ball) => (
          <Animated.View
            key={ball.id}
            style={[
              styles.ball,
              {
                left: ball.x - BALL_SIZE / 2,
                top: ball.y - BALL_SIZE / 2,
              },
            ]}
          >
            <View style={styles.ballInner}>
              <Text style={styles.ballText}>⚪</Text>
            </View>
          </Animated.View>
        ))}

        {/* Score Zones at the bottom */}
        <View style={styles.scoreZonesContainer}>
          {scoreZones.map((zone, index) => (
            <View
              key={`zone-${index}`}
              style={[
                styles.scoreZone,
                {
                  width: zone.width,
                  backgroundColor: zone.color,
                },
              ]}
            >
              <Text style={styles.scoreZoneText}>{zone.multiplier}x</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Reset button */}
      <Pressable style={styles.resetButton} onPress={resetGame}>
        <Text style={styles.resetButtonText}>🔄 RESET</Text>
      </Pressable>
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
    backgroundColor: '#2C3E50',
    position: 'relative',
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderColor: colors.accent,
    overflow: 'visible',
  },
  leftWall: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.primary,
    zIndex: 10,
  },
  rightWall: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.primary,
    zIndex: 10,
  },
  peg: {
    position: 'absolute',
    width: PEG_SIZE,
    height: PEG_SIZE,
    borderRadius: PEG_SIZE / 2,
    backgroundColor: colors.secondary,
    borderWidth: 2,
    borderColor: colors.primary,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)',
    elevation: 3,
    zIndex: 20,
  },
  ball: {
    position: 'absolute',
    width: BALL_SIZE,
    height: BALL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  ballInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BALL_SIZE / 2,
    backgroundColor: 'transparent',
  },
  ballText: {
    fontSize: 20,
  },
  scoreZonesContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    flexDirection: 'row',
    zIndex: 30,
  },
  scoreZone: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 2,
    borderRightColor: '#000',
  },
  scoreZoneText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  resetButton: {
    position: 'absolute',
    top: 60,
    right: 10,
    backgroundColor: colors.accent,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.primary,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
    elevation: 3,
    zIndex: 200,
  },
  resetButtonText: {
    color: colors.card,
    fontSize: 12,
    fontWeight: 'bold',
  },
});
