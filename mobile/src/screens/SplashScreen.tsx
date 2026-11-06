import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Easing,
  StatusBar,
  Dimensions,
} from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Circle,
  G,
} from 'react-native-svg';
import {
  Building2,
  Lightbulb,
  Trees,
  ShieldCheck,
  Navigation,
  Droplets,
  Car,
  Sparkles,
  MapPin,
  Zap,
  Compass,
  Camera,
  Bike,
  Layers,
  Radio,
  Wifi,
  Sun,
  CheckCircle2,
} from 'lucide-react-native';
import { AuthUser } from './LoginScreen';

const { width, height } = Dimensions.get('window');

interface Props {
  user: AuthUser | null;
  onFinish: () => void;
}

// Họa tiết Doodle Đô thị nét mảnh (sử dụng Lucide strokeWidth=1.4 sắc nét, bố trí nghệ thuật quanh tâm)
const URBAN_DOODLES = [
  { Icon: Lightbulb, top: 0.06, left: 0.1, size: 26, rotate: '-16deg', accent: true },
  { Icon: Building2, top: 0.05, left: 0.46, size: 28, rotate: '10deg', accent: false },
  { Icon: Trees, top: 0.07, left: 0.8, size: 26, rotate: '20deg', accent: true },
  { Icon: Compass, top: 0.14, left: 0.24, size: 24, rotate: '-22deg', accent: false },
  { Icon: Navigation, top: 0.14, left: 0.68, size: 24, rotate: '18deg', accent: true },
  { Icon: Droplets, top: 0.22, left: 0.08, size: 25, rotate: '14deg', accent: false },
  { Icon: ShieldCheck, top: 0.22, left: 0.84, size: 26, rotate: '-14deg', accent: true },
  { Icon: Car, top: 0.33, left: 0.09, size: 26, rotate: '-12deg', accent: true },
  { Icon: Zap, top: 0.32, left: 0.84, size: 24, rotate: '22deg', accent: false },
  { Icon: MapPin, top: 0.46, left: 0.06, size: 25, rotate: '16deg', accent: false },
  { Icon: Wifi, top: 0.46, left: 0.87, size: 25, rotate: '-18deg', accent: true },
  { Icon: Bike, top: 0.6, left: 0.08, size: 27, rotate: '-14deg', accent: true },
  { Icon: Layers, top: 0.59, left: 0.84, size: 25, rotate: '15deg', accent: false },
  { Icon: Radio, top: 0.71, left: 0.14, size: 25, rotate: '20deg', accent: false },
  { Icon: Sparkles, top: 0.7, left: 0.78, size: 25, rotate: '-16deg', accent: true },
  { Icon: Camera, top: 0.8, left: 0.09, size: 25, rotate: '-20deg', accent: true },
  { Icon: Building2, top: 0.82, left: 0.47, size: 27, rotate: '8deg', accent: false },
  { Icon: Sun, top: 0.79, left: 0.84, size: 27, rotate: '22deg', accent: true },
  { Icon: Trees, top: 0.9, left: 0.2, size: 25, rotate: '12deg', accent: true },
  { Icon: ShieldCheck, top: 0.91, left: 0.54, size: 25, rotate: '-12deg', accent: false },
  { Icon: MapPin, top: 0.89, left: 0.81, size: 26, rotate: '16deg', accent: true },
];

// Các hạt sáng Bokeh & Lấp lánh (Magical Bokeh & Starlight)
const MAGICAL_BOKEH = [
  { id: 1, left: width * 0.14, top: height * 0.18, size: 10, opacity: 0.35 },
  { id: 2, left: width * 0.84, top: height * 0.16, size: 14, opacity: 0.28 },
  { id: 3, left: width * 0.22, top: height * 0.3, size: 6, opacity: 0.65 },
  { id: 4, left: width * 0.78, top: height * 0.28, size: 7, opacity: 0.6 },
  { id: 5, left: width * 0.1, top: height * 0.48, size: 8, opacity: 0.45 },
  { id: 6, left: width * 0.88, top: height * 0.46, size: 12, opacity: 0.3 },
  { id: 7, left: width * 0.18, top: height * 0.68, size: 7, opacity: 0.55 },
  { id: 8, left: width * 0.82, top: height * 0.65, size: 9, opacity: 0.45 },
  { id: 9, left: width * 0.32, top: height * 0.14, size: 5, opacity: 0.7 },
  { id: 10, left: width * 0.68, top: height * 0.74, size: 6, opacity: 0.55 },
];

// Đường cong Bezier đối xứng tâm (100,100) tuyệt đối — đảm bảo xoay 360 độ đồng tâm 100% với Logo
const SYMMETRIC_BLOB_4_LOBE =
  'M 100,12 C 126,12 138,32 153,47 C 168,62 188,74 188,100 C 188,126 168,138 153,153 C 138,168 126,188 100,188 C 74,188 62,168 47,153 C 32,138 12,126 12,100 C 12,74 32,62 47,47 C 62,32 74,12 100,12 Z';

const SYMMETRIC_BLOB_6_LOBE =
  'M 100,10 C 118,10 126,27 138,34 C 150,41 169,39 178,55 C 187,71 176,84 176,100 C 176,116 187,129 178,145 C 169,161 150,159 138,166 C 126,173 118,190 100,190 C 82,190 74,173 62,166 C 50,159 31,161 22,145 C 13,129 24,116 24,100 C 24,84 13,71 22,55 C 31,39 50,41 62,34 C 74,27 82,10 100,10 Z';

export default function SplashScreen({ user, onFinish }: Props) {
  const [lightStatus, setLightStatus] = useState(false);

  // =========================================================================
  // BIẾN HOẠT ẢNH ĐỒNG TÂM (COAXIAL ANIMATION VALUES)
  // =========================================================================
  // 1. Nền Doodle Đô thị
  const doodleOpacity = useRef(new Animated.Value(0)).current;
  const doodleFloat = useRef(new Animated.Value(0)).current;

  // 2. Khối Chất lỏng Đồng tâm & Logo Medallion (neo tại chính giữa màn hình)
  const coreScale = useRef(new Animated.Value(0.25)).current;
  const coreOpacity = useRef(new Animated.Value(0)).current;
  const coreTranslateY = useRef(new Animated.Value(0)).current;

  const liquidRotate = useRef(new Animated.Value(0)).current;
  const liquidBreath = useRef(new Animated.Value(0)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;

  // Nhãn phụ dưới khối cầu ở Pha 1
  const stage1PillOpacity = useRef(new Animated.Value(0)).current;
  const stage1PillTranslateY = useRef(new Animated.Value(12)).current;

  // 3. Pha 2: Loang tràn toàn màn hình (Liquid Flood) & Lời chào WELCOME
  const floodScale = useRef(new Animated.Value(1)).current;
  const floodOverlayOpacity = useRef(new Animated.Value(0)).current;
  const whiteHaloOpacity = useRef(new Animated.Value(0)).current;

  const welcomeOpacity = useRef(new Animated.Value(0)).current;
  const welcomeTranslateY = useRef(new Animated.Value(26)).current;
  const welcomeScale = useRef(new Animated.Value(0.92)).current;

  const particleOpacity = useRef(new Animated.Value(0)).current;
  const particleDrift = useRef(new Animated.Value(0)).current;

  // 4. Pha 3: 3 lớp sóng lụa trắng (Multi-layer Silk Wave Curtain) dâng lên mượt mà
  const waveBackY = useRef(new Animated.Value(height)).current;
  const waveMidY = useRef(new Animated.Value(height)).current;
  const waveFrontY = useRef(new Animated.Value(height)).current;
  const dockOpacity = useRef(new Animated.Value(0)).current;
  const dockTranslateY = useRef(new Animated.Value(20)).current;
  const screenFadeOut = useRef(new Animated.Value(1)).current;

  const isStaff = (user?.role || '').toUpperCase() === 'STAFF';
  const roleName = isStaff ? 'Đội ngũ Kỹ thuật' : 'Cư dân';
  const displayName = user?.fullName?.trim()
    ? user.fullName.trim()
    : (isStaff ? 'Kỹ thuật viên' : 'Cư dân');

  useEffect(() => {
    // Vòng lặp xoay & thở liên tục của 3 lớp sóng chất lỏng đồng tâm
    const rotateLoop = Animated.loop(
      Animated.timing(liquidRotate, {
        toValue: 1,
        duration: 7500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(liquidBreath, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(liquidBreath, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const rippleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(rippleAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rippleAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    const doodleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(doodleFloat, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(doodleFloat, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    rotateLoop.start();
    breathLoop.start();
    rippleLoop.start();
    doodleLoop.start();

    // =========================================================================
    // PHA 1 (0ms -> 1500ms): Khối chất lỏng 3 lớp & Logo bung nở ĐỒNG TÂM 100%
    // =========================================================================
    Animated.parallel([
      Animated.timing(doodleOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(coreScale, {
        toValue: 1,
        speed: 10,
        bounciness: 8,
        useNativeDriver: true,
      }),
      Animated.timing(coreOpacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(stage1PillOpacity, {
        toValue: 1,
        duration: 500,
        delay: 350,
        useNativeDriver: true,
      }),
      Animated.timing(stage1PillTranslateY, {
        toValue: 0,
        duration: 500,
        delay: 350,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();

    // =========================================================================
    // PHA 2 (1500ms -> 3250ms): Loang tràn toàn màn hình & Hiện WELCOME kỳ ảo
    // =========================================================================
    const floodTimer = setTimeout(() => {
      setLightStatus(true);

      Animated.parallel([
        // Ẩn pill Pha 1
        Animated.timing(stage1PillOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        // Phóng đại khối chất lỏng từ đúng tâm của Logo ra toàn màn hình
        Animated.timing(floodScale, {
          toValue: 15,
          duration: 820,
          easing: Easing.bezier(0.33, 1, 0.68, 1),
          useNativeDriver: true,
        }),
        // Lớp phủ cam toàn màn hình đảm bảo kín 100% cả góc trên cùng StatusBar
        Animated.timing(floodOverlayOpacity, {
          toValue: 1,
          duration: 650,
          delay: 150,
          useNativeDriver: true,
        }),
        // Bật hào quang trắng đồng tâm quanh Logo trên nền cam
        Animated.timing(whiteHaloOpacity, {
          toValue: 1,
          duration: 500,
          delay: 200,
          useNativeDriver: true,
        }),
        // Đưa khối Logo đồng tâm lướt nhẹ lên trên để nhường chỗ cho WELCOME
        Animated.timing(coreTranslateY, {
          toValue: -76,
          duration: 750,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
        // Hiện khối WELCOME + Tên người dùng (hiển thị rõ ràng suốt ~1.5 giây)
        Animated.timing(welcomeOpacity, {
          toValue: 1,
          duration: 580,
          delay: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(welcomeTranslateY, {
          toValue: 0,
          duration: 620,
          delay: 260,
          easing: Easing.out(Easing.back(1.3)),
          useNativeDriver: true,
        }),
        Animated.spring(welcomeScale, {
          toValue: 1,
          speed: 11,
          bounciness: 6,
          delay: 260,
          useNativeDriver: true,
        }),
        // Hạt sáng Bokeh & Sao lấp lánh bay lên
        Animated.timing(particleOpacity, {
          toValue: 1,
          duration: 600,
          delay: 220,
          useNativeDriver: true,
        }),
        Animated.timing(particleDrift, {
          toValue: -36,
          duration: 2400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }, 1500);

    // =========================================================================
    // PHA 3 (3250ms -> 4500ms): 3 Lớp Sóng Lụa Trắng Dâng Lên Hài Hòa
    // =========================================================================
    const waveTimer = setTimeout(() => {
      Animated.parallel([
        // Sóng lụa lớp 1 (mờ phía sau)
        Animated.timing(waveBackY, {
          toValue: height * 0.42,
          duration: 780,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
        // Sóng lụa lớp 2 (trung gian)
        Animated.timing(waveMidY, {
          toValue: height * 0.45,
          duration: 800,
          delay: 40,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
        // Sóng lụa lớp 3 (chính diện) dâng lên đến tỷ lệ vàng (50% màn hình), giữ chữ WELCOME ở nửa trên!
        Animated.timing(waveFrontY, {
          toValue: height * 0.48,
          duration: 820,
          delay: 80,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
        // Đẩy nhẹ Logo & Welcome lên một nhịp cân đối ở nửa trên nền cam
        Animated.timing(coreTranslateY, {
          toValue: -118,
          duration: 780,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
        Animated.timing(welcomeTranslateY, {
          toValue: -38,
          duration: 780,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
        // Hiện thanh trạng thái thông minh trên mặt sóng trắng
        Animated.timing(dockOpacity, {
          toValue: 1,
          duration: 500,
          delay: 240,
          useNativeDriver: true,
        }),
        Animated.timing(dockTranslateY, {
          toValue: 0,
          duration: 520,
          delay: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, 3150);

    // Nhịp kết (4150ms -> 4500ms): Chuyển cảnh mượt mà sang Trang chủ
    const fadeOutTimer = setTimeout(() => {
      Animated.timing(screenFadeOut, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }, 4180);

    const finishTimer = setTimeout(() => {
      onFinish();
    }, 4500);

    return () => {
      rotateLoop.stop();
      breathLoop.stop();
      rippleLoop.stop();
      doodleLoop.stop();
      clearTimeout(floodTimer);
      clearTimeout(waveTimer);
      clearTimeout(fadeOutTimer);
      clearTimeout(finishTimer);
    };
  }, []);

  // Nội suy góc xoay & nhịp thở đồng tâm
  const spinCW = liquidRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const spinCCW = liquidRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  const spinSlowCW = liquidRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['45deg', '405deg'],
  });

  const breathScaleOuter = liquidBreath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.08],
  });

  const breathScaleInner = liquidBreath.interpolate({
    inputRange: [0, 1],
    outputRange: [1.05, 0.96],
  });

  const rippleScale = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1.48],
  });

  const rippleOpacity = rippleAnim.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.45, 0.15, 0],
  });

  const doodleY = doodleFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [-7, 7],
  });

  return (
    <Animated.View style={[styles.container, { opacity: screenFadeOut }]}>
      <StatusBar barStyle={lightStatus ? 'light-content' : 'dark-content'} />

      {/* =====================================================================
          LỚP 1: NỀN HỌA TIẾT ĐÔ THỊ NÉT MẢNH (LUCIDE URBAN DOODLE CANVAS)
         ===================================================================== */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fullOverlay,
          {
            opacity: doodleOpacity,
            transform: [{ translateY: doodleY }],
          },
        ]}
      >
        {URBAN_DOODLES.map((item, index) => {
          const IconComponent = item.Icon;
          return (
            <View
              key={index}
              style={[
                styles.doodleItem,
                {
                  top: height * item.top,
                  left: width * item.left,
                  transform: [{ rotate: item.rotate }],
                },
              ]}
            >
              <IconComponent
                size={item.size}
                color={item.accent ? '#ea580c' : '#64748b'}
                strokeWidth={1.4}
                style={{ opacity: item.accent ? 0.16 : 0.11 }}
              />
            </View>
          );
        })}
      </Animated.View>

      {/* =====================================================================
          LỚP 2: LỚP PHỦ GRADIENT TOÀN MÀN HÌNH KHI LOANG TRÀN (PHA 2 & 3)
          Đảm bảo phủ kín 100% cả vùng tai thỏ/StatusBar không bị hở viền trắng
         ===================================================================== */}
      <Animated.View
        pointerEvents="none"
        style={[styles.fullOverlay, { opacity: floodOverlayOpacity }]}
      >
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Defs>
            <LinearGradient id="fullFloodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#fb923c" />
              <Stop offset="45%" stopColor="#f97316" />
              <Stop offset="100%" stopColor="#c2410c" />
            </LinearGradient>
            <RadialGradient id="centerGlowGrad" cx="50%" cy="38%" r="60%">
              <Stop offset="0%" stopColor="#ffedd5" stopOpacity="0.28" />
              <Stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Path d={`M0,0 H${width} V${height} H0 Z`} fill="url(#fullFloodGrad)" />
          <Path d={`M0,0 H${width} V${height} H0 Z`} fill="url(#centerGlowGrad)" />
        </Svg>
      </Animated.View>

      {/* =====================================================================
          LỚP 3: HẠT SÁNG BOKEH & ÁNH SAO KỲ ẢO (MAGICAL BOKEH & STARLIGHT)
         ===================================================================== */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fullOverlay,
          {
            opacity: particleOpacity,
            transform: [{ translateY: particleDrift }],
          },
        ]}
      >
        {MAGICAL_BOKEH.map((b) => (
          <View
            key={b.id}
            style={{
              position: 'absolute',
              left: b.left,
              top: b.top,
              width: b.size,
              height: b.size,
              borderRadius: b.size / 2,
              backgroundColor: `rgba(255, 255, 255, ${b.opacity})`,
              shadowColor: '#ffffff',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 6,
            }}
          />
        ))}
        <View style={{ position: 'absolute', top: height * 0.2, left: width * 0.8 }}>
          <Sparkles size={18} color="rgba(255,255,255,0.75)" strokeWidth={1.8} />
        </View>
        <View style={{ position: 'absolute', top: height * 0.28, left: width * 0.14 }}>
          <Sparkles size={15} color="rgba(255,237,213,0.8)" strokeWidth={1.8} />
        </View>
        <View style={{ position: 'absolute', top: height * 0.42, left: width * 0.84 }}>
          <Sparkles size={14} color="rgba(255,255,255,0.6)" strokeWidth={1.8} />
        </View>
      </Animated.View>

      {/* =====================================================================
          LỚP 4: TRUNG TÂM ĐỒNG TÂM TUYỆT ĐỐI (COAXIAL NESTED LIQUID & LOGO)
          Tất cả các lớp Blob, Vòng Aura và Viên ngọc Logo đều chung 1 gốc (0,0)
         ===================================================================== */}
      <View style={styles.coaxialAnchor} pointerEvents="none">
        <Animated.View
          style={[
            styles.coaxialCoreGroup,
            {
              opacity: coreOpacity,
              transform: [
                { translateY: coreTranslateY },
                { scale: coreScale },
              ],
            },
          ]}
        >
          {/* Vòng sóng lan tỏa (Radar Ripple Ring) ở Pha 1 */}
          <Animated.View
            style={[
              styles.coaxialLayer,
              {
                width: 220,
                height: 220,
                borderRadius: 110,
                borderWidth: 1.5,
                borderColor: '#fb923c',
                opacity: rippleOpacity,
                transform: [{ scale: rippleScale }],
              },
            ]}
          />

          {/* Khối chất lỏng Phóng đại Loang tràn (Coaxial Flood Carrier) */}
          <Animated.View
            style={[
              styles.coaxialLayer,
              {
                transform: [
                  { scale: floodScale },
                  { rotate: spinCW },
                ],
              },
            ]}
          >
            <Svg width={220} height={220} viewBox="0 0 200 200">
              <Defs>
                <LinearGradient id="blobGradOuter" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#fdba74" />
                  <Stop offset="50%" stopColor="#fb923c" />
                  <Stop offset="100%" stopColor="#ea580c" />
                </LinearGradient>
              </Defs>
              <Path d={SYMMETRIC_BLOB_6_LOBE} fill="url(#blobGradOuter)" opacity={0.35} />
            </Svg>
          </Animated.View>

          {/* Lớp Chất lỏng Hữu cơ 2 (Xoay ngược chiều kim đồng hồ - 6 cánh mềm) */}
          <Animated.View
            style={[
              styles.coaxialLayer,
              {
                transform: [
                  { scale: Animated.multiply(breathScaleOuter, floodScale) },
                  { rotate: spinCCW },
                ],
              },
            ]}
          >
            <Svg width={204} height={204} viewBox="0 0 200 200">
              <Defs>
                <LinearGradient id="blobGradMid" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#fb923c" />
                  <Stop offset="100%" stopColor="#ea580c" />
                </LinearGradient>
              </Defs>
              <Path d={SYMMETRIC_BLOB_6_LOBE} fill="url(#blobGradMid)" opacity={0.65} />
            </Svg>
          </Animated.View>

          {/* Lớp Chất lỏng Hữu cơ 1 (Xoay thuận chiều - 4 cánh ôm sát viên ngọc Logo) */}
          <Animated.View
            style={[
              styles.coaxialLayer,
              {
                transform: [
                  { scale: Animated.multiply(breathScaleInner, floodScale) },
                  { rotate: spinSlowCW },
                ],
              },
            ]}
          >
            <Svg width={190} height={190} viewBox="0 0 200 200">
              <Defs>
                <LinearGradient id="blobGradInner" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#f97316" />
                  <Stop offset="100%" stopColor="#c2410c" />
                </LinearGradient>
              </Defs>
              <Path d={SYMMETRIC_BLOB_4_LOBE} fill="url(#blobGradInner)" />
            </Svg>
          </Animated.View>

          {/* Hào quang lụa trắng đồng tâm (hiện lên ở Pha 2 khi nền đã chuyển sang cam) */}
          <Animated.View
            style={[
              styles.coaxialLayer,
              styles.whiteOuterHalo,
              {
                opacity: whiteHaloOpacity,
                transform: [{ scale: breathScaleOuter }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.coaxialLayer,
              styles.whiteInnerHalo,
              {
                opacity: whiteHaloOpacity,
                transform: [{ scale: breathScaleInner }],
              },
            ]}
          />

          {/* Vòng quỹ đạo nét đứt xoay quanh Logo (Orbital Ring) */}
          <Animated.View
            style={[
              styles.coaxialLayer,
              {
                transform: [{ rotate: spinCW }],
              },
            ]}
          >
            <Svg width={164} height={164} viewBox="0 0 164 164">
              <Circle
                cx="82"
                cy="82"
                r="76"
                stroke="rgba(255, 255, 255, 0.55)"
                strokeWidth="1.5"
                strokeDasharray="8 6"
                fill="none"
              />
              <Circle cx="82" cy="6" r="4" fill="#ffffff" />
              <Circle cx="82" cy="158" r="3" fill="#ffedd5" />
            </Svg>
          </Animated.View>

          {/* VIÊN NGỌC TRÒN ĐỒNG TÂM CHỨA LOGO CITYFIX (Circular Medallion)
              Bọc tròn hoàn hảo giúp nền trắng của logo.png hòa quyện tuyệt đối với các lớp sóng! */}
          <View style={styles.logoMedallion}>
            <Image
              source={require('../../assets/logo-optimized.png')}
              fadeDuration={0}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <View style={styles.logoInnerRim} />
          </View>
        </Animated.View>

        {/* Nhãn giới thiệu ở Pha 1 (nằm độc lập bên dưới để KHÔNG làm lệch tâm Logo) */}
        <Animated.View
          style={[
            styles.stage1CaptionWrap,
            {
              opacity: stage1PillOpacity,
              transform: [{ translateY: stage1PillTranslateY }],
            },
          ]}
        >
          <View style={styles.stage1Pill}>
            <View style={styles.stage1Dot} />
            <Text style={styles.stage1PillText}>PHẢN ÁNH ĐÔ THỊ THÔNG MINH</Text>
          </View>
        </Animated.View>

        {/* KHỐI CHỮ "WELCOME" KỲ ẢO Ở PHA 2 & 3 (Độc lập tọa độ, căn giữa hoàn hảo) */}
        <Animated.View
          style={[
            styles.welcomeFloatingWrap,
            {
              opacity: welcomeOpacity,
              transform: [
                { translateY: welcomeTranslateY },
                { scale: welcomeScale },
              ],
            },
          ]}
        >
          <Text style={styles.welcomeTitle}>XIN CHÀO</Text>

          <View style={styles.welcomeOrnamentRow}>
            <View style={styles.welcomeOrnamentLine} />
            <Sparkles size={14} color="#ffedd5" strokeWidth={2} />
            <View style={styles.welcomeOrnamentLine} />
          </View>

          <View style={styles.userGreetingPill}>
            <Text style={styles.userGreetingSub}>{roleName}</Text>
            <Text style={styles.userGreetingName} numberOfLines={1}>
              {displayName}
            </Text>
          </View>

          <Text style={styles.welcomeMotto}>
            CÙNG KIẾN TẠO ĐÔ THỊ VĂN MINH
          </Text>
        </Animated.View>
      </View>

      {/* =====================================================================
          LỚP 5: 3 LỚP SÓNG LỤA TRẮNG DÂNG LÊN (MULTI-LAYER SILK WAVE CURTAIN)
         ===================================================================== */}
      {/* Sóng lụa lớp 1 (Mờ sâu phía sau) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.waveSheetWrap,
          {
            transform: [{ translateY: waveBackY }],
            opacity: 0.25,
          },
        ]}
      >
        <Svg width={width} height={120} viewBox={`0 0 ${width} 120`} style={styles.waveSvgTop}>
          <Path
            d={`M0,65 C${width * 0.32},120 ${width * 0.68},5 ${width},55 L${width},120 L0,120 Z`}
            fill="#ffffff"
          />
        </Svg>
        <View style={[styles.waveSheetFill, { backgroundColor: '#ffffff' }]} />
      </Animated.View>

      {/* Sóng lụa lớp 2 (Lớp sóng ngọc trai trung gian) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.waveSheetWrap,
          {
            transform: [{ translateY: waveMidY }],
            opacity: 0.5,
          },
        ]}
      >
        <Svg width={width} height={120} viewBox={`0 0 ${width} 120`} style={styles.waveSvgTop}>
          <Path
            d={`M0,45 C${width * 0.28},5 ${width * 0.64},110 ${width},40 L${width},120 L0,120 Z`}
            fill="#fff7ed"
          />
        </Svg>
        <View style={[styles.waveSheetFill, { backgroundColor: '#fff7ed' }]} />
      </Animated.View>

      {/* Sóng lụa lớp 3 (Lớp sóng chính chứa Dock Trạng thái Đô thị Số) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.waveSheetWrap,
          {
            transform: [{ translateY: waveFrontY }],
          },
        ]}
      >
        <Svg width={width} height={125} viewBox={`0 0 ${width} 125`} style={styles.waveSvgTop}>
          <Path
            d={`M0,60 C${width * 0.26},0 ${width * 0.72},115 ${width},38 L${width},125 L0,125 Z`}
            fill="#f8fafc"
          />
          <Circle cx={width * 0.24} cy={18} r={5.5} fill="#ffffff" opacity={0.9} />
          <Circle cx={width * 0.76} cy={26} r={4} fill="#ffffff" opacity={0.75} />
        </Svg>

        <View style={styles.waveSheetFill}>
          <Animated.View
            style={[
              styles.smartCityDock,
              {
                opacity: dockOpacity,
                transform: [{ translateY: dockTranslateY }],
              },
            ]}
          >
            <View style={styles.dockHeaderBadge}>
              <View style={styles.dockPulseDot} />
              <Text style={styles.dockHeaderText}>HỆ THỐNG ĐÃ SẴN SÀNG</Text>
            </View>

            <Text style={styles.dockMainTitle}>
              Không gian phản ánh đô thị số sẵn sàng
            </Text>

            <View style={styles.dockFeaturesRow}>
              <View style={styles.dockFeatureChip}>
                <CheckCircle2 size={14} color="#16a34a" strokeWidth={2.4} />
                <Text style={styles.dockFeatureText}>Định vị GPS</Text>
              </View>
              <View style={styles.dockFeatureChip}>
                <CheckCircle2 size={14} color="#ea580c" strokeWidth={2.4} />
                <Text style={styles.dockFeatureText}>AI Vision</Text>
              </View>
              <View style={styles.dockFeatureChip}>
                <CheckCircle2 size={14} color="#2563eb" strokeWidth={2.4} />
                <Text style={styles.dockFeatureText}>Minh bạch 100%</Text>
              </View>
            </View>
          </Animated.View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffbf7',
    overflow: 'hidden',
  },
  fullOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  doodleItem: {
    position: 'absolute',
    padding: 4,
  },
  // Neo tọa độ chính giữa màn hình tuyệt đối
  coaxialAnchor: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  // Nhóm đồng tâm: có kích thước cố định 240x240 để mọi phần tử con có tâm tại (120, 120)
  coaxialCoreGroup: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coaxialLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whiteOuterHalo: {
    width: 196,
    height: 196,
    borderRadius: 98,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  whiteInnerHalo: {
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  // Viên ngọc tròn hoàn hảo (136x136, borderRadius 68) ôm khít logo.png đồng tâm với các lớp sóng
  logoMedallion: {
    position: 'absolute',
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 10,
    shadowColor: '#7c2d12',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 14,
  },
  logoImage: {
    width: 106,
    height: 106,
  },
  logoInnerRim: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 64,
    borderWidth: 1.5,
    borderColor: 'rgba(251, 146, 60, 0.28)',
  },
  stage1CaptionWrap: {
    position: 'absolute',
    top: height * 0.5 + 128,
    alignItems: 'center',
  },
  stage1Pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fed7aa',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  stage1Dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#ea580c',
  },
  stage1PillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#c2410c',
    letterSpacing: 1.4,
  },
  // Khối chữ WELCOME đặt bằng position: 'absolute' ngay dưới viên ngọc Logo đã trượt lên
  welcomeFloatingWrap: {
    position: 'absolute',
    top: height * 0.5 + 22,
    width: width - 40,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(124, 45, 18, 0.28)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  welcomeOrnamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 8,
  },
  welcomeOrnamentLine: {
    width: 42,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 237, 213, 0.65)',
  },
  userGreetingPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 9,
    alignItems: 'center',
    marginTop: 4,
    minWidth: 220,
  },
  userGreetingSub: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#ffedd5',
    letterSpacing: 1.8,
  },
  userGreetingName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  welcomeMotto: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 237, 213, 0.9)',
    letterSpacing: 1.8,
    marginTop: 12,
    textAlign: 'center',
  },
  // Hệ thống 3 lớp sóng lụa
  waveSheetWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: height * 1.2,
    zIndex: 20,
  },
  waveSvgTop: {
    marginBottom: -2,
  },
  waveSheetFill: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    paddingTop: 22,
    paddingHorizontal: 24,
  },
  smartCityDock: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffedd5',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  dockHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  dockPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ea580c',
  },
  dockHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ea580c',
    letterSpacing: 1.2,
  },
  dockMainTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 10,
    marginBottom: 12,
  },
  dockFeaturesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  dockFeatureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dockFeatureText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
});
