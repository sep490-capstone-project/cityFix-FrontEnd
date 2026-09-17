import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { AuthUser } from './LoginScreen';

const { width, height } = Dimensions.get('window');

interface Props {
  user: AuthUser | null;
  onFinish: () => void;
}

export default function SplashScreen({ user, onFinish }: Props) {
  // Animation values
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Logo Scale & Fade in
    Animated.parallel([
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 2. Text Fade in & Translate Up
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();

      // Pulse ring animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // Auto transition to Home after 2.5s
    const timer = setTimeout(() => {
      onFinish();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Background Decorative Elements */}
      <View style={styles.bgCircleTop} />
      <View style={styles.bgCircleBottom} />

      <View style={styles.content}>
        {/* Logo Container with Animated Pulse Ring */}
        <View style={styles.logoWrapper}>
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />

          <Animated.View
            style={[
              styles.logoBox,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* Text Container */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={styles.brandTitle}>
            City<Text style={styles.brandTitleAccent}>Fix</Text>
          </Text>
          <Text style={styles.tagline}>Hệ Thống Phản Ánh & Quản Lý Đô Thị</Text>

          {/* Welcome User Badge */}
          <View style={styles.welcomeBadge}>
            <Text style={styles.welcomeLabel}>Xin chào,</Text>
            <Text style={styles.userName}>{user?.fullName || user?.phone || 'Cư dân CityFix'}</Text>
          </View>
        </Animated.View>
      </View>

      {/* Footer Loader */}
      <Animated.View style={[styles.footer, { opacity: textOpacity }]}>
        <ActivityIndicator size="small" color="#f97316" />
        <Text style={styles.loadingText}>Đang chuẩn bị bảng điều khiển...</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 50,
  },
  bgCircleTop: {
    position: 'absolute',
    top: -100,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(249, 115, 22, 0.06)',
  },
  bgCircleBottom: {
    position: 'absolute',
    bottom: -120,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(249, 115, 22, 0.05)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(249, 115, 22, 0.25)',
  },
  logoBox: {
    width: 110,
    height: 110,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  textContainer: {
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  brandTitleAccent: {
    color: '#f97316',
  },
  tagline: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    letterSpacing: 0.2,
    marginBottom: 24,
  },
  welcomeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffedd5',
    gap: 6,
  },
  welcomeLabel: {
    fontSize: 13,
    color: '#9a3412',
    fontWeight: '400',
  },
  userName: {
    fontSize: 14,
    color: '#ea580c',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
});
