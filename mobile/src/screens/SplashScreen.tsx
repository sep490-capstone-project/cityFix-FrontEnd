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
import { Haptics } from '../utils/haptics';

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
    // 1. Logo Scale & Fade in: 700ms
    Animated.parallel([
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 2. Text Fade in & Translate Up: 600ms
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

    // Chuyển sang màn hình chính sau 2.2 giây (đủ để người dùng đọc thông điệp và cảm nhận nhận diện thương hiệu)
    const timer = setTimeout(() => {
      onFinish();
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

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
                transform: [{ scale: logoScale }],
                opacity: logoOpacity,
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
            CITY<Text style={styles.brandAccent}>FIX</Text>
          </Text>
          <View style={styles.taglineBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.brandSubtitle}>HỆ THỐNG ĐÔ THỊ THÔNG MINH</Text>
          </View>
          <Text style={styles.welcomeText}>
            {user?.fullName ? `Xin chào, ${user.fullName}!` : 'Đang kết nối hệ thống đô thị...'}
          </Text>
        </Animated.View>

        {/* Loading Indicator */}
        <Animated.View style={[styles.loadingWrapper, { opacity: textOpacity }]}>
          <ActivityIndicator size="small" color="#EA580C" />
          <Text style={styles.loadingText}>Sẵn sàng tiếp nhận báo cáo...</Text>
        </Animated.View>
      </View>

      {/* Bottom Footer Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>ỨNG DỤNG BÁO CÁO & XỬ LÝ SỰ CỐ ĐÔ THỊ</Text>
        <Text style={styles.versionText}>Phiên bản 1.0.0 · Nền tảng Thành phố Thông minh</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgCircleTop: {
    position: 'absolute',
    top: -height * 0.15,
    right: -width * 0.2,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(234, 88, 12, 0.05)',
  },
  bgCircleBottom: {
    position: 'absolute',
    bottom: -height * 0.1,
    left: -width * 0.2,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: 'rgba(234, 88, 12, 0.03)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 140,
    marginBottom: 24,
  },
  pulseRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: 'rgba(234, 88, 12, 0.2)',
    backgroundColor: 'rgba(234, 88, 12, 0.04)',
  },
  logoBox: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(234, 88, 12, 0.15)',
  },
  logoImage: {
    width: 70,
    height: 70,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 1.5,
  },
  brandAccent: {
    color: '#EA580C',
  },
  taglineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EA580C',
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C2410C',
    letterSpacing: 0.8,
  },
  welcomeText: {
    fontSize: 14,
    color: '#475569',
    marginTop: 14,
    fontWeight: '500',
  },
  loadingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
    gap: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  versionText: {
    fontSize: 10,
    color: '#CBD5E1',
    marginTop: 4,
  },
});
