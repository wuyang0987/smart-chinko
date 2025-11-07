
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  withSpring,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BALL_SIZE = 22;
const PEG_SIZE = 14;
const PEG_RADIUS = PEG_SIZE / 2;
const DROP_ZONE_HEIGHT = 140;
const TAB_BAR_SPACE = 160;
const TOP_SPACE = 60; // Added extra space at the top
const PLAY_AREA_HEIGHT = SCREEN_HEIGHT - DROP_ZONE_HEIGHT - TAB_BAR_SPACE - TOP_SPACE;
const GRAVITY = 0.6;
const FRICTION = 0.985;
const BOUNCE_DAMPING = 0.75;
const PEG_BOUNCE = 0.85;

interface Ball {
  id: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  collected: boolean;
  scoreZone: number | null;
  type: 'normal' | 'golden' | 'rainbow';
  color: string;
}

interface Peg {
  x: number;
  y: number;
  hit: boolean;
  hitTime: number;
}

interface ScoreZone {
  x: number;
  width: number;
  multiplier: number;
  color: string;
  label: string;
}

interface Particle {
  id: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  life: number;
  color: string;
}

interface ScorePopup {
  id: string;
  x: number;
  y: number;
  score: number;
  color: string;
}

// Generate 28 pegs with more pegs at the bottom than at the top (pyramid arrangement)
// with staggered positioning between rows
const generatePegs = (): Peg[] => {
  const pegs: Peg[] = [];
  const startY = 80;
  const rowSpacing = (PLAY_AREA_HEIGHT - 220) / 6;
  const pegSpacing = 70;

  // Define boundaries with proper margins
  const minX = PEG_RADIUS + 5; // Left boundary with small margin
  const maxX = SCREEN_WIDTH - PEG_RADIUS - 5; // Right boundary with small margin
  const minY = PEG_RADIUS + 5; // Top boundary with small margin
  const maxY = PLAY_AREA_HEIGHT - 100; // Bottom boundary (above score zones)

  // Distribution: fewer pegs at top, more at bottom
  // Row 0: 2 pegs
  // Row 1: 3 pegs
  // Row 2: 4 pegs
  // Row 3: 5 pegs
  // Row 4: 6 pegs
  // Row 5: 8 pegs
  // Total: 2 + 3 + 4 + 5 + 6 + 8 = 28 pegs
  const pegsPerRow = [2, 3, 4, 5, 6, 8];

  for (let row = 0; row < pegsPerRow.length; row++) {
    const pegsInRow = pegsPerRow[row];
    const rowWidth = (pegsInRow - 1) * pegSpacing;
    const startX = (SCREEN_WIDTH - rowWidth) / 2;

    // Stagger alternating rows by half the peg spacing
    // Even rows (0, 2, 4) are aligned, odd rows (1, 3, 5) are offset
    const staggerOffset = (row % 2 === 1) ? pegSpacing / 2 : 0;

    for (let col = 0; col < pegsInRow; col++) {
      // Calculate base position with stagger offset
      let baseX = startX + col * pegSpacing + staggerOffset;
      let baseY = startY + row * rowSpacing;
      
      // Add small random offset to each peg position for variety
      const randomOffsetX = (Math.random() - 0.5) * 10;
      const randomOffsetY = (Math.random() - 0.5) * 8;
      
      // Apply random offset
      let finalX = baseX + randomOffsetX;
      let finalY = baseY + randomOffsetY;
      
      // Clamp positions to boundaries to ensure pegs stay within play area
      finalX = Math.max(minX, Math.min(maxX, finalX));
      finalY = Math.max(minY, Math.min(maxY, finalY));
      
      pegs.push({
        x: finalX,
        y: finalY,
        hit: false,
        hitTime: 0,
      });
    }
  }

  console.log(`Generated ${pegs.length} pegs in ${pegsPerRow.length} rows with staggered pyramid arrangement`);
  console.log(`Stagger pattern: Even rows aligned, odd rows offset by ${pegSpacing / 2}px`);
  console.log(`Boundary constraints: X[${minX.toFixed(1)}, ${maxX.toFixed(1)}], Y[${minY.toFixed(1)}, ${maxY.toFixed(1)}]`);
  
  return pegs;
};

// Define enhanced score zones
const generateScoreZones = (): ScoreZone[] => {
  const zoneCount = 9;
  const zoneWidth = SCREEN_WIDTH / zoneCount;
  const multipliers = [2, 5, 3, 8, 20, 8, 3, 5, 2];
  const zoneColors = [
    '#FF6B6B',
    '#FFA500',
    '#FFD700',
    '#4CAF50',
    '#00FF00',
    '#4CAF50',
    '#FFD700',
    '#FFA500',
    '#FF6B6B',
  ];
  const labels = ['2x', '5x', '3x', '8x', '🎰', '8x', '3x', '5x', '2x'];

  return multipliers.map((multiplier, index) => ({
    x: index * zoneWidth,
    width: zoneWidth,
    multiplier,
    color: zoneColors[index],
    label: labels[index],
  }));
};

export default function PachinkoGame() {
  const [balls, setBalls] = useState<Ball[]>([]);
  const [score, setScore] = useState(0);
  const [ballCount, setBallCount] = useState(30);
  const [highScore, setHighScore] = useState(0);
  const [pegs, setPegs] = useState<Peg[]>(generatePegs());
  const [scoreZones] = useState<ScoreZone[]>(generateScoreZones());
  const [particles, setParticles] = useState<Particle[]>([]);
  const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);
  const [autoDrop, setAutoDrop] = useState(false);
  const [combo, setCombo] = useState(0);
  const [lastScoreTime, setLastScoreTime] = useState(0);
  
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const autoDropRef = useRef<NodeJS.Timeout | null>(null);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pegsRef = useRef<Peg[]>(pegs);

  // Keep pegs ref in sync
  useEffect(() => {
    pegsRef.current = pegs;
  }, [pegs]);

  // Animated values for UI effects
  const scoreScale = useSharedValue(1);
  const comboOpacity = useSharedValue(0);

  const createParticles = useCallback((x: number, y: number, color: string, count: number = 5) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: `${Date.now()}-${Math.random()}`,
        x,
        y,
        velocityX: (Math.random() - 0.5) * 4,
        velocityY: (Math.random() - 0.5) * 4 - 2,
        life: 20 + Math.random() * 20,
        color,
      });
    }
    setParticles((prev) => [...prev, ...newParticles]);
  }, []);

  const createScorePopup = useCallback((x: number, y: number, score: number, color: string) => {
    setScorePopups((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        x,
        y,
        score,
        color,
      },
    ]);
  }, []);

  // Main physics simulation loop
  useEffect(() => {
    gameLoopRef.current = setInterval(() => {
      const hitPegs: number[] = [];

      // Update balls
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
            createParticles(newX, newY, ball.color, 3);
          } else if (newX > SCREEN_WIDTH - BALL_SIZE / 2) {
            newX = SCREEN_WIDTH - BALL_SIZE / 2;
            newVelocityX = -newVelocityX * BOUNCE_DAMPING;
            createParticles(newX, newY, ball.color, 3);
          }

          // Peg collision detection - FIXED PHYSICS
          const currentPegs = pegsRef.current;
          for (let i = 0; i < currentPegs.length; i++) {
            const peg = currentPegs[i];
            const dx = newX - peg.x;
            const dy = newY - peg.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = (BALL_SIZE + PEG_SIZE) / 2;

            if (distance < minDistance && distance > 0) {
              // Normalize the collision vector
              const normalX = dx / distance;
              const normalY = dy / distance;

              // Push ball out of peg
              const overlap = minDistance - distance;
              newX += normalX * overlap;
              newY += normalY * overlap;

              // Calculate relative velocity
              const relativeVelocityX = newVelocityX;
              const relativeVelocityY = newVelocityY;

              // Calculate velocity along collision normal
              const velocityAlongNormal = relativeVelocityX * normalX + relativeVelocityY * normalY;

              // Only resolve if objects are moving towards each other
              if (velocityAlongNormal < 0) {
                // Calculate impulse scalar with bounce factor
                const restitution = PEG_BOUNCE;
                const impulse = -(1 + restitution) * velocityAlongNormal;

                // Apply impulse to ball velocity
                newVelocityX += impulse * normalX;
                newVelocityY += impulse * normalY;

                // Add some randomness for more interesting gameplay
                newVelocityX += (Math.random() - 0.5) * 1.5;
                newVelocityY += (Math.random() - 0.5) * 0.5;

                // Create particles on hit
                createParticles(peg.x, peg.y, ball.color, 6);

                // Mark peg as hit
                hitPegs.push(i);

                // Haptic feedback
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }
            }
          }

          // Ground collision - check which score zone
          const groundLevel = PLAY_AREA_HEIGHT - BALL_SIZE / 2 - 70;
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
                // Ball has landed in a zone
                const multiplier = ball.type === 'golden' ? zone.multiplier * 2 : 
                                 ball.type === 'rainbow' ? zone.multiplier * 3 : 
                                 zone.multiplier;
                
                createScorePopup(newX, newY, multiplier * 10, zone.color);
                createParticles(newX, newY, zone.color, 15);
                
                return { ...ball, scoreZone: multiplier, collected: true };
              }
            }
          }

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
            scoreScale.value = withSequence(
              withSpring(1.3),
              withSpring(1)
            );
            return newScore;
          });

          // Combo system
          const now = Date.now();
          if (now - lastScoreTime < 2000) {
            setCombo((prev) => {
              const newCombo = prev + 1;
              if (newCombo > 1) {
                comboOpacity.value = withSequence(
                  withTiming(1, { duration: 200 }),
                  withTiming(1, { duration: 1500 }),
                  withTiming(0, { duration: 300 })
                );
              }
              return newCombo;
            });
          } else {
            setCombo(1);
          }
          setLastScoreTime(now);

          // Reset combo after delay
          if (comboTimeoutRef.current) {
            clearTimeout(comboTimeoutRef.current);
          }
          comboTimeoutRef.current = setTimeout(() => {
            setCombo(0);
          }, 2000);

          if (Platform.OS !== 'web') {
            const maxMultiplier = Math.max(...newlyCollected.map(b => b.scoreZone || 0));
            if (maxMultiplier >= 20) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else if (maxMultiplier >= 8) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            } else {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
          }
        }

        return updatedBalls.filter((ball) => !ball.collected);
      });

      // Update hit pegs
      if (hitPegs.length > 0) {
        setPegs((prevPegs) => {
          return prevPegs.map((peg, index) => {
            if (hitPegs.includes(index)) {
              return { ...peg, hit: true, hitTime: Date.now() };
            }
            return peg;
          });
        });
      }

      // Update particles
      setParticles((prevParticles) => {
        return prevParticles
          .map((particle) => ({
            ...particle,
            x: particle.x + particle.velocityX,
            y: particle.y + particle.velocityY,
            velocityY: particle.velocityY + 0.3,
            life: particle.life - 1,
          }))
          .filter((particle) => particle.life > 0);
      });

      // Update score popups
      setScorePopups((prevPopups) => {
        return prevPopups
          .map((popup) => ({
            ...popup,
            y: popup.y - 2,
          }))
          .filter((popup) => Date.now() - parseInt(popup.id) < 1500);
      });

      // Reset peg hits after a delay
      setPegs((prevPegs) => {
        const now = Date.now();
        return prevPegs.map((peg) => {
          if (peg.hit && now - peg.hitTime > 300) {
            return { ...peg, hit: false };
          }
          return peg;
        });
      });
    }, 1000 / 60); // 60 FPS

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [scoreZones, lastScoreTime, createParticles, createScorePopup]);

  // Auto-drop functionality
  useEffect(() => {
    if (autoDrop && ballCount > 0) {
      autoDropRef.current = setInterval(() => {
        dropBall();
      }, 800);
    } else {
      if (autoDropRef.current) {
        clearInterval(autoDropRef.current);
      }
    }

    return () => {
      if (autoDropRef.current) {
        clearInterval(autoDropRef.current);
      }
    };
  }, [autoDrop, ballCount]);

  const dropBall = useCallback(() => {
    if (ballCount <= 0) {
      setAutoDrop(false);
      console.log('No balls left!');
      return;
    }

    // Generate a random horizontal position across the entire screen width
    // Keep a margin of BALL_SIZE on each side to prevent spawning too close to walls
    const margin = BALL_SIZE;
    const dropX = margin + Math.random() * (SCREEN_WIDTH - 2 * margin);
    
    console.log(`Ball dropped at x: ${dropX.toFixed(2)} (screen width: ${SCREEN_WIDTH})`);
    
    // Determine ball type (10% golden, 5% rainbow)
    const rand = Math.random();
    let ballType: 'normal' | 'golden' | 'rainbow' = 'normal';
    let ballColor = '#FFFFFF';
    
    if (rand < 0.05) {
      ballType = 'rainbow';
      ballColor = '#FF00FF';
    } else if (rand < 0.15) {
      ballType = 'golden';
      ballColor = '#FFD700';
    }

    const newBall: Ball = {
      id: `${Date.now()}-${Math.random()}`,
      x: dropX,
      y: 0,
      velocityX: (Math.random() - 0.5) * 1.5,
      velocityY: 1,
      collected: false,
      scoreZone: null,
      type: ballType,
      color: ballColor,
    };

    setBalls((prev) => [...prev, newBall]);
    setBallCount((prev) => prev - 1);

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [ballCount]);

  const resetGame = () => {
    console.log('Resetting game - repositioning pegs with staggered pattern...');
    setBalls([]);
    setScore(0);
    setBallCount(30);
    setCombo(0);
    setParticles([]);
    setScorePopups([]);
    setAutoDrop(false);
    
    // Generate new pegs with randomized positions and staggered pattern
    const newPegs = generatePegs();
    console.log(`Generated ${newPegs.length} new pegs with staggered arrangement`);
    setPegs(newPegs);

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const toggleAutoDrop = () => {
    setAutoDrop((prev) => !prev);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const animatedScoreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scoreScale.value }],
  }));

  const animatedComboStyle = useAnimatedStyle(() => ({
    opacity: comboOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Animated Background */}
      <View style={styles.backgroundGradient}>
        <LinearGradient
          colors={['#1a1a2e', '#16213e', '#0f3460']}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Top Spacer for breathing room */}
      <View style={styles.topSpacer} />

      {/* Header Stats */}
      <View style={styles.header}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Score</Text>
          <Animated.Text style={[styles.statValue, animatedScoreStyle]}>
            {score}
          </Animated.Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>High Score</Text>
          <Text style={styles.statValue}>{highScore}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Balls</Text>
          <Text style={[styles.statValue, ballCount <= 5 && styles.lowBalls]}>
            {ballCount}
          </Text>
        </View>
      </View>

      {/* Combo Display */}
      {combo > 1 && (
        <Animated.View style={[styles.comboContainer, animatedComboStyle]}>
          <Text style={styles.comboText}>🔥 COMBO x{combo} 🔥</Text>
        </Animated.View>
      )}

      {/* Drop Zone */}
      <View style={styles.dropZone}>
        <View style={styles.dropButtons}>
          <Pressable
            onPress={dropBall}
            disabled={ballCount <= 0}
            style={[
              styles.dropButton,
              ballCount <= 0 && styles.dropButtonDisabled,
            ]}
          >
            <Text style={styles.dropButtonText}>
              {ballCount > 0 ? '🎯 DROP' : '❌ EMPTY'}
            </Text>
          </Pressable>
          
          <Pressable
            onPress={toggleAutoDrop}
            disabled={ballCount <= 0}
            style={[
              styles.autoDropButton,
              autoDrop && styles.autoDropButtonActive,
              ballCount <= 0 && styles.dropButtonDisabled,
            ]}
          >
            <Text style={styles.autoDropButtonText}>
              {autoDrop ? '⏸️ AUTO' : '▶️ AUTO'}
            </Text>
          </Pressable>

          <Pressable
            onPress={resetGame}
            style={styles.resetButton}
          >
            <Text style={styles.resetButtonText}>
              🔄 RESET
            </Text>
          </Pressable>
        </View>
        
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBall, { backgroundColor: '#FFFFFF' }]} />
            <Text style={styles.legendText}>Normal</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBall, { backgroundColor: '#FFD700' }]} />
            <Text style={styles.legendText}>Golden 2x</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBall, { backgroundColor: '#FF00FF' }]} />
            <Text style={styles.legendText}>Rainbow 3x</Text>
          </View>
        </View>
      </View>

      {/* Play Area */}
      <View style={styles.playArea}>
        {/* Pegs */}
        {pegs.map((peg, index) => (
          <Animated.View
            key={`peg-${index}`}
            style={[
              styles.peg,
              peg.hit && styles.pegHit,
              {
                left: peg.x - PEG_SIZE / 2,
                top: peg.y - PEG_SIZE / 2,
              },
            ]}
          />
        ))}

        {/* Particles */}
        {particles.map((particle) => (
          <View
            key={particle.id}
            style={[
              styles.particle,
              {
                left: particle.x,
                top: particle.y,
                backgroundColor: particle.color,
                opacity: particle.life / 40,
              },
            ]}
          />
        ))}

        {/* Balls */}
        {balls.map((ball) => (
          <View
            key={ball.id}
            style={[
              styles.ball,
              {
                left: ball.x - BALL_SIZE / 2,
                top: ball.y - BALL_SIZE / 2,
              },
            ]}
          >
            <View
              style={[
                styles.ballInner,
                ball.type === 'golden' && styles.goldenBall,
                ball.type === 'rainbow' && styles.rainbowBall,
              ]}
            >
              <Text style={styles.ballEmoji}>
                {ball.type === 'golden' ? '🟡' : ball.type === 'rainbow' ? '🌈' : '⚪'}
              </Text>
            </View>
          </View>
        ))}

        {/* Score Popups */}
        {scorePopups.map((popup) => (
          <Animated.View
            key={popup.id}
            style={[
              styles.scorePopup,
              {
                left: popup.x - 30,
                top: popup.y - 20,
              },
            ]}
          >
            <Text style={[styles.scorePopupText, { color: popup.color }]}>
              +{popup.score}
            </Text>
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
              <Text style={styles.scoreZoneText}>{zone.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f3460',
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  topSpacer: {
    height: TOP_SPACE,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 3,
    borderBottomColor: '#FFD700',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
    elevation: 6,
    zIndex: 100,
  },
  statBox: {
    alignItems: 'center',
    minWidth: 90,
  },
  statLabel: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 32,
    color: '#FFD700',
    fontWeight: 'bold',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  lowBalls: {
    color: '#FF6B6B',
  },
  comboContainer: {
    position: 'absolute',
    top: TOP_SPACE + 95,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 150,
  },
  comboText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  dropZone: {
    height: DROP_ZONE_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 4,
    borderBottomColor: '#FFD700',
    paddingVertical: 15,
    zIndex: 100,
  },
  dropButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  dropButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
    elevation: 6,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  autoDropButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
    elevation: 6,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  autoDropButtonActive: {
    backgroundColor: '#FF9800',
  },
  resetButton: {
    backgroundColor: '#FF5252',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
    elevation: 6,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  dropButtonDisabled: {
    backgroundColor: '#666666',
    opacity: 0.5,
  },
  dropButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  autoDropButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  legendContainer: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendBall: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  legendText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  playArea: {
    height: PLAY_AREA_HEIGHT,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    position: 'relative',
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderColor: '#FFD700',
    overflow: 'visible',
    marginBottom: TAB_BAR_SPACE,
  },
  peg: {
    position: 'absolute',
    width: PEG_SIZE,
    height: PEG_SIZE,
    borderRadius: PEG_SIZE / 2,
    backgroundColor: '#E0E0E0',
    borderWidth: 2,
    borderColor: '#FFD700',
    boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.4)',
    elevation: 4,
    zIndex: 20,
  },
  pegHit: {
    backgroundColor: '#FFD700',
    boxShadow: '0px 0px 12px rgba(255, 215, 0, 0.8)',
    transform: [{ scale: 1.3 }],
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    zIndex: 40,
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
  goldenBall: {
    boxShadow: '0px 0px 15px rgba(255, 215, 0, 0.9)',
  },
  rainbowBall: {
    boxShadow: '0px 0px 15px rgba(255, 0, 255, 0.9)',
  },
  ballEmoji: {
    fontSize: 22,
  },
  scorePopup: {
    position: 'absolute',
    zIndex: 60,
  },
  scorePopupText: {
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  scoreZonesContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    flexDirection: 'row',
    zIndex: 30,
  },
  scoreZone: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 2,
    borderRightColor: '#000',
    borderTopWidth: 3,
    borderTopColor: '#FFD700',
  },
  scoreZoneText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});
