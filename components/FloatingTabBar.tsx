
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import React from 'react';
import { BlurView } from 'expo-blur';
import { IconSymbol } from '@/components/IconSymbol';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { colors } from '@/styles/commonStyles';

export interface TabBarItem {
  name: string;
  title: string;
  icon: string;
  route: string;
}

interface FloatingTabBarProps {
  tabs: TabBarItem[];
  containerWidth?: number;
  borderRadius?: number;
  bottomMargin?: number;
}

export default function FloatingTabBar({
  tabs,
  containerWidth = Dimensions.get('window').width - 40,
  borderRadius = 25,
  bottomMargin = 30, // Increased from 20 to 30 to move it down
}: FloatingTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();

  const handleTabPress = (route: string) => {
    console.log('Tab pressed:', route);
    router.push(route as any);
  };

  const isActive = (route: string) => {
    return pathname.startsWith(route);
  };

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[
        styles.safeArea,
        {
          bottom: bottomMargin,
        },
      ]}
    >
      <View
        style={[
          styles.wrapper,
          {
            width: containerWidth,
            borderRadius: borderRadius,
          },
        ]}
      >
        {/* Background blur layer */}
        <BlurView
          intensity={80}
          tint={theme.dark ? 'dark' : 'light'}
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: borderRadius,
              backgroundColor: theme.dark 
                ? 'rgba(0, 0, 0, 0.7)' 
                : 'rgba(255, 255, 255, 0.85)',
              borderWidth: 1,
              borderColor: colors.accent,
            },
          ]}
        />
        
        {/* Content layer - rendered on top of blur */}
        <View style={styles.container}>
          {tabs.map((tab) => {
            const active = isActive(tab.route);
            
            return (
              <TabButton
                key={tab.name}
                tab={tab}
                active={active}
                onPress={() => handleTabPress(tab.route)}
              />
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

interface TabButtonProps {
  tab: TabBarItem;
  active: boolean;
  onPress: () => void;
}

function TabButton({ tab, active, onPress }: TabButtonProps) {
  const scale = useSharedValue(active ? 1 : 0.9);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(scale.value) }],
    };
  });

  // Use high contrast colors for better visibility
  const activeColor = colors.primary;
  const inactiveColor = colors.text; // Changed from textSecondary to text for better contrast

  return (
    <TouchableOpacity
      style={styles.tab}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.tabContent, animatedStyle]}>
        <IconSymbol
          name={tab.icon as any}
          size={24}
          color={active ? activeColor : inactiveColor}
        />
        <Text
          style={[
            styles.tabLabel,
            {
              color: active ? activeColor : inactiveColor,
              fontWeight: active ? '700' : '500',
            },
          ]}
        >
          {tab.title}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
    pointerEvents: 'box-none',
  },
  wrapper: {
    overflow: 'hidden',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    elevation: 8,
  },
  container: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    pointerEvents: 'auto',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});
