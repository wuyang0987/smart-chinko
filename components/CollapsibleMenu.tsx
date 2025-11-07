
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { IconSymbol } from '@/components/IconSymbol';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import * as Haptics from 'expo-haptics';

export interface MenuItem {
  name: string;
  title: string;
  icon: string;
  route: string;
}

interface CollapsibleMenuProps {
  items: MenuItem[];
}

export default function CollapsibleMenu({ items }: CollapsibleMenuProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();

  const menuHeight = useSharedValue(0);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(0);

  const toggleMenu = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (newExpandedState) {
      menuHeight.value = withSpring(items.length * 70, {
        damping: 15,
        stiffness: 100,
      });
      rotation.value = withSpring(180);
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      menuHeight.value = withSpring(0, {
        damping: 15,
        stiffness: 100,
      });
      rotation.value = withSpring(0);
      opacity.value = withTiming(0, { duration: 150 });
    }
  };

  const handleMenuItemPress = (route: string) => {
    console.log('Menu item pressed:', route);
    router.push(route as any);
    
    // Close menu after navigation
    setTimeout(() => {
      setIsExpanded(false);
      menuHeight.value = withSpring(0);
      rotation.value = withSpring(0);
      opacity.value = withTiming(0, { duration: 150 });
    }, 100);

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const isActive = (route: string) => {
    return pathname.startsWith(route);
  };

  const animatedMenuStyle = useAnimatedStyle(() => ({
    height: menuHeight.value,
    opacity: opacity.value,
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        {/* Hamburger Button */}
        <TouchableOpacity
          style={styles.hamburgerButton}
          onPress={toggleMenu}
          activeOpacity={0.8}
        >
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 30,
                backgroundColor: '#FFFACD',
                borderWidth: 2,
                borderColor: '#F0E68C',
              },
            ]}
          />
          <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
            <IconSymbol
              name={isExpanded ? 'xmark' : 'line.3.horizontal'}
              size={28}
              color="#8B7500"
            />
          </Animated.View>
        </TouchableOpacity>

        {/* Collapsible Menu */}
        <Animated.View style={[styles.menuContainer, animatedMenuStyle]}>
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 20,
                backgroundColor: '#FFFACD',
                borderWidth: 2,
                borderColor: '#F0E68C',
              },
            ]}
          />
          <View style={styles.menuContent}>
            {items.map((item, index) => {
              const active = isActive(item.route);
              return (
                <Pressable
                  key={item.name}
                  style={[
                    styles.menuItem,
                    active && styles.menuItemActive,
                    index === items.length - 1 && styles.menuItemLast,
                  ]}
                  onPress={() => handleMenuItemPress(item.route)}
                >
                  <IconSymbol
                    name={item.icon as any}
                    size={24}
                    color={active ? '#B8860B' : '#8B7500'}
                  />
                  <Text
                    style={[
                      styles.menuItemText,
                      {
                        color: active ? '#B8860B' : '#8B7500',
                        fontWeight: active ? '700' : '500',
                      },
                    ]}
                  >
                    {item.title}
                  </Text>
                  {active && <View style={styles.activeIndicator} />}
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    pointerEvents: 'box-none',
  },
  container: {
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 30,
    pointerEvents: 'box-none',
  },
  hamburgerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)',
    elevation: 8,
    pointerEvents: 'auto',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    marginTop: 10,
    width: 220,
    overflow: 'hidden',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)',
    elevation: 8,
    pointerEvents: 'auto',
  },
  menuContent: {
    padding: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(240, 230, 140, 0.4)',
    gap: 12,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemActive: {
    backgroundColor: 'rgba(240, 230, 140, 0.3)',
    borderRadius: 12,
  },
  menuItemText: {
    fontSize: 16,
    flex: 1,
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#B8860B',
  },
});
