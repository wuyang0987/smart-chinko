
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  Platform,
} from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const COIN_RADIUS = 0.3;
const COIN_THICKNESS = 0.08;
const PUSHER_WIDTH = 8;
const PUSHER_DEPTH = 1.5;
const PUSHER_HEIGHT = 0.5;
const GRAVITY = -9.8;
const FRICTION = 0.98;
const BOUNCE_DAMPING = 0.4;
const PUSHER_SPEED = 2.5;
const ARENA_WIDTH = 10;
const ARENA_DEPTH = 12;
const ARENA_HEIGHT = 8;

interface Coin3D {
  id: string;
  mesh: THREE.Mesh;
  body: {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    rotation: THREE.Euler;
    angularVelocity: THREE.Vector3;
  };
  collected: boolean;
}

export default function CoinPusher3D() {
  const [score, setScore] = useState(0);
  const [coinCount, setCoinCount] = useState(15);
  const [highScore, setHighScore] = useState(0);
  const [isReady, setIsReady] = useState(false);
  
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const coinsRef = useRef<Coin3D[]>([]);
  const pusherRef = useRef<THREE.Mesh | null>(null);
  const pusherDirectionRef = useRef(1);
  const pusherPositionRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef(Date.now());

  const onContextCreate = async (gl: any) => {
    console.log('Creating 3D context...');
    
    // Create renderer
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setClearColor(0xE8DCC4, 1);
    rendererRef.current = renderer;

    // Create scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xE8DCC4, 10, 30);
    sceneRef.current = scene;

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      60,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1,
      1000
    );
    camera.position.set(0, 8, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xFFD700, 0.5, 20);
    pointLight.position.set(0, 5, 0);
    scene.add(pointLight);

    // Create arena floor
    const floorGeometry = new THREE.BoxGeometry(ARENA_WIDTH, 0.2, ARENA_DEPTH);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B7355,
      roughness: 0.8,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.y = -0.1;
    scene.add(floor);

    // Create side walls
    const wallMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xB8860B,
      transparent: true,
      opacity: 0.3,
      roughness: 0.5,
    });
    
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, ARENA_HEIGHT, ARENA_DEPTH),
      wallMaterial
    );
    leftWall.position.set(-ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 0);
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, ARENA_HEIGHT, ARENA_DEPTH),
      wallMaterial
    );
    rightWall.position.set(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 0);
    scene.add(rightWall);

    // Create back wall
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(ARENA_WIDTH, ARENA_HEIGHT, 0.2),
      wallMaterial
    );
    backWall.position.set(0, ARENA_HEIGHT / 2, -ARENA_DEPTH / 2);
    scene.add(backWall);

    // Create pusher
    const pusherGeometry = new THREE.BoxGeometry(PUSHER_WIDTH, PUSHER_HEIGHT, PUSHER_DEPTH);
    const pusherMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xDAA520,
      roughness: 0.4,
      metalness: 0.6,
    });
    const pusher = new THREE.Mesh(pusherGeometry, pusherMaterial);
    pusher.position.set(0, PUSHER_HEIGHT / 2, 3);
    scene.add(pusher);
    pusherRef.current = pusher;

    // Create collection zone indicator
    const collectionGeometry = new THREE.PlaneGeometry(ARENA_WIDTH, 2);
    const collectionMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFD700,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    const collectionZone = new THREE.Mesh(collectionGeometry, collectionMaterial);
    collectionZone.rotation.x = -Math.PI / 2;
    collectionZone.position.set(0, 0.01, ARENA_DEPTH / 2 - 1);
    scene.add(collectionZone);

    setIsReady(true);
    console.log('3D scene ready!');

    // Start render loop
    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      
      const currentTime = Date.now();
      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      // Update pusher animation
      if (pusherRef.current) {
        pusherPositionRef.current += pusherDirectionRef.current * PUSHER_SPEED * deltaTime;
        
        if (pusherPositionRef.current > 2) {
          pusherPositionRef.current = 2;
          pusherDirectionRef.current = -1;
        } else if (pusherPositionRef.current < -2) {
          pusherPositionRef.current = -2;
          pusherDirectionRef.current = 1;
        }
        
        pusherRef.current.position.z = 3 + pusherPositionRef.current;
      }

      // Update physics for all coins
      updatePhysics(deltaTime);

      // Render scene
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        gl.endFrameEXP();
      }
    };
    render();
  };

  const updatePhysics = (deltaTime: number) => {
    if (!sceneRef.current || !pusherRef.current) return;

    const coinsToRemove: string[] = [];

    coinsRef.current.forEach((coin) => {
      if (coin.collected) return;

      const { body, mesh } = coin;

      // Apply gravity
      body.velocity.y += GRAVITY * deltaTime;

      // Apply friction
      body.velocity.x *= FRICTION;
      body.velocity.z *= FRICTION;

      // Update position
      body.position.x += body.velocity.x * deltaTime;
      body.position.y += body.velocity.y * deltaTime;
      body.position.z += body.velocity.z * deltaTime;

      // Update rotation
      body.rotation.x += body.angularVelocity.x * deltaTime;
      body.rotation.y += body.angularVelocity.y * deltaTime;
      body.rotation.z += body.angularVelocity.z * deltaTime;

      // Wall collisions
      if (body.position.x < -ARENA_WIDTH / 2 + COIN_RADIUS) {
        body.position.x = -ARENA_WIDTH / 2 + COIN_RADIUS;
        body.velocity.x = -body.velocity.x * BOUNCE_DAMPING;
      } else if (body.position.x > ARENA_WIDTH / 2 - COIN_RADIUS) {
        body.position.x = ARENA_WIDTH / 2 - COIN_RADIUS;
        body.velocity.x = -body.velocity.x * BOUNCE_DAMPING;
      }

      if (body.position.z < -ARENA_DEPTH / 2 + COIN_RADIUS) {
        body.position.z = -ARENA_DEPTH / 2 + COIN_RADIUS;
        body.velocity.z = -body.velocity.z * BOUNCE_DAMPING;
      }

      // Floor collision
      if (body.position.y < COIN_THICKNESS / 2) {
        body.position.y = COIN_THICKNESS / 2;
        body.velocity.y = -body.velocity.y * BOUNCE_DAMPING;
        
        if (Math.abs(body.velocity.y) < 0.1) {
          body.velocity.y = 0;
        }
      }

      // Pusher collision
      if (pusherRef.current) {
        const pusherPos = pusherRef.current.position;
        const pusherMinX = pusherPos.x - PUSHER_WIDTH / 2;
        const pusherMaxX = pusherPos.x + PUSHER_WIDTH / 2;
        const pusherMinZ = pusherPos.z - PUSHER_DEPTH / 2;
        const pusherMaxZ = pusherPos.z + PUSHER_DEPTH / 2;
        const pusherMaxY = pusherPos.y + PUSHER_HEIGHT / 2;

        if (
          body.position.x > pusherMinX &&
          body.position.x < pusherMaxX &&
          body.position.z > pusherMinZ &&
          body.position.z < pusherMaxZ &&
          body.position.y < pusherMaxY + COIN_THICKNESS / 2 &&
          body.position.y > pusherMaxY - COIN_THICKNESS / 2
        ) {
          // Coin is on pusher
          body.position.y = pusherMaxY + COIN_THICKNESS / 2;
          body.velocity.y = Math.max(body.velocity.y, 0);
          
          // Push coin forward
          body.velocity.z += pusherDirectionRef.current * 3 * deltaTime;
          body.velocity.x += (Math.random() - 0.5) * 0.5;
        }
      }

      // Check if coin reached collection zone
      if (body.position.z > ARENA_DEPTH / 2 - 1) {
        coin.collected = true;
        coinsToRemove.push(coin.id);
        
        setScore((prev) => {
          const newScore = prev + 10;
          setHighScore((hs) => Math.max(hs, newScore));
          return newScore;
        });
        
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }

      // Update mesh position and rotation
      mesh.position.copy(body.position);
      mesh.rotation.copy(body.rotation);
    });

    // Remove collected coins
    if (coinsToRemove.length > 0) {
      coinsToRemove.forEach((id) => {
        const coinIndex = coinsRef.current.findIndex((c) => c.id === id);
        if (coinIndex !== -1) {
          const coin = coinsRef.current[coinIndex];
          if (sceneRef.current) {
            sceneRef.current.remove(coin.mesh);
          }
          coinsRef.current.splice(coinIndex, 1);
        }
      });
    }
  };

  const dropCoin = () => {
    if (coinCount <= 0 || !sceneRef.current || !isReady) {
      console.log('Cannot drop coin');
      return;
    }

    console.log('Dropping coin...');

    // Create coin geometry
    const coinGeometry = new THREE.CylinderGeometry(
      COIN_RADIUS,
      COIN_RADIUS,
      COIN_THICKNESS,
      32
    );
    
    const coinMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      roughness: 0.3,
      metalness: 0.8,
    });

    const coinMesh = new THREE.Mesh(coinGeometry, coinMaterial);
    
    // Random drop position
    const dropX = (Math.random() - 0.5) * 3;
    const dropZ = -4 + (Math.random() - 0.5) * 2;
    
    coinMesh.position.set(dropX, 6, dropZ);
    coinMesh.rotation.x = Math.PI / 2;
    
    sceneRef.current.add(coinMesh);

    const newCoin: Coin3D = {
      id: `${Date.now()}-${Math.random()}`,
      mesh: coinMesh,
      body: {
        position: new THREE.Vector3(dropX, 6, dropZ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          0,
          (Math.random() - 0.5) * 0.5
        ),
        rotation: new THREE.Euler(Math.PI / 2, 0, 0),
        angularVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ),
      },
      collected: false,
    };

    coinsRef.current.push(newCoin);
    setCoinCount((prev) => prev - 1);

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const resetGame = () => {
    console.log('Resetting game...');
    
    // Remove all coins from scene
    coinsRef.current.forEach((coin) => {
      if (sceneRef.current) {
        sceneRef.current.remove(coin.mesh);
      }
    });
    
    coinsRef.current = [];
    setScore(0);
    setCoinCount(15);
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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

      {/* 3D View */}
      <View style={styles.glContainer}>
        <GLView
          style={styles.glView}
          onContextCreate={onContextCreate}
        />
        {!isReady && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>Loading 3D Scene...</Text>
          </View>
        )}
      </View>

      {/* Drop Zone */}
      <View style={styles.dropZone}>
        <Pressable
          style={[
            styles.dropButton,
            (coinCount <= 0 || !isReady) && styles.dropButtonDisabled
          ]}
          onPress={dropCoin}
          disabled={coinCount <= 0 || !isReady}
        >
          <Text style={styles.dropButtonText}>
            {!isReady ? '⏳ LOADING...' : coinCount > 0 ? '💰 DROP COIN' : '❌ NO COINS'}
          </Text>
        </Pressable>
        <Text style={styles.dropHint}>
          {isReady ? 'Tap to drop a 3D coin!' : 'Preparing 3D environment...'}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <Pressable 
          style={styles.resetButton} 
          onPress={resetGame}
          disabled={!isReady}
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
  glContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#E8DCC4',
  },
  glView: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 220, 196, 0.9)',
  },
  loadingText: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: 'bold',
  },
  dropZone: {
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderTopWidth: 4,
    borderTopColor: colors.accent,
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
