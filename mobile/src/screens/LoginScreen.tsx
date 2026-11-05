import React, { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
  Easing,
  Keyboard,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiError, login, getProfile, UserProfile, decodeJwt } from '../api';

export interface AuthUser {
  userId: string;
  fullName: string;
  phone: string;
  email: string;
  ward: string;
  address?: string;
  province?: string;
  role?: 'STAFF' | 'CITIZEN' | 'MANAGER' | 'ADMIN' | string;
  departmentId?: string;
}

interface Props {
  navigate?: (screen: string) => void;
  onLogin?: (user: AuthUser, token: string) => void;
}

const FEATURE_PILLS = [
  { icon: 'flash', label: 'Báo cáo 30s' },
  { icon: 'location', label: 'Định vị GPS' },
  { icon: 'shield-checkmark', label: 'Xử lý minh bạch' },
] as const;

const EMAIL_DOMAINS = ['@gmail.com', '@icloud.com', '@outlook.com', '@edu.vn'];
const LAST_EMAIL_STORAGE_KEY = '@cityfix_last_login_email';

export default function LoginScreen({ navigate, onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [rememberedEmail, setRememberedEmail] = useState<string>('');

  const emailInputRef = useRef<any>(null);
  const pwInputRef = useRef<any>(null);

  // 1. Floating Ambient Orbs & Breathing Logo Ring
  const orb1Anim = useRef(new Animated.Value(0)).current;
  const orb2Anim = useRef(new Animated.Value(0)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;

  // 2. Staggered Entrance Animations (5 sections)
  const staggerAnims = useRef(
    Array.from({ length: 5 }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(20),
    }))
  ).current;

  // 3. Input Focus Icon Scale Animations
  const emailIconScale = useRef(new Animated.Value(1)).current;
  const pwIconScale = useRef(new Animated.Value(1)).current;

  // 4. Spring Button Scale Animation
  const btnScale = useRef(new Animated.Value(1)).current;

  // 5. iOS-style Error Shake Animation
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Load remembered email from previous login
    AsyncStorage.getItem(LAST_EMAIL_STORAGE_KEY)
      .then((saved) => {
        if (saved && saved.trim()) {
          setRememberedEmail(saved.trim());
        }
      })
      .catch(() => {});

    // Start Staggered Entrance
    const animations = staggerAnims.map((item) =>
      Animated.parallel([
        Animated.timing(item.opacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(item.translateY, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );
    Animated.stagger(65, animations).start();

    // Floating Orb 1 Loop
    const orb1Loop = Animated.loop(
      Animated.sequence([
        Animated.timing(orb1Anim, {
          toValue: 1,
          duration: 3600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(orb1Anim, {
          toValue: 0,
          duration: 3600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Floating Orb 2 Loop
    const orb2Loop = Animated.loop(
      Animated.sequence([
        Animated.timing(orb2Anim, {
          toValue: 1,
          duration: 4400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(orb2Anim, {
          toValue: 0,
          duration: 4400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Breathing Logo Pulse Ring
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, {
          toValue: 1.09,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(logoPulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    orb1Loop.start();
    orb2Loop.start();
    pulseLoop.start();

    return () => {
      orb1Loop.stop();
      orb2Loop.stop();
      pulseLoop.stop();
    };
  }, []);

  const handleFocusField = (field: 'email' | 'password') => {
    setFocusedField(field);
    const targetAnim = field === 'email' ? emailIconScale : pwIconScale;
    Animated.sequence([
      Animated.spring(targetAnim, {
        toValue: 1.2,
        speed: 28,
        bounciness: 12,
        useNativeDriver: true,
      }),
      Animated.spring(targetAnim, {
        toValue: 1.1,
        speed: 24,
        bounciness: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleBlurField = (field: 'email' | 'password') => {
    setFocusedField((prev) => (prev === field ? null : prev));
    const targetAnim = field === 'email' ? emailIconScale : pwIconScale;
    Animated.spring(targetAnim, {
      toValue: 1,
      speed: 24,
      bounciness: 6,
      useNativeDriver: true,
    }).start();
  };

  const handleSelectRememberedEmail = () => {
    if (!rememberedEmail) return;
    setEmail(rememberedEmail);
    setError('');
    setTimeout(() => {
      pwInputRef.current?.focus();
    }, 80);
  };

  const handleClearRememberedEmail = async () => {
    setRememberedEmail('');
    try {
      await AsyncStorage.removeItem(LAST_EMAIL_STORAGE_KEY);
    } catch {}
  };

  const handleSelectDomain = (domain: string) => {
    const prefix = email.split('@')[0].trim();
    if (!prefix) return;
    setEmail(`${prefix}${domain}`);
    setError('');
  };

  const triggerErrorShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 9, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -9, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleBtnPressIn = () => {
    Animated.spring(btnScale, {
      toValue: 0.96,
      speed: 35,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  };

  const handleBtnPressOut = () => {
    Animated.spring(btnScale, {
      toValue: 1,
      speed: 22,
      bounciness: 10,
      useNativeDriver: true,
    }).start();
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    setError('');

    if (!email.trim()) {
      setError('Vui lòng nhập địa chỉ email của bạn.');
      triggerErrorShake();
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu đăng nhập.');
      triggerErrorShake();
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);

      // Lưu access token & email đăng nhập gần nhất
      await AsyncStorage.setItem('accessToken', result.accessToken);
      try {
        await AsyncStorage.setItem(LAST_EMAIL_STORAGE_KEY, email.trim());
      } catch {}

      console.log('✅ Access token saved:', result.accessToken);

      // Lấy thông tin profile chính xác từ server
      let profile: UserProfile | null = null;
      try {
        profile = await getProfile(result.accessToken);
      } catch (profileErr) {
        console.warn('⚠️ Lỗi khi tải profile ngay sau đăng nhập:', profileErr);
      }

      // Giải mã JWT để xác định role chính xác (STAFF / CITIZEN / ...)
      const decoded = decodeJwt(result.accessToken);
      const rawRoleCandidate =
        result.role ||
        profile?.roleName ||
        decoded?.role ||
        (Array.isArray(decoded?.roles) ? decoded.roles[0] : decoded?.roles) ||
        decoded?.roleName ||
        (Array.isArray(decoded?.authorities) ? decoded.authorities[0] : decoded?.authorities) ||
        decoded?.scope ||
        '';
      const upperRole = String(rawRoleCandidate).toUpperCase();
      const resolvedRole = upperRole.includes('STAFF')
        ? 'STAFF'
        : upperRole.includes('MANAGER')
        ? 'MANAGER'
        : upperRole.includes('ADMIN')
        ? 'ADMIN'
        : 'CITIZEN';

      const formattedUser: AuthUser = {
        userId: profile?.userId || decoded?.userId || decoded?.sub || email.trim(),
        fullName: profile?.fullName?.trim() || email.trim().split('@')[0],
        phone: profile?.phoneNumber?.trim() || '',
        email: profile?.email?.trim() || email.trim(),
        ward: profile?.ward?.trim() || '',
        address: profile?.address?.trim() || '',
        province: profile?.province?.trim() || '',
        role: resolvedRole,
        departmentId: profile?.departmentId,
      };

      // Lưu trữ phiên đăng nhập để tự động khôi phục
      try {
        await AsyncStorage.setItem('@cityfix_auth_user', JSON.stringify(formattedUser));
      } catch (storageErr) {
        console.warn('⚠️ Lỗi lưu session người dùng:', storageErr);
      }

      onLogin?.(formattedUser, result.accessToken);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.',
      );
      triggerErrorShake();
    } finally {
      setLoading(false);
    }
  };

  const orb1TranslateY = orb1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 14],
  });
  const orb1Scale = orb1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  const orb2TranslateY = orb2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [12, -12],
  });
  const orb2Scale = orb2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.08, 0.96],
  });

  const emailPrefix = email.split('@')[0].trim();
  const showDomainSuggestions =
    emailPrefix.length > 0 && (focusedField === 'email' || !email.includes('.'));

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Decorative Stripe Bar */}
        <View style={styles.topAccentBar} />

        {/* 1. Hero Logo Banner Section with Floating Ambient Orbs */}
        <Animated.View
          style={[
            styles.heroSection,
            {
              opacity: staggerAnims[0].opacity,
              transform: [{ translateY: staggerAnims[0].translateY }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.decorCircle1,
              {
                transform: [{ translateY: orb1TranslateY }, { scale: orb1Scale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.decorCircle2,
              {
                transform: [{ translateY: orb2TranslateY }, { scale: orb2Scale }],
              },
            ]}
          />
          <View style={styles.decorCircle3} />

          {/* Official CityFix Logo with Breathing Glow Ring */}
          <View style={styles.logoOuterContainer}>
            <Animated.View
              style={[
                styles.logoPulseRing,
                {
                  transform: [{ scale: logoPulse }],
                },
              ]}
            />
            <View style={styles.logoCard}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </View>

          <View style={styles.taglineBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.taglineText}>NỀN TẢNG HẠ TẦNG ĐÔ THỊ THÔNG MINH</Text>
          </View>

          {/* Feature Highlight Pills */}
          <View style={styles.featurePillsRow}>
            {FEATURE_PILLS.map((pill) => (
              <View key={pill.label} style={styles.featurePill}>
                <Ionicons name={pill.icon as any} size={11} color="#ea580c" />
                <Text style={styles.featurePillText}>{pill.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* 2. Form Container Card with Error Shake */}
        <Animated.View
          style={[
            styles.formCard,
            {
              transform: [{ translateX: shakeAnim }],
            },
          ]}
        >
          {/* Card Header */}
          <Animated.View
            style={{
              opacity: staggerAnims[1].opacity,
              transform: [{ translateY: staggerAnims[1].translateY }],
            }}
          >
            <View style={styles.formHeaderRow}>
              <View style={styles.orangeIndicator} />
              <Text style={styles.formTitle}>ĐĂNG NHẬP</Text>
            </View>
            <Text style={styles.formSubtitle}>
              Chào mừng trở lại! Đăng nhập để gửi và theo dõi phản ánh đô thị.
            </Text>
          </Animated.View>

          {/* Remembered Account Quick-Fill Card */}
          {rememberedEmail && email.trim().toLowerCase() !== rememberedEmail.toLowerCase() ? (
            <View style={styles.rememberedCard}>
              <TouchableOpacity
                style={styles.rememberedMainTouch}
                onPress={handleSelectRememberedEmail}
                activeOpacity={0.75}
              >
                <View style={styles.rememberedAvatar}>
                  <Ionicons name="person" size={14} color="#ea580c" />
                </View>
                <View style={{ flex: 1, paddingRight: 6 }}>
                  <Text style={styles.rememberedHint}>Tài khoản đăng nhập gần đây</Text>
                  <Text style={styles.rememberedEmailText} numberOfLines={1}>
                    {rememberedEmail}
                  </Text>
                </View>
                <View style={styles.rememberedUseBadge}>
                  <Ionicons name="flash" size={11} color="#ea580c" />
                  <Text style={styles.rememberedUseText}>Chạm để điền</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleClearRememberedEmail}
                style={styles.rememberedRemoveBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={15} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Error Alert Banner */}
          {error ? (
            <View style={styles.errorBox}>
              <View style={styles.errorIconWrap}>
                <Ionicons name="alert-circle" size={18} color="#dc2626" />
              </View>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Email Input Field with Single-Tap Focus & Smart Domain Chips */}
          <Animated.View
            style={[
              styles.fieldGroup,
              {
                opacity: staggerAnims[2].opacity,
                transform: [{ translateY: staggerAnims[2].translateY }],
              },
            ]}
          >
            <View style={styles.labelRow}>
              <Text
                style={[
                  styles.label,
                  focusedField === 'email' && styles.labelFocused,
                ]}
              >
                ĐỊA CHỈ EMAIL <Text style={styles.requiredStar}>*</Text>
              </Text>
              {focusedField === 'email' ? (
                <View style={styles.activeFieldBadge}>
                  <Text style={styles.activeFieldBadgeText}>Đang nhập</Text>
                </View>
              ) : null}
            </View>

            <Pressable
              onPress={() => emailInputRef.current?.focus()}
              style={[
                styles.inputWrapper,
                focusedField === 'email' && styles.inputWrapperFocused,
                error && !email.trim() ? styles.inputWrapperError : null,
              ]}
            >
              <Animated.View
                style={[
                  styles.inputIconWrap,
                  focusedField === 'email' && styles.inputIconWrapFocused,
                  { transform: [{ scale: emailIconScale }] },
                ]}
              >
                <Ionicons
                  name={focusedField === 'email' ? 'mail' : 'mail-outline'}
                  size={17}
                  color={focusedField === 'email' ? '#ea580c' : '#64748b'}
                />
              </Animated.View>

              <TextInput
                ref={emailInputRef}
                style={styles.input}
                placeholder="example@email.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                autoComplete="off"
                textContentType="none"
                importantForAutofill="no"
                value={email}
                onFocus={() => handleFocusField('email')}
                onBlur={() => handleBlurField('email')}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError('');
                }}
              />

              {email.length > 0 ? (
                <TouchableOpacity
                  onPress={() => {
                    setEmail('');
                    emailInputRef.current?.focus();
                  }}
                  style={styles.clearIconBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={18} color="#cbd5e1" />
                </TouchableOpacity>
              ) : null}
            </Pressable>

            {/* 1-Tap Smart Email Domain Suggestions */}
            {showDomainSuggestions ? (
              <View style={styles.domainChipsWrap}>
                {EMAIL_DOMAINS.map((domain) => {
                  const candidate = `${emailPrefix}${domain}`;
                  const isSelected = email.trim().toLowerCase() === candidate.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={domain}
                      style={[
                        styles.domainChip,
                        isSelected && styles.domainChipActive,
                      ]}
                      onPress={() => handleSelectDomain(domain)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'at'}
                        size={12}
                        color={isSelected ? '#ea580c' : '#64748b'}
                      />
                      <Text
                        style={[
                          styles.domainChipText,
                          isSelected && styles.domainChipTextActive,
                        ]}
                      >
                        {domain.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </Animated.View>

          {/* Password Input Field with Single-Tap Focus & Red Required Star */}
          <Animated.View
            style={[
              styles.fieldGroup,
              {
                opacity: staggerAnims[3].opacity,
                transform: [{ translateY: staggerAnims[3].translateY }],
              },
            ]}
          >
            <View style={styles.labelRow}>
              <Text
                style={[
                  styles.label,
                  focusedField === 'password' && styles.labelFocused,
                ]}
              >
                MẬT KHẨU <Text style={styles.requiredStar}>*</Text>
              </Text>
              {focusedField === 'password' ? (
                <View style={styles.activeFieldBadge}>
                  <Text style={styles.activeFieldBadgeText}>Bảo mật</Text>
                </View>
              ) : null}
            </View>

            <Pressable
              onPress={() => pwInputRef.current?.focus()}
              style={[
                styles.inputWrapper,
                focusedField === 'password' && styles.inputWrapperFocused,
                error && !password ? styles.inputWrapperError : null,
              ]}
            >
              <Animated.View
                style={[
                  styles.inputIconWrap,
                  focusedField === 'password' && styles.inputIconWrapFocused,
                  { transform: [{ scale: pwIconScale }] },
                ]}
              >
                <Ionicons
                  name={focusedField === 'password' ? 'lock-closed' : 'lock-closed-outline'}
                  size={17}
                  color={focusedField === 'password' ? '#ea580c' : '#64748b'}
                />
              </Animated.View>

              <TextInput
                ref={pwInputRef}
                style={styles.input}
                placeholder="Nhập mật khẩu của bạn"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPw}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                autoComplete="off"
                textContentType="oneTimeCode"
                importantForAutofill="no"
                value={password}
                onFocus={() => handleFocusField('password')}
                onBlur={() => handleBlurField('password')}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError('');
                }}
              />

              <TouchableOpacity
                onPress={() => setShowPw(!showPw)}
                style={styles.eyeIconBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPw ? 'eye-off-outline' : 'eye-outline'}
                  size={19}
                  color={showPw ? '#ea580c' : '#94a3b8'}
                />
              </TouchableOpacity>
            </Pressable>
          </Animated.View>

          {/* Spring Bouncy Login Action Button & Footer */}
          <Animated.View
            style={{
              opacity: staggerAnims[4].opacity,
              transform: [{ translateY: staggerAnims[4].translateY }],
              gap: 16,
              marginTop: 4,
            }}
          >
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                onPress={handleLogin}
                onPressIn={handleBtnPressIn}
                onPressOut={handleBtnPressOut}
                disabled={loading}
                activeOpacity={0.9}
              >
                {loading ? (
                  <View style={styles.btnContent}>
                    <ActivityIndicator color="#ffffff" size="small" />
                    <Text style={styles.btnText}>ĐANG XÁC THỰC...</Text>
                  </View>
                ) : (
                  <View style={styles.btnContentBetween}>
                    <View style={{ width: 28 }} />
                    <Text style={styles.btnText}>ĐĂNG NHẬP HỆ THỐNG</Text>
                    <View style={styles.btnArrowCircle}>
                      <Ionicons name="arrow-forward" size={16} color="#ea580c" />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>DÀNH CHO CƯ DÂN MỚI</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Register Card Button */}
            <TouchableOpacity
              style={styles.registerCardBtn}
              onPress={() => navigate?.('register')}
              activeOpacity={0.75}
            >
              <View style={styles.registerIconBox}>
                <Ionicons name="person-add-outline" size={17} color="#ea580c" />
              </View>

              <View style={styles.registerTextWrap}>
                <Text style={styles.registerTitleText} numberOfLines={1}>
                  Chưa có tài khoản CityFix?
                </Text>
                <Text style={styles.registerSubText} numberOfLines={1}>
                  Tạo tài khoản miễn phí ngay
                </Text>
              </View>

              <View style={styles.registerActionBadge}>
                <Text style={styles.registerLink}>Đăng ký</Text>
                <Ionicons name="chevron-forward" size={13} color="#ea580c" />
              </View>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

        {/* Bottom Security & Trust Info */}
        <Animated.View
          style={[
            styles.trustFooter,
            {
              opacity: staggerAnims[4].opacity,
            },
          ]}
        >
          <Ionicons name="lock-closed" size={12} color="#94a3b8" />
          <Text style={styles.trustFooterText}>
            Kết nối được mã hóa bảo mật · Hệ thống Phản ánh Đô thị
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  topAccentBar: {
    height: 4,
    backgroundColor: '#f97316',
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 14,
    elevation: 2,
  },
  decorCircle1: {
    position: 'absolute',
    top: -45,
    right: -35,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(249, 115, 22, 0.07)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -35,
    width: 145,
    height: 145,
    borderRadius: 72.5,
    backgroundColor: 'rgba(251, 146, 60, 0.06)',
  },
  decorCircle3: {
    position: 'absolute',
    top: 26,
    left: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(249, 115, 22, 0.04)',
  },
  logoOuterContainer: {
    width: 118,
    height: 118,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoPulseRing: {
    position: 'absolute',
    width: 114,
    height: 114,
    borderRadius: 30,
    backgroundColor: 'rgba(249, 115, 22, 0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(249, 115, 22, 0.18)',
  },
  logoCard: {
    width: 98,
    height: 98,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  logoImage: {
    width: 78,
    height: 78,
  },
  taglineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#fed7aa',
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ea580c',
  },
  taglineText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#c2410c',
    letterSpacing: 0.7,
  },
  featurePillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  featurePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  formCard: {
    marginHorizontal: 18,
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 4,
    gap: 16,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orangeIndicator: {
    width: 4,
    height: 20,
    backgroundColor: '#f97316',
    borderRadius: 2,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  formSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 18,
  },
  rememberedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 14,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 8,
    gap: 6,
  },
  rememberedMainTouch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  rememberedAvatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ffedd5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rememberedHint: {
    fontSize: 10,
    color: '#9a3412',
    fontWeight: '600',
  },
  rememberedEmailText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  rememberedUseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fdba74',
  },
  rememberedUseText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#ea580c',
  },
  rememberedRemoveBtn: {
    padding: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 10,
  },
  errorIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#dc2626',
    flex: 1,
    lineHeight: 18,
  },
  fieldGroup: {
    gap: 7,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.8,
  },
  labelFocused: {
    color: '#ea580c',
    fontWeight: '800',
  },
  requiredStar: {
    color: '#ef4444',
    fontWeight: '900',
    fontSize: 12,
  },
  activeFieldBadge: {
    backgroundColor: '#fff7ed',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  activeFieldBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#ea580c',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 10,
    height: 52,
  },
  inputWrapperFocused: {
    backgroundColor: '#ffffff',
    borderColor: '#ea580c',
    borderWidth: 1.5,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 3,
  },
  inputWrapperError: {
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  inputIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  inputIconWrapFocused: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  input: {
    flex: 1,
    height: '100%',
    backgroundColor: 'transparent',
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearIconBtn: {
    padding: 4,
    marginLeft: 4,
  },
  eyeIconBtn: {
    padding: 6,
    marginLeft: 4,
  },
  domainChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  domainChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
  },
  domainChipActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
  },
  domainChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  domainChipTextActive: {
    color: '#ea580c',
    fontWeight: '700',
  },
  loginBtn: {
    backgroundColor: '#f97316',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 5,
  },
  loginBtnDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  btnContentBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  btnArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
  },
  registerCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 10,
  },
  registerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ffedd5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerTextWrap: {
    flex: 1,
    paddingRight: 4,
  },
  registerTitleText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  registerSubText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  registerActionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fdba74',
  },
  registerLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
  },
  trustFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
    paddingHorizontal: 24,
  },
  trustFooterText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
});
