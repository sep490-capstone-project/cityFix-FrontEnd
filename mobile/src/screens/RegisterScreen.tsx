import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Animated,
  Easing,
  Keyboard,
  StatusBar,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiError, register } from '../api';
import {
  VN_PROVINCES_2025,
  Province2025,
  getWardsForProvince2025,
} from '../constants/vnProvinces2025';

interface Props {
  navigate: (screen: string) => void;
  goBack: () => void;
  onRegistered: (email: string) => void;
}

const EMAIL_DOMAINS = ['@gmail.com', '@icloud.com', '@outlook.com', '@edu.vn'];

const QUICK_PROVINCE_CODES = [79, 1, 48, 31, 92, 75, 46]; // TP.HCM, Hà Nội, Đà Nẵng, Hải Phòng, Cần Thơ, Đồng Nai, Huế

function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

interface FieldProps {
  label: string;
  required?: boolean;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  icon: string;
  iconFocused: string;
  type?: 'text' | 'password' | 'phone' | 'email';
  hint?: string;
  error?: string;
  isValid?: boolean;
  optional?: boolean;
  externalShowPw?: boolean;
  onToggleShowPw?: () => void;
  childrenBelow?: React.ReactNode;
}

function AnimatedField({
  label,
  required = true,
  placeholder,
  value,
  onChange,
  icon,
  iconFocused,
  type = 'text',
  hint,
  error,
  isValid,
  optional,
  externalShowPw,
  onToggleShowPw,
  childrenBelow,
}: FieldProps) {
  const [internalShowPw, setInternalShowPw] = useState(false);
  const [focused, setFocused] = useState(false);
  const iconScale = useRef(new Animated.Value(1)).current;
  const inputRef = useRef<any>(null);
  const isPassword = type === 'password';
  const showPw = externalShowPw !== undefined ? externalShowPw : internalShowPw;

  const handleFocus = () => {
    setFocused(true);
    Animated.sequence([
      Animated.spring(iconScale, {
        toValue: 1.2,
        speed: 28,
        bounciness: 12,
        useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
        toValue: 1.1,
        speed: 24,
        bounciness: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleBlur = () => {
    setFocused(false);
    Animated.spring(iconScale, {
      toValue: 1,
      speed: 24,
      bounciness: 6,
      useNativeDriver: true,
    }).start();
  };

  const handleToggleEye = () => {
    if (onToggleShowPw) {
      onToggleShowPw();
    } else {
      setInternalShowPw((prev) => !prev);
    }
  };

  return (
    <View style={styles.fieldContainer}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, focused && styles.labelFocused]}>
          {label}
          {required && !optional ? <Text style={styles.requiredStar}> *</Text> : null}
        </Text>
        {optional ? (
          <Text style={styles.optionalTag}>Tùy chọn</Text>
        ) : focused ? (
          <View style={styles.activeFieldBadge}>
            <Text style={styles.activeFieldBadgeText}>Đang nhập</Text>
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={[
          styles.inputWrapper,
          focused && styles.inputWrapperFocused,
          error ? styles.inputWrapperError : null,
        ]}
      >
        <Animated.View
          style={[
            styles.inputIconWrap,
            focused && styles.inputIconWrapFocused,
            error ? styles.inputIconWrapError : null,
            { transform: [{ scale: iconScale }] },
          ]}
        >
          <Ionicons
            name={(focused ? iconFocused : icon) as any}
            size={16}
            color={error ? '#dc2626' : focused ? '#ea580c' : '#64748b'}
          />
        </Animated.View>

        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          {...(isPassword
            ? {
                secureTextEntry: !showPw,
                textContentType: 'oneTimeCode' as const,
              }
            : {
                textContentType: 'none' as const,
              })}
          keyboardType={
            type === 'phone'
              ? 'phone-pad'
              : type === 'email'
              ? 'email-address'
              : 'default'
          }
          autoCapitalize={type === 'email' || isPassword ? 'none' : 'words'}
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          importantForAutofill="no"
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChangeText={onChange}
        />

        {isPassword ? (
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={handleToggleEye}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showPw ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={showPw ? '#ea580c' : '#94a3b8'}
            />
          </TouchableOpacity>
        ) : focused && value.length > 0 ? (
          <TouchableOpacity
            onPress={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            style={styles.clearBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={17} color="#cbd5e1" />
          </TouchableOpacity>
        ) : !focused && isValid && value.trim().length > 0 && !error ? (
          <View style={styles.validCheckWrap}>
            <Ionicons name="checkmark-circle" size={17} color="#16a34a" />
          </View>
        ) : null}
      </Pressable>

      {childrenBelow}

      {error ? (
        <View style={styles.fieldErrorRow}>
          <Ionicons name="alert-circle" size={13} color="#dc2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
}

export default function RegisterScreen({ navigate, goBack, onRegistered }: Props) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [province, setProvince] = useState('');
  const [ward, setWard] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showBothPasswords, setShowBothPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  // Picker modal state for 2025 Merged Provinces & Wards
  const [pickerMode, setPickerMode] = useState<'province' | 'ward' | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [availableWards, setAvailableWards] = useState<string[]>([]);
  const [loadingWards, setLoadingWards] = useState(false);

  const selectedProvinceObj = useMemo<Province2025 | undefined>(
    () =>
      VN_PROVINCES_2025.find(
        (p) => p.name.toLowerCase() === province.trim().toLowerCase(),
      ),
    [province],
  );

  const quickProvinces = useMemo(
    () =>
      QUICK_PROVINCE_CODES.map((code) =>
        VN_PROVINCES_2025.find((p) => p.code === code),
      ).filter(Boolean) as Province2025[],
    [],
  );

  // Load merged wards whenever selectedProvinceObj changes
  useEffect(() => {
    let active = true;
    if (!selectedProvinceObj) {
      setAvailableWards([]);
      return;
    }
    setAvailableWards(selectedProvinceObj.defaultWards);
    setLoadingWards(true);
    getWardsForProvince2025(selectedProvinceObj)
      .then((wards) => {
        if (active) setAvailableWards(wards);
      })
      .finally(() => {
        if (active) setLoadingWards(false);
      });
    return () => {
      active = false;
    };
  }, [selectedProvinceObj]);

  const handleSelectProvince = (prov: Province2025, autoOpenWard = false) => {
    Keyboard.dismiss();
    const isDifferent = prov.name !== province;
    setProvince(prov.name);
    if (isDifferent) {
      setWard('');
    }
    if (errors.province) setErrors((prev) => ({ ...prev, province: '' }));
    setPickerSearch('');
    if (autoOpenWard) {
      setPickerMode('ward');
    } else {
      setPickerMode(null);
    }
  };

  const handleSelectWard = (w: string) => {
    Keyboard.dismiss();
    setWard(w);
    if (errors.ward) setErrors((prev) => ({ ...prev, ward: '' }));
    setPickerSearch('');
    setPickerMode(null);
  };

  const filteredProvinces = useMemo(() => {
    const q = removeVietnameseTones(pickerSearch.trim());
    if (!q) return VN_PROVINCES_2025;
    return VN_PROVINCES_2025.filter(
      (p) =>
        removeVietnameseTones(p.name).includes(q) ||
        (p.mergedFrom && removeVietnameseTones(p.mergedFrom).includes(q)),
    );
  }, [pickerSearch]);

  const filteredWards = useMemo(() => {
    const q = removeVietnameseTones(pickerSearch.trim());
    if (!q) return availableWards;
    return availableWards.filter((w) => removeVietnameseTones(w).includes(q));
  }, [availableWards, pickerSearch]);

  // 1. Floating Ambient Orbs
  const orb1Anim = useRef(new Animated.Value(0)).current;
  const orb2Anim = useRef(new Animated.Value(0)).current;

  // 2. Staggered Entrance Animations (4 sections)
  const staggerAnims = useRef(
    Array.from({ length: 4 }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(20),
    }))
  ).current;

  // 3. Fluid Password Strength Bar Animation (non-native width interpolation)
  const strengthWidthAnim = useRef(new Animated.Value(0)).current;

  // 4. Form Completion Progress Bar Animation
  const progressWidthAnim = useRef(new Animated.Value(0)).current;

  // 5. Spring CTA Button Scale
  const btnScale = useRef(new Animated.Value(1)).current;

  // 6. iOS-style Error Shake
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance
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
    Animated.stagger(70, animations).start();

    // Floating background orbs
    const loop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(orb1Anim, {
          toValue: 1,
          duration: 3800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(orb1Anim, {
          toValue: 0,
          duration: 3800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.timing(orb2Anim, {
          toValue: 1,
          duration: 4500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(orb2Anim, {
          toValue: 0,
          duration: 4500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop1.start();
    loop2.start();

    return () => {
      loop1.stop();
      loop2.stop();
    };
  }, []);

  // Calculate password strength
  const strength = useMemo(() => {
    const len = password.length;
    const hasLetterAndNum = /[a-zA-Z]/.test(password) && /\d/.test(password);
    if (len === 0) {
      return { score: 0, text: 'Chưa nhập', subText: 'Tối thiểu 8 ký tự', color: '#cbd5e1', bgColor: '#f1f5f9' };
    }
    if (len < 6) {
      return { score: 1, text: 'Yếu', subText: 'Quá ngắn, dễ bị đoán', color: '#ef4444', bgColor: '#fef2f2' };
    }
    if (len < 8) {
      return { score: 2, text: 'Trung bình', subText: 'Cần đủ ít nhất 8 ký tự', color: '#f97316', bgColor: '#fff7ed' };
    }
    if (len < 11 && !hasLetterAndNum) {
      return { score: 3, text: 'Tốt', subText: 'Đạt độ dài tiêu chuẩn', color: '#eab308', bgColor: '#fefce8' };
    }
    return { score: 4, text: 'Rất mạnh', subText: 'Mật khẩu rất an toàn!', color: '#16a34a', bgColor: '#f0fdf4' };
  }, [password]);

  // Animate Fluid Password Strength Bar whenever strength.score changes
  useEffect(() => {
    Animated.timing(strengthWidthAnim, {
      toValue: (strength.score / 4) * 100,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [strength.score]);

  // Calculate form completion progress (7 required fields)
  const completedCount = useMemo(() => {
    let count = 0;
    if (fullName.trim().length > 0) count++;
    if (/^0\d{9}$/.test(phone.replace(/\s/g, ''))) count++;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) count++;
    if (province.trim().length > 0) count++;
    if (ward.trim().length > 0) count++;
    if (password.length >= 8) count++;
    if (confirmPw.length >= 8 && confirmPw === password) count++;
    return count;
  }, [fullName, phone, email, province, ward, password, confirmPw]);

  useEffect(() => {
    Animated.timing(progressWidthAnim, {
      toValue: (completedCount / 7) * 100,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [completedCount]);

  const handleSelectDomain = (domain: string) => {
    const prefix = email.split('@')[0].trim();
    if (!prefix) return;
    setEmail(`${prefix}${domain}`);
    if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
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

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Vui lòng nhập họ và tên của bạn.';
    if (!/^0\d{9}$/.test(phone.replace(/\s/g, '')))
      e.phone = 'Số điện thoại gồm 10 chữ số và bắt đầu bằng số 0.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = 'Địa chỉ email chưa đúng định dạng.';
    if (!province.trim()) e.province = 'Vui lòng chọn Tỉnh / Thành phố.';
    if (!ward.trim()) e.ward = 'Vui lòng chọn Phường / Xã (sau sáp nhập).';
    if (password.length < 8) e.password = 'Mật khẩu cần tối thiểu 8 ký tự.';
    if (!confirmPw || confirmPw !== password) e.confirmPw = 'Mật khẩu xác nhận chưa trùng khớp.';
    return e;
  };

  const handleRegister = async () => {
    Keyboard.dismiss();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      triggerErrorShake();
      return;
    }

    setLoading(true);
    setFormError('');
    try {
      await register({
        fullName,
        phoneNumber: phone,
        email,
        province,
        ward,
        address,
        password,
      });
      try {
        await AsyncStorage.setItem('@cityfix_last_login_email', email.trim());
      } catch {}
      onRegistered(email.trim());
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Không thể tạo tài khoản. Vui lòng thử lại.',
      );
      triggerErrorShake();
    } finally {
      setLoading(false);
    }
  };

  const orb1TranslateY = orb1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 12],
  });
  const orb2TranslateY = orb2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, -10],
  });

  const hasMinLen = password.length >= 8;
  const hasLetterAndNum = /[a-zA-Z]/.test(password) && /\d/.test(password);
  const isPwMatched = confirmPw.length > 0 && confirmPw === password;

  const emailPrefix = email.split('@')[0].trim();
  const suggestedWards = useMemo(
    () => (selectedProvinceObj ? availableWards.slice(0, 6) : []),
    [selectedProvinceObj, availableWards],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" />
      <View style={styles.topAccentBar} />

      {/* Navigation Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.75}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>Đăng ký tài khoản</Text>
          <Text style={styles.topBarStep}>
            Hoàn thành {completedCount}/7 mục bắt buộc ({Math.round((completedCount / 7) * 100)}%)
          </Text>
        </View>

        <View style={{ width: 38 }} />
      </View>

      {/* Smooth Fluid Form Progress Bar */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressWidthAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
              backgroundColor: completedCount === 7 ? '#16a34a' : '#f97316',
            },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Welcome Banner with Floating Orbs */}
        <Animated.View
          style={[
            styles.heroBanner,
            {
              opacity: staggerAnims[0].opacity,
              transform: [{ translateY: staggerAnims[0].translateY }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.heroOrb1,
              { transform: [{ translateY: orb1TranslateY }] },
            ]}
          />
          <Animated.View
            style={[
              styles.heroOrb2,
              { transform: [{ translateY: orb2TranslateY }] },
            ]}
          />

          <View style={styles.brandRow}>
            <View style={styles.orangeIndicator} />
            <Text style={styles.brandTag}>THÀNH VIÊN CỘNG ĐỒNG CITYFIX</Text>
          </View>
          <Text style={styles.mainTitle}>TẠO TÀI KHOẢN MỚI</Text>
          <Text style={styles.subTitle}>
            Chung tay phản ánh và giám sát xử lý sự cố hạ tầng ngay tại khu vực của bạn.
          </Text>
        </Animated.View>

        {/* Main Register Form Card with Error Shake */}
        <Animated.View
          style={[
            styles.formCard,
            {
              transform: [{ translateX: shakeAnim }],
            },
          ]}
        >
          {formError ? (
            <View style={styles.formErrorBanner}>
              <Ionicons name="alert-circle" size={18} color="#dc2626" />
              <Text style={styles.formErrorText}>{formError}</Text>
            </View>
          ) : null}

          {/* SECTION 1: THÔNG TIN CÁ NHÂN */}
          <Animated.View
            style={[
              styles.sectionGroup,
              {
                opacity: staggerAnims[1].opacity,
                transform: [{ translateY: staggerAnims[1].translateY }],
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBox}>
                <Ionicons name="person" size={14} color="#ea580c" />
              </View>
              <Text style={styles.sectionTitle}>1. THÔNG TIN CÁ NHÂN</Text>
            </View>

            <AnimatedField
              label="HỌ VÀ TÊN"
              required
              placeholder="Nguyễn Văn An"
              icon="person-outline"
              iconFocused="person"
              value={fullName}
              isValid={fullName.trim().length >= 2}
              onChange={(v) => {
                setFullName(v);
                if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
              }}
              error={errors.fullName}
            />

            <AnimatedField
              label="SỐ ĐIỆN THOẠI"
              required
              placeholder="0901 234 567"
              type="phone"
              icon="call-outline"
              iconFocused="call"
              value={phone}
              isValid={/^0\d{9}$/.test(phone.replace(/\s/g, ''))}
              onChange={(v) => {
                setPhone(v);
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
              }}
              error={errors.phone}
              hint="Dùng để liên hệ xác minh và nhận thông báo tiến độ."
            />

            <AnimatedField
              label="ĐỊA CHỈ EMAIL"
              required
              placeholder="example@gmail.com"
              type="email"
              icon="mail-outline"
              iconFocused="mail"
              value={email}
              isValid={/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
              onChange={(v) => {
                setEmail(v);
                if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
              }}
              error={errors.email}
              hint="Mã OTP xác thực sẽ được gửi qua email này."
              childrenBelow={
                emailPrefix.length > 0 ? (
                  <View style={styles.quickPillsWrap}>
                    {EMAIL_DOMAINS.map((domain) => {
                      const candidate = `${emailPrefix}${domain}`;
                      const isSelected = email.trim().toLowerCase() === candidate.toLowerCase();
                      return (
                        <TouchableOpacity
                          key={domain}
                          style={[
                            styles.quickPill,
                            isSelected && styles.quickPillActive,
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
                              styles.quickPillText,
                              isSelected && styles.quickPillTextActive,
                            ]}
                          >
                            {domain.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null
              }
            />
          </Animated.View>

          <View style={styles.sectionDivider} />

          {/* SECTION 2: KHU VỰC CƯ TRÚ */}
          <Animated.View
            style={[
              styles.sectionGroup,
              {
                opacity: staggerAnims[2].opacity,
                transform: [{ translateY: staggerAnims[2].translateY }],
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBox}>
                <Ionicons name="location" size={14} color="#ea580c" />
              </View>
              <Text style={styles.sectionTitle}>2. KHU VỰC CƯ TRÚ</Text>
            </View>

            {/* TỈNH / THÀNH PHỐ SELECTOR */}
            <View style={styles.fieldContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>
                  TỈNH / THÀNH PHỐ<Text style={styles.requiredStar}> *</Text>
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  Keyboard.dismiss();
                  setPickerSearch('');
                  setPickerMode('province');
                }}
                style={[
                  styles.inputWrapper,
                  pickerMode === 'province' && styles.inputWrapperFocused,
                  errors.province ? styles.inputWrapperError : null,
                ]}
              >
                <View
                  style={[
                    styles.inputIconWrap,
                    province ? styles.inputIconWrapFocused : null,
                    errors.province ? styles.inputIconWrapError : null,
                  ]}
                >
                  <Ionicons
                    name={province ? 'business' : 'business-outline'}
                    size={16}
                    color={errors.province ? '#dc2626' : province ? '#ea580c' : '#64748b'}
                  />
                </View>

                <Text
                  style={[
                    styles.selectorValueText,
                    !province && styles.selectorPlaceholderText,
                  ]}
                  numberOfLines={1}
                >
                  {province || 'Bấm để chọn Tỉnh / Thành phố'}
                </Text>

                {province ? (
                  <View style={styles.selectorRightRow}>
                    <Ionicons name="checkmark-circle" size={17} color="#16a34a" />
                    <Ionicons name="chevron-down" size={16} color="#64748b" />
                  </View>
                ) : (
                  <View style={styles.selectorChevronBadge}>
                    <Text style={styles.selectorChevronText}>Chọn</Text>
                    <Ionicons name="chevron-down" size={14} color="#ea580c" />
                  </View>
                )}
              </TouchableOpacity>

              {errors.province ? (
                <View style={styles.fieldErrorRow}>
                  <Ionicons name="alert-circle" size={13} color="#dc2626" />
                  <Text style={styles.errorText}>{errors.province}</Text>
                </View>
              ) : null}
            </View>

            {/* PHƯỜNG / XÃ (SAU SÁP NHẬP) SELECTOR */}
            <View style={styles.fieldContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>
                  PHƯỜNG / XÃ (SAU SÁP NHẬP)<Text style={styles.requiredStar}> *</Text>
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  Keyboard.dismiss();
                  setPickerSearch('');
                  if (!province.trim()) {
                    setErrors((prev) => ({
                      ...prev,
                      province: 'Vui lòng chọn Tỉnh / Thành phố trước khi chọn Phường / Xã.',
                    }));
                    setPickerMode('province');
                    return;
                  }
                  setPickerMode('ward');
                }}
                style={[
                  styles.inputWrapper,
                  pickerMode === 'ward' && styles.inputWrapperFocused,
                  !province && styles.selectorDisabledWrapper,
                  errors.ward ? styles.inputWrapperError : null,
                ]}
              >
                <View
                  style={[
                    styles.inputIconWrap,
                    ward ? styles.inputIconWrapFocused : null,
                    errors.ward ? styles.inputIconWrapError : null,
                  ]}
                >
                  <Ionicons
                    name={ward ? 'map' : 'map-outline'}
                    size={16}
                    color={errors.ward ? '#dc2626' : ward ? '#ea580c' : '#64748b'}
                  />
                </View>

                <Text
                  style={[
                    styles.selectorValueText,
                    !ward && styles.selectorPlaceholderText,
                  ]}
                  numberOfLines={1}
                >
                  {ward
                    ? ward
                    : province
                    ? `Chọn Phường / Xã thuộc ${province}...`
                    : 'Vui lòng chọn Tỉnh / Thành phố ở trên trước'}
                </Text>

                {ward ? (
                  <View style={styles.selectorRightRow}>
                    <Ionicons name="checkmark-circle" size={17} color="#16a34a" />
                    <Ionicons name="chevron-down" size={16} color="#64748b" />
                  </View>
                ) : (
                  <View style={styles.selectorChevronBadge}>
                    <Text style={styles.selectorChevronText}>
                      {province ? 'Danh sách' : 'Chưa mở'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#ea580c" />
                  </View>
                )}
              </TouchableOpacity>

              {errors.ward ? (
                <View style={styles.fieldErrorRow}>
                  <Ionicons name="alert-circle" size={13} color="#dc2626" />
                  <Text style={styles.errorText}>{errors.ward}</Text>
                </View>
              ) : null}
            </View>

            <AnimatedField
              label="ĐỊA CHỈ CHI TIẾT"
              required={false}
              optional
              placeholder="Số nhà, tên đường, khu phố..."
              icon="home-outline"
              iconFocused="home"
              value={address}
              onChange={setAddress}
            />
          </Animated.View>

          <View style={styles.sectionDivider} />

          {/* SECTION 3: THIẾT LẬP BẢO MẬT */}
          <Animated.View
            style={[
              styles.sectionGroup,
              {
                opacity: staggerAnims[3].opacity,
                transform: [{ translateY: staggerAnims[3].translateY }],
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBox}>
                <Ionicons name="shield-checkmark" size={14} color="#ea580c" />
              </View>
              <Text style={styles.sectionTitle}>3. THIẾT LẬP BẢO MẬT</Text>
            </View>

            <AnimatedField
              label="MẬT KHẨU"
              required
              placeholder="Tối thiểu 8 ký tự"
              type="password"
              icon="lock-closed-outline"
              iconFocused="lock-closed"
              value={password}
              onChange={(v) => {
                setPassword(v);
                if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
              }}
              error={errors.password}
            />

            {/* 6. Fluid Password Strength Meter + Checklist Chips */}
            {password.length > 0 ? (
              <View
                style={[
                  styles.strengthCard,
                  { backgroundColor: strength.bgColor, borderColor: strength.color + '40' },
                ]}
              >
                <View style={styles.strengthHeaderRow}>
                  <View style={styles.strengthTitleWrap}>
                    <Ionicons
                      name={strength.score >= 3 ? 'shield-checkmark' : 'shield-half-outline'}
                      size={14}
                      color={strength.color}
                    />
                    <Text style={[styles.strengthLabel, { color: strength.color }]}>
                      Độ mạnh: {strength.text}
                    </Text>
                  </View>
                  <Text style={styles.strengthSubLabel}>{strength.subText}</Text>
                </View>

                {/* Continuous Fluid Sliding Bar */}
                <View style={styles.fluidTrack}>
                  <Animated.View
                    style={[
                      styles.fluidFill,
                      {
                        width: strengthWidthAnim.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%'],
                        }),
                        backgroundColor: strength.color,
                      },
                    ]}
                  />
                </View>

                {/* Real-time Security Checklist Chips */}
                <View style={styles.securityChipsRow}>
                  <View style={[styles.secChip, hasMinLen && styles.secChipValid]}>
                    <Ionicons
                      name={hasMinLen ? 'checkmark-circle' : 'ellipse-outline'}
                      size={12}
                      color={hasMinLen ? '#16a34a' : '#94a3b8'}
                    />
                    <Text style={[styles.secChipText, hasMinLen && styles.secChipTextValid]}>
                      8+ ký tự
                    </Text>
                  </View>

                  <View style={[styles.secChip, hasLetterAndNum && styles.secChipValid]}>
                    <Ionicons
                      name={hasLetterAndNum ? 'checkmark-circle' : 'ellipse-outline'}
                      size={12}
                      color={hasLetterAndNum ? '#16a34a' : '#94a3b8'}
                    />
                    <Text style={[styles.secChipText, hasLetterAndNum && styles.secChipTextValid]}>
                      Chữ & số
                    </Text>
                  </View>

                  <View style={[styles.secChip, isPwMatched && styles.secChipValid]}>
                    <Ionicons
                      name={isPwMatched ? 'checkmark-circle' : 'ellipse-outline'}
                      size={12}
                      color={isPwMatched ? '#16a34a' : '#94a3b8'}
                    />
                    <Text style={[styles.secChipText, isPwMatched && styles.secChipTextValid]}>
                      Khớp xác nhận
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            <AnimatedField
              label="XÁC NHẬN MẬT KHẨU"
              required
              placeholder="Nhập lại mật khẩu ở trên"
              type="password"
              icon="key-outline"
              iconFocused="key"
              value={confirmPw}
              onChange={(v) => {
                setConfirmPw(v);
                if (errors.confirmPw) setErrors((prev) => ({ ...prev, confirmPw: '' }));
              }}
              error={errors.confirmPw}
            />

            {/* Terms Policy Notice */}
            <View style={styles.termsBox}>
              <Ionicons name="information-circle-outline" size={16} color="#ea580c" />
              <Text style={styles.termsText}>
                Bằng cách đăng ký, bạn đồng ý với{' '}
                <Text style={styles.termsLink}>Điều khoản sử dụng</Text> và{' '}
                <Text style={styles.termsLink}>Chính sách bảo mật</Text> của CityFix.
              </Text>
            </View>

            {/* Spring Bouncy Register CTA Button */}
            <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: 4 }}>
              <TouchableOpacity
                style={[styles.registerBtn, loading && styles.registerBtnDisabled]}
                onPress={handleRegister}
                onPressIn={handleBtnPressIn}
                onPressOut={handleBtnPressOut}
                disabled={loading}
                activeOpacity={0.9}
              >
                {loading ? (
                  <View style={styles.btnContent}>
                    <ActivityIndicator color="#ffffff" size="small" />
                    <Text style={styles.btnText}>ĐANG KHỞI TẠO TÀI KHOẢN...</Text>
                  </View>
                ) : (
                  <View style={styles.btnContentBetween}>
                    <View style={{ width: 28 }} />
                    <Text style={styles.btnText}>ĐĂNG KÝ & NHẬN MÃ XÁC THỰC</Text>
                    <View style={styles.btnArrowCircle}>
                      <Ionicons name="arrow-forward" size={16} color="#ea580c" />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Back to Login Link */}
            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Bạn đã có tài khoản? </Text>
              <TouchableOpacity onPress={goBack} activeOpacity={0.7}>
                <Text style={styles.loginLink}>Đăng nhập ngay →</Text>
              </TouchableOpacity>
            </View>

            {/* Trust Footer */}
            <View style={styles.trustFooter}>
              <Ionicons name="lock-closed" size={12} color="#94a3b8" />
              <Text style={styles.trustFooterText}>
                Kết nối bảo mật · Hệ thống Phản ánh & Xử lý Sự cố Đô thị CityFix
              </Text>
            </View>
          </Animated.View>
        </Animated.View>
      </ScrollView>

      {/* MODAL CHỌN TỈNH / THÀNH PHỐ & PHƯỜNG / XÃ SAU SÁP NHẬP */}
      <Modal
        visible={pickerMode !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerMode(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalDismissArea}
            onPress={() => setPickerMode(null)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandleBar} />

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleCol}>
                <View style={styles.modalTitleBadgeRow}>
                  <Ionicons
                    name={pickerMode === 'province' ? 'business' : 'map'}
                    size={16}
                    color="#ea580c"
                  />
                  <Text style={styles.modalTitle}>
                    {pickerMode === 'province'
                      ? 'Chọn Tỉnh / Thành phố'
                      : `Chọn Phường / Xã (${province})`}
                  </Text>
                </View>
                <Text style={styles.modalSubtitle}>
                  {pickerMode === 'province'
                    ? 'Danh sách 34 Tỉnh / Thành phố Việt Nam sau sáp nhập hành chính'
                    : selectedProvinceObj?.mergedFrom
                    ? `${selectedProvinceObj.mergedFrom} · ${availableWards.length} đơn vị cấp xã/phường mới`
                    : `Danh sách Phường / Xã mới trực thuộc ${province} sau sáp nhập`}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setPickerMode(null)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* Step Switcher Tabs inside Modal */}
            <View style={styles.modalStepTabs}>
              <TouchableOpacity
                style={[
                  styles.modalStepTab,
                  pickerMode === 'province' && styles.modalStepTabActive,
                ]}
                onPress={() => {
                  setPickerSearch('');
                  setPickerMode('province');
                }}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="business-outline"
                  size={13}
                  color={pickerMode === 'province' ? '#ea580c' : '#64748b'}
                />
                <Text
                  style={[
                    styles.modalStepTabText,
                    pickerMode === 'province' && styles.modalStepTabTextActive,
                  ]}
                  numberOfLines={1}
                >
                  1. {province || 'Tỉnh / Thành phố'}
                </Text>
              </TouchableOpacity>

              <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />

              <TouchableOpacity
                style={[
                  styles.modalStepTab,
                  pickerMode === 'ward' && styles.modalStepTabActive,
                  !province && { opacity: 0.5 },
                ]}
                disabled={!province}
                onPress={() => {
                  if (!province) return;
                  setPickerSearch('');
                  setPickerMode('ward');
                }}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="map-outline"
                  size={13}
                  color={pickerMode === 'ward' ? '#ea580c' : '#64748b'}
                />
                <Text
                  style={[
                    styles.modalStepTabText,
                    pickerMode === 'ward' && styles.modalStepTabTextActive,
                  ]}
                  numberOfLines={1}
                >
                  2. {ward || 'Phường / Xã mới'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.modalSearchBox}>
              <Ionicons name="search-outline" size={17} color="#64748b" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder={
                  pickerMode === 'province'
                    ? 'Tìm nhanh Tỉnh / Thành phố (hoặc tên tỉnh cũ)...'
                    : `Tìm Phường / Xã thuộc ${province}...`
                }
                placeholderTextColor="#94a3b8"
                value={pickerSearch}
                onChangeText={setPickerSearch}
                autoCorrect={false}
              />
              {pickerSearch.length > 0 ? (
                <TouchableOpacity onPress={() => setPickerSearch('')}>
                  <Ionicons name="close-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* List Content */}
            {pickerMode === 'province' ? (
              <FlatList
                data={filteredProvinces}
                keyExtractor={(item) => String(item.code)}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalListContent}
                renderItem={({ item }) => {
                  const isSelected =
                    province.trim().toLowerCase() === item.name.toLowerCase();
                  return (
                    <TouchableOpacity
                      style={[
                        styles.modalOptionItem,
                        isSelected && styles.modalOptionItemActive,
                      ]}
                      onPress={() => handleSelectProvince(item, true)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.modalOptionIcon,
                          isSelected && styles.modalOptionIconActive,
                        ]}
                      >
                        <Ionicons
                          name={isSelected ? 'location' : 'location-outline'}
                          size={16}
                          color={isSelected ? '#ea580c' : '#64748b'}
                        />
                      </View>
                      <View style={styles.modalOptionTextCol}>
                        <Text
                          style={[
                            styles.modalOptionTitle,
                            isSelected && styles.modalOptionTitleActive,
                          ]}
                        >
                          {item.name}
                        </Text>
                        {item.mergedFrom ? (
                          <Text style={styles.modalOptionSub}>
                            {item.mergedFrom}
                          </Text>
                        ) : (
                          <Text style={styles.modalOptionSub}>
                            Giữ nguyên địa giới hành chính
                          </Text>
                        )}
                      </View>
                      <View style={styles.modalOptionRight}>
                        {isSelected ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color="#ea580c"
                          />
                        ) : (
                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color="#cbd5e1"
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.modalEmptyWrap}>
                    <Ionicons name="search-outline" size={28} color="#cbd5e1" />
                    <Text style={styles.modalEmptyText}>
                      Không tìm thấy Tỉnh / Thành phố phù hợp.
                    </Text>
                  </View>
                }
              />
            ) : (
              <FlatList
                data={filteredWards}
                keyExtractor={(item, idx) => `${item}-${idx}`}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalListContent}
                ListHeaderComponent={
                  loadingWards ? (
                    <View style={styles.wardLoadingBanner}>
                      <ActivityIndicator size="small" color="#ea580c" />
                      <Text style={styles.wardLoadingText}>
                        Đang đồng bộ đầy đủ danh sách Phường/Xã mới...
                      </Text>
                    </View>
                  ) : undefined
                }
                renderItem={({ item }) => {
                  const isSelected =
                    ward.trim().toLowerCase() === item.toLowerCase();
                  return (
                    <TouchableOpacity
                      style={[
                        styles.modalOptionItem,
                        isSelected && styles.modalOptionItemActive,
                      ]}
                      onPress={() => handleSelectWard(item)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.modalOptionIcon,
                          isSelected && styles.modalOptionIconActive,
                        ]}
                      >
                        <Ionicons
                          name={isSelected ? 'navigate' : 'navigate-outline'}
                          size={15}
                          color={isSelected ? '#ea580c' : '#64748b'}
                        />
                      </View>
                      <View style={styles.modalOptionTextCol}>
                        <Text
                          style={[
                            styles.modalOptionTitle,
                            isSelected && styles.modalOptionTitleActive,
                          ]}
                        >
                          {item}
                        </Text>
                        <Text style={styles.modalOptionSub}>
                          Trực thuộc {province} (sau sáp nhập)
                        </Text>
                      </View>
                      {isSelected ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#16a34a"
                        />
                      ) : null}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.modalEmptyWrap}>
                    <Ionicons name="map-outline" size={28} color="#cbd5e1" />
                    <Text style={styles.modalEmptyText}>
                      Không tìm thấy "{pickerSearch.trim()}" trong danh sách gợi ý.
                    </Text>
                    {pickerSearch.trim().length >= 2 ? (
                      <TouchableOpacity
                        style={styles.customWardUseBtn}
                        onPress={() => handleSelectWard(pickerSearch.trim())}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="add-circle-outline"
                          size={16}
                          color="#ffffff"
                        />
                        <Text style={styles.customWardUseBtnText}>
                          Sử dụng "{pickerSearch.trim()}"
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topAccentBar: {
    height: 3,
    backgroundColor: '#f97316',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: '#ffffff',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarCenter: {
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  topBarStep: {
    fontSize: 11,
    color: '#ea580c',
    marginTop: 1,
    fontWeight: '700',
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#f1f5f9',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  scrollContainer: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    paddingBottom: 36,
  },
  heroBanner: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ffedd5',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  heroOrb1: {
    position: 'absolute',
    top: -30,
    right: -25,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(249, 115, 22, 0.07)',
  },
  heroOrb2: {
    position: 'absolute',
    bottom: -35,
    left: -20,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(251, 146, 60, 0.06)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  orangeIndicator: {
    width: 4,
    height: 13,
    backgroundColor: '#f97316',
    borderRadius: 2,
  },
  brandTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ea580c',
    letterSpacing: 1.2,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.4,
  },
  subTitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
    gap: 16,
  },
  formErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  formErrorText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  sectionGroup: {
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.6,
  },
  syncShowPwBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  syncShowPwText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 2,
  },
  fieldContainer: {
    gap: 6,
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
  optionalTag: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  activeFieldBadge: {
    backgroundColor: '#fff7ed',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  activeFieldBadgeText: {
    fontSize: 9,
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
    height: 50,
  },
  inputWrapperFocused: {
    backgroundColor: '#ffffff',
    borderColor: '#ea580c',
    borderWidth: 1.5,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.13,
    shadowRadius: 8,
    elevation: 3,
  },
  inputWrapperError: {
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  inputIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
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
  inputIconWrapError: {
    backgroundColor: '#fee2e2',
  },
  input: {
    flex: 1,
    height: '100%',
    backgroundColor: 'transparent',
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 6,
    marginLeft: 4,
  },
  clearBtn: {
    padding: 4,
    marginLeft: 4,
  },
  validCheckWrap: {
    marginLeft: 6,
  },
  quickPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  quickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
  },
  quickPillActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
  },
  quickPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  quickPillTextActive: {
    color: '#ea580c',
    fontWeight: '700',
  },
  fieldErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  errorText: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '600',
  },
  hintText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  strengthCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    gap: 8,
    marginTop: -2,
  },
  strengthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  strengthTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  strengthSubLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  fluidTrack: {
    height: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fluidFill: {
    height: '100%',
    borderRadius: 3,
  },
  securityChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  secChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  secChipValid: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  secChipText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  secChipTextValid: {
    color: '#16a34a',
    fontWeight: '700',
  },
  termsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 11,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  termsText: {
    flex: 1,
    fontSize: 11,
    color: '#475569',
    lineHeight: 17,
  },
  termsLink: {
    color: '#ea580c',
    fontWeight: '700',
  },
  registerBtn: {
    backgroundColor: '#f97316',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.26,
    shadowRadius: 12,
    elevation: 5,
  },
  registerBtnDisabled: {
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
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.6,
  },
  btnArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
  loginText: {
    fontSize: 13,
    color: '#64748b',
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ea580c',
  },
  trustFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 16,
    paddingBottom: 8,
  },
  trustFooterText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  mergerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mergerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ea580c',
  },
  mergedFromHint: {
    fontSize: 10,
    color: '#ea580c',
    fontWeight: '600',
    maxWidth: '58%',
  },
  selectorValueText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  selectorPlaceholderText: {
    color: '#94a3b8',
    fontWeight: '500',
  },
  selectorDisabledWrapper: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    opacity: 0.85,
  },
  selectorRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 6,
  },
  selectorChevronBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 6,
  },
  selectorChevronText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
  },
  moreWardsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fdba74',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
  },
  moreWardsPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '82%',
    minHeight: '58%',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 18,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 16,
  },
  modalHandleBar: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  modalTitleCol: {
    flex: 1,
    gap: 3,
  },
  modalTitleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: '#64748b',
    lineHeight: 16,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalStepTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    gap: 6,
  },
  modalStepTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 9,
  },
  modalStepTabActive: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fed7aa',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  modalStepTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    flexShrink: 1,
  },
  modalStepTabTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    borderRadius: 13,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0f172a',
    paddingVertical: 0,
  },
  modalListContent: {
    paddingBottom: 20,
    gap: 7,
  },
  modalOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  modalOptionItemActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
  },
  modalOptionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOptionIconActive: {
    backgroundColor: '#ffedd5',
    borderColor: '#fdba74',
  },
  modalOptionTextCol: {
    flex: 1,
    gap: 2,
  },
  modalOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalOptionTitleActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  modalOptionSub: {
    fontSize: 11.5,
    color: '#64748b',
  },
  modalOptionRight: {
    marginLeft: 4,
  },
  wardLoadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff7ed',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  wardLoadingText: {
    fontSize: 12,
    color: '#ea580c',
    fontWeight: '600',
  },
  modalEmptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  modalEmptyText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  customWardUseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    backgroundColor: '#ea580c',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  customWardUseBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
});
