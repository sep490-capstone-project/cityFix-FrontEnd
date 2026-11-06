import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  StatusBar,
  Dimensions,
  Platform,
  Alert,
  Animated,
  Easing,
  RefreshControl,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthUser } from '../LoginScreen';
import {
  getMyReportedTickets,
  ReportedTicket,
  mapBackendStatus,
  getUnreadNotificationCount,
} from '../../api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  navigate: (screen: string, params?: any) => void;
  authUser: AuthUser | null;
  openTicket?: (id: string, ticketObj?: any) => void;
}

const QUICK_CATS = [
  {
    label: 'Ổ gà',
    sub: 'Hư hỏng mặt đường',
    icon: 'road-variant' as const,
  },
  {
    label: 'Đèn đường',
    sub: 'Mất điện, chập chờn',
    icon: 'lightbulb-outline' as const,
  },
  {
    label: 'Cây đổ',
    sub: 'Gãy cành, chắn lối',
    icon: 'tree' as const,
  },
  {
    label: 'Ngập úng',
    sub: 'Tắc cống, ngập nước',
    icon: 'water-outline' as const,
  },
  {
    label: 'Vỉa hè',
    sub: 'Sụt lún, lấn chiếm',
    icon: 'walk' as const,
  },
  {
    label: 'Khác',
    sub: 'Sự cố hạ tầng khác',
    icon: 'dots-horizontal-circle-outline' as const,
  },
];

const TRENDING = [
  {
    id: 'CF-2821',
    upvotes: 11,
    category: 'Ngập úng / Cống tắc',
    address: 'Đinh Tiên Hoàng, Bình Thạnh',
    severity: 'TRUNG BÌNH',
    img: 'https://images.unsplash.com/photo-1542393545-10f5cde2c810?w=400&h=260&fit=crop&auto=format',
    delta: '+3 hôm nay',
  },
  {
    id: 'CF-2835',
    upvotes: 7,
    category: 'Cây gãy đổ',
    address: 'Trần Hưng Đạo, Q.1',
    severity: 'CAO',
    img: 'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=400&h=260&fit=crop&auto=format',
    delta: '+1 hôm nay',
  },
  {
    id: 'CF-2853',
    upvotes: 4,
    category: 'Ổ gà mặt đường',
    address: 'Nguyễn Văn Cừ, Q.5',
    severity: 'CAO',
    img: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=400&h=260&fit=crop&auto=format',
    delta: '+4 hôm nay',
  },
];

const PERFORMANCE_ROWS = [
  { label: 'Ổ gà / Mặt đường', pct: 72, count: '18/25', color: '#ea580c' },
  { label: 'Đèn đường hỏng', pct: 60, count: '9/15', color: '#d97706' },
  { label: 'Cây xanh đô thị', pct: 88, count: '7/8', color: '#16a34a' },
  { label: 'Ngập úng / Thoát nước', pct: 40, count: '4/10', color: '#0284c7' },
];

function formatSeverity(sev?: string): string {
  const upper = (sev || '').toUpperCase();
  if (upper === 'CRITICAL') return 'KHẨN CẤP';
  if (upper === 'HIGH' || upper === 'CAO') return 'CAO';
  if (upper === 'MEDIUM' || upper === 'TRUNG BÌNH') return 'TRUNG BÌNH';
  if (upper === 'LOW' || upper === 'THẤP') return 'THẤP';
  return upper || 'TRUNG BÌNH';
}

const COMMUNITY_FEED = [
  { time: '14 phút', user: 'Minh T.', action: 'báo cáo ổ gà', loc: 'Hoàng Diệu, Q.4', avatar: 'MT', report: true },
  { time: '32 phút', user: 'Lan N.', action: 'đồng tình sự cố ngập úng', loc: 'Bình Thạnh', avatar: 'LN', report: false },
  { time: '1 giờ', user: 'Hùng P.', action: 'báo cáo đèn hỏng', loc: 'Lê Văn Sỹ, Q.3', avatar: 'HP', report: true },
  { time: '2 giờ', user: 'Thu M.', action: 'đồng tình sự cố mặt đường', loc: 'Q.5', avatar: 'TM', report: false },
];

function SectionLabel({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.orangeIndicator} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action ? (
        <TouchableOpacity onPress={onAction} style={styles.actionBtn} activeOpacity={0.75}>
          <Text style={styles.actionBtnText}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Chào buổi sáng';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function formatLocation(ward?: string, province?: string): string {
  let w = (ward || '').trim();
  let p = (province || '').trim();

  // Bỏ chữ "Phường" / "Phuong" / "P." theo yêu cầu người dùng
  if (w) {
    w = w.replace(/^(phường|phuong|p\.)\s*/i, '').trim();
    if (w.toLowerCase() === 'ben nghe') {
      w = 'Bến Nghé';
    }
  }

  // Chuẩn hóa Tỉnh / TP
  const lowerP = p.toLowerCase();
  if (
    lowerP.includes('ho chi minh') ||
    lowerP === 'hcm' ||
    lowerP === 'tp hcm' ||
    lowerP === 'hồ chí minh' ||
    lowerP === 'tp. hcm'
  ) {
    p = 'TP. Hồ Chí Minh';
  } else if (lowerP.includes('ha noi') || lowerP === 'hà nội') {
    p = 'Hà Nội';
  } else if (lowerP.includes('da nang') || lowerP === 'đà nẵng') {
    p = 'Đà Nẵng';
  } else if (lowerP.includes('can tho') || lowerP === 'cần thơ') {
    p = 'Cần Thơ';
  } else if (lowerP.includes('hai phong') || lowerP === 'hải phòng') {
    p = 'Hải Phòng';
  }

  if (w && p) {
    return `${w}, ${p}`;
  }
  if (w) return w;
  if (p) return p;
  return 'Bến Nghé, TP. Hồ Chí Minh';
}

export default function HomeScreen({ navigate, authUser, openTicket }: Props) {
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [realTickets, setRealTickets] = useState<ReportedTicket[]>([]);
  const [totalMyReports, setTotalMyReports] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);

  // Animations
  const pinPulseAnim = useRef(new Animated.Value(1)).current;
  const heroScaleAnim = useRef(new Animated.Value(1)).current;
  const progressBarAnim = useRef(new Animated.Value(0)).current;
  const entranceAnim = useRef(new Animated.Value(0)).current;

  const loadHomeData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [ticketsRes, unread] = await Promise.allSettled([
        getMyReportedTickets(null, 0, 100),
        getUnreadNotificationCount(),
      ]);

      if (
        ticketsRes.status === 'fulfilled' &&
        ticketsRes.value &&
        Array.isArray(ticketsRes.value.content)
      ) {
        setRealTickets(ticketsRes.value.content.slice(0, 3));
        setTotalMyReports(
          ticketsRes.value.totalElements ?? ticketsRes.value.content.length
        );
      }

      if (unread.status === 'fulfilled') {
        setUnreadCount(unread.value);
      }
    } catch (e: any) {
      console.log('HomeScreen data load note:', e?.message);
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHomeData(false);

    // Entrance & Fluid Progress Bar animation
    Animated.parallel([
      Animated.timing(entranceAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(progressBarAnim, {
        toValue: 1,
        duration: 950,
        delay: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();

    // Map Radar Pin Pulse Loop
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pinPulseAnim, {
          toValue: 1.45,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pinPulseAnim, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => pulseLoop.stop();
  }, [loadHomeData]);

  const initials = (authUser?.fullName?.trim() || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topAccentBar} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfoContainer}>
          {/* Lời chào thời gian */}
          <View style={styles.greetingRow}>
            <View style={styles.pingDot} />
            <Text style={styles.greetingText}>{getGreeting()}</Text>
          </View>

          {/* Tên cư dân to rõ ở trên */}
          <Text style={styles.userName} numberOfLines={1}>
            {authUser?.fullName ?? 'Cư dân CityFix'}
          </Text>

          {/* Địa chỉ hành chính trọn vẹn ở dưới */}
          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={11} color="#ea580c" />
            <Text style={styles.locationText} numberOfLines={1}>
              {formatLocation(authUser?.ward, authUser?.province)}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigate('notifications')}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={20} color="#475569" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => navigate('profile')}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Body with Pull-to-Refresh */}
      <ScrollView
        style={styles.scrollArea}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadHomeData(true)}
            colors={['#ea580c']}
            tintColor="#ea580c"
          />
        }
      >
        {/* 1. AI Smart Report Hero Banner */}
        <Animated.View
          style={[
            styles.paddingHorizontal,
            {
              opacity: entranceAnim,
              transform: [
                {
                  translateY: entranceAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [14, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: heroScaleAnim }] }}>
            <TouchableOpacity
              style={styles.aiHeroCard}
              onPress={() => navigate('location')}
              onPressIn={() =>
                Animated.spring(heroScaleAnim, {
                  toValue: 0.97,
                  useNativeDriver: true,
                }).start()
              }
              onPressOut={() =>
                Animated.spring(heroScaleAnim, {
                  toValue: 1,
                  useNativeDriver: true,
                }).start()
              }
              activeOpacity={0.92}
            >
              <View style={styles.aiHeroOrb1} />
              <View style={styles.aiHeroOrb2} />

              <View style={styles.aiHeroLeft}>
                <View style={styles.aiBadgePill}>
                  <Ionicons name="sparkles" size={11} color="#ea580c" />
                  <Text style={styles.aiBadgePillText}>AI NHẬN DIỆN TỰ ĐỘNG</Text>
                </View>
                <Text style={styles.aiHeroTitle}>Phát hiện sự cố quanh bạn?</Text>
                <Text style={styles.aiHeroSub}>
                  Chụp ảnh hiện trường để AI tự động phân loại & định vị GPS trong 30 giây.
                </Text>

                <View style={styles.aiHeroCtaBtn}>
                  <Ionicons name="camera" size={14} color="#ffffff" />
                  <Text style={styles.aiHeroCtaText}>Báo cáo sự cố ngay</Text>
                  <Ionicons name="arrow-forward" size={13} color="#ffffff" />
                </View>
              </View>

              <View style={styles.aiHeroIconBox}>
                <View style={styles.aiHeroIconInner}>
                  <Ionicons name="scan-circle" size={44} color="#ea580c" />
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

        {/* 2. Enhanced Duotone Stats Grid */}
        <View style={styles.paddingHorizontal}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIconWrap, { backgroundColor: '#fff7ed' }]}>
                <Ionicons name="warning" size={16} color="#ea580c" />
              </View>
              <Text style={[styles.statValue, { color: '#ea580c' }]}>34</Text>
              <Text style={styles.statLabel}>Sự cố hôm nay</Text>
              <Text style={[styles.statSub, { color: '#ea580c' }]}>↑12% tuần này</Text>
            </View>

            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigate('my-reports')}
              activeOpacity={0.8}
            >
              <View style={[styles.statIconWrap, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="document-text" size={16} color="#2563eb" />
              </View>
              <Text style={[styles.statValue, { color: '#2563eb' }]}>
                {totalMyReports}
              </Text>
              <Text style={styles.statLabel}>Hồ sơ của bạn</Text>
              <Text style={[styles.statSub, { color: '#2563eb' }]}>Chạm để xem →</Text>
            </TouchableOpacity>

            <View style={styles.statCard}>
              <View style={[styles.statIconWrap, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="checkmark-done-circle" size={16} color="#16a34a" />
              </View>
              <Text style={[styles.statValue, { color: '#16a34a' }]}>127</Text>
              <Text style={styles.statLabel}>Đã khắc phục</Text>
              <Text style={[styles.statSub, { color: '#16a34a' }]}>
                {`Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`}
              </Text>
            </View>
          </View>
        </View>

        {/* Priority Alert */}
        {!alertDismissed ? (
          <View style={styles.paddingHorizontal}>
            <View style={styles.alertCard}>
              <View style={styles.alertIconBox}>
                <Ionicons name="alert-circle" size={20} color="#dc2626" />
              </View>
              <TouchableOpacity
                style={styles.alertContent}
                onPress={() => {
                  Alert.alert(
                    'Cảnh báo khu vực',
                    'Khu vực Đinh Tiên Hoàng, Bình Thạnh đang ghi nhận tình trạng ngập úng nghiêm trọng do triều cường. Đội thoát nước đô thị đang khẩn trương xử lý. Vui lòng chú ý an toàn khi di chuyển.',
                    [{ text: 'Đã hiểu' }]
                  );
                }}
              >
                <View style={styles.alertTagRow}>
                  <Text style={styles.alertTagText}>CẢNH BÁO KHU VỰC</Text>
                  <View style={styles.alertDot} />
                </View>
                <Text style={styles.alertTitle}>Ngập úng nghiêm trọng · Đinh Tiên Hoàng</Text>
                <Text style={styles.alertSub}>
                  11 người đồng tình · Bình Thạnh ·{' '}
                  <Text style={{ color: '#dc2626', fontWeight: '700' }}>Xem chi tiết →</Text>
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setAlertDismissed(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* 3. Quick Categories (Unified Brand Style like Staff) */}
        <View style={[styles.paddingHorizontal, { marginTop: 20 }]}>
          <SectionLabel title="DANH MỤC BÁO CÁO NHANH" />
          <View style={styles.catsGrid}>
            {QUICK_CATS.map((cat, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.catCard}
                onPress={() => navigate('location')}
                activeOpacity={0.75}
              >
                <View style={styles.catIconBox}>
                  <MaterialCommunityIcons name={cat.icon as any} size={22} color="#f97316" />
                </View>
                <Text style={styles.catLabel}>{cat.label}</Text>
                <Text style={styles.catSub} numberOfLines={1}>
                  {cat.sub}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 4. Area Map Preview with Pulsing Live Radar Pins */}
        <View style={[styles.paddingHorizontal, { marginTop: 22 }]}>
          <SectionLabel title="BẢN ĐỒ GIÁM SÁT KHU VỰC" />
          <View style={styles.mapContainer}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=400&fit=crop&auto=format',
              }}
              style={styles.mapImage}
            />
            <View style={styles.mapOverlay} />

            {/* Live Pulsing Pins */}
            {[
              { x: '36%', y: '34%', color: '#ef4444', count: '11' },
              { x: '62%', y: '25%', color: '#f97316', count: '7' },
              { x: '22%', y: '56%', color: '#f97316', count: '4' },
              { x: '72%', y: '52%', color: '#eab308', count: '2' },
            ].map((pin, i) => (
              <View key={i} style={[styles.mapPin, { left: pin.x as any, top: pin.y as any }]}>
                <Animated.View
                  style={[
                    styles.pinPulseRing,
                    {
                      backgroundColor: pin.color + '45',
                      transform: [{ scale: pinPulseAnim }],
                    },
                  ]}
                />
                <View style={[styles.pinBadge, { backgroundColor: pin.color }]}>
                  <Text style={styles.pinText}>{pin.count}</Text>
                </View>
              </View>
            ))}

            {/* Map Legend */}
            <View style={styles.mapLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                <Text style={styles.legendText}>Khẩn cấp</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#f97316' }]} />
                <Text style={styles.legendText}>Đang xử lý</Text>
              </View>
            </View>

            {/* Total Counter */}
            <View style={styles.mapTotalBadge}>
              <Text style={styles.totalNumber}>24</Text>
              <Text style={styles.totalSub}>sự cố bán kính 5km</Text>
            </View>
          </View>
        </View>

        {/* Trending Horizontal Scroll */}
        <View style={{ marginTop: 22 }}>
          <View style={styles.paddingHorizontal}>
            <SectionLabel
              title="SỰ CỐ ĐANG ĐƯỢC QUAN TÂM"
              action="Tất cả →"
              onAction={() => navigate('my-reports')}
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingScrollContent}
          >
            {TRENDING.map((t) => (
              <View key={t.id} style={styles.trendingCard}>
                <Image source={{ uri: t.img }} style={styles.trendingImg} />
                <View style={styles.trendingBadge}>
                  <Text style={styles.trendingBadgeText}>{formatSeverity(t.severity)}</Text>
                </View>
                <View style={styles.upvoteBadge}>
                  <Feather name="thumbs-up" size={10} color="#f97316" />
                  <Text style={styles.upvoteText}>{t.upvotes}</Text>
                </View>

                <View style={styles.trendingBody}>
                  <Text style={styles.trendingCategory} numberOfLines={1}>
                    {t.category}
                  </Text>
                  <Text style={styles.trendingAddress} numberOfLines={1}>
                    {t.address}
                  </Text>
                  <View style={styles.trendingFooter}>
                    <Text style={styles.trendingDelta}>{t.delta}</Text>
                    <TouchableOpacity
                      style={styles.upvoteBtn}
                      onPress={() => {
                        Alert.alert(
                          'Đồng tình sự cố',
                          'Bạn có thể đồng tình các sự cố lân cận khi tạo báo cáo mới hoặc truy cập danh sách hồ sơ báo cáo.',
                          [
                            { text: 'Đóng', style: 'cancel' },
                            { text: 'Xem danh sách', onPress: () => navigate('my-reports') },
                          ]
                        );
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.upvoteBtnText}>Đồng tình</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* 5. Animated Fluid Processing Performance Progress */}
        <View style={[styles.paddingHorizontal, { marginTop: 22 }]}>
          <SectionLabel title="HIỆU SUẤT XỬ LÝ THEO LOẠI" />
          <View style={styles.progressBox}>
            {PERFORMANCE_ROWS.map((row, idx) => (
              <View key={idx} style={styles.progressRow}>
                <View style={styles.progressHeader}>
                  <View style={styles.progressLabelWrap}>
                    <View style={[styles.progressColorDot, { backgroundColor: row.color }]} />
                    <Text style={styles.progressLabel}>{row.label}</Text>
                  </View>
                  <View style={styles.progressRight}>
                    <Text style={styles.progressCount}>{row.count}</Text>
                    <Text style={[styles.progressPct, { color: row.color }]}>{row.pct}%</Text>
                  </View>
                </View>
                <View style={styles.progressBarTrack}>
                  <Animated.View
                    style={[
                      styles.progressBarFill,
                      {
                        backgroundColor: row.color,
                        width: progressBarAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', `${row.pct}%`],
                        }),
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* My Recent Tickets */}
        <View style={[styles.paddingHorizontal, { marginTop: 22 }]}>
          <SectionLabel
            title="HỒ SƠ BÁO CÁO GẦN ĐÂY CỦA TÔI"
            action="Xem tất cả →"
            onAction={() => navigate('my-reports')}
          />
          <View style={styles.ticketsList}>
            {realTickets.length > 0 ? (
              realTickets.slice(0, 3).map((t) => {
                const st = mapBackendStatus(t.status);
                const catName =
                  t.categoryName ||
                  t.subCategories?.[0]?.name ||
                  t.description ||
                  'Sự cố đô thị';
                const timeStr = t.createdAt
                  ? new Date(t.createdAt).toLocaleDateString('vi-VN')
                  : '';
                const isDone = st.statusKey === 'done';
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={styles.ticketCard}
                    onPress={() => openTicket?.(t.id, t)}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.ticketAccentLine,
                        { backgroundColor: st.color || '#f97316' },
                      ]}
                    />
                    <View style={styles.ticketBody}>
                      <Text style={styles.ticketCategory} numberOfLines={1}>
                        {catName}
                      </Text>
                      <Text style={styles.ticketAddress} numberOfLines={1}>
                        {t.address || 'Chưa xác định vị trí'}
                      </Text>
                      <Text style={styles.ticketTime}>{timeStr}</Text>
                    </View>
                    <View style={styles.ticketStatusCol}>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: st.bgColor,
                            borderColor: st.borderColor,
                          },
                        ]}
                      >
                        <Text style={[styles.statusText, { color: st.color }]}>
                          {st.statusText}
                        </Text>
                      </View>
                      {isDone ? (
                        <View style={styles.homeRateBadge}>
                          <Ionicons name="star" size={10} color="#f59e0b" />
                          <Text style={styles.homeRateBadgeText}>Chi tiết & Đánh giá</Text>
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyReportsBox}>
                <Ionicons name="document-text-outline" size={36} color="#94a3b8" />
                <Text style={styles.emptyReportsTitle}>Chưa có hồ sơ báo cáo nào</Text>
                <Text style={styles.emptyReportsSub}>
                  Bạn chưa tạo hồ sơ sự cố nào. Hãy bấm "TẠO BÁO CÁO MỚI" bên dưới khi phát hiện sự cố hạ tầng đô thị.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Community Feed */}
        <View style={[styles.paddingHorizontal, { marginTop: 22, marginBottom: 24 }]}>
          <SectionLabel title="HOẠT ĐỘNG CỘNG ĐỒNG" />
          <View style={styles.feedCard}>
            {COMMUNITY_FEED.map((item, i) => (
              <View key={i} style={[styles.feedItem, i > 0 && styles.feedItemBorder]}>
                <View style={styles.feedAvatar}>
                  <Text style={styles.feedAvatarText}>{item.avatar}</Text>
                </View>
                <View style={styles.feedContent}>
                  <Text style={styles.feedUserText}>
                    <Text style={{ fontWeight: '700', color: '#0f172a' }}>{item.user}</Text>{' '}
                    <Text style={{ color: '#64748b' }}>{item.action}</Text>
                  </Text>
                  <Text style={styles.feedLoc}>{item.loc}</Text>
                </View>
                <View style={styles.feedRight}>
                  <View
                    style={[
                      styles.feedDot,
                      { backgroundColor: item.report ? '#f97316' : '#94a3b8' },
                    ]}
                  />
                  <Text style={styles.feedTime}>{item.time} trước</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* FAB + Bottom Navigation */}
      <View style={styles.footerContainer}>
        <View style={styles.paddingHorizontal}>
          <TouchableOpacity
            style={styles.fabBtn}
            onPress={() => navigate('location')}
            activeOpacity={0.85}
          >
            <View style={styles.fabIconBox}>
              <Ionicons name="add" size={20} color="#ffffff" />
            </View>
            <Text style={styles.fabText}>TẠO BÁO CÁO MỚI</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomTabBar}>
          {[
            { id: 'home', label: 'Trang chủ', icon: 'home-outline' },
            { id: 'my-reports', label: 'Báo cáo', icon: 'document-text-outline' },
            { id: 'profile', label: 'Tài khoản', icon: 'person-outline' },
          ].map((tab) => {
            const active = tab.id === 'home';
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.tabItem}
                onPress={() => {
                  if (tab.id !== 'home') navigate(tab.id);
                }}
              >
                {active ? <View style={styles.tabActiveBar} /> : null}
                <Ionicons
                  name={tab.icon as any}
                  size={20}
                  color={active ? '#f97316' : '#94a3b8'}
                />
                <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  userInfoContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  pingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f97316',
  },
  greetingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
    letterSpacing: 0.2,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  scrollArea: {
    flex: 1,
  },
  paddingHorizontal: {
    paddingHorizontal: 20,
  },

  /* AI Smart Report Hero Banner */
  aiHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginTop: 14,
    borderWidth: 1.2,
    borderColor: '#fed7aa',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  aiHeroOrb1: {
    position: 'absolute',
    top: -30,
    right: -25,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
  },
  aiHeroOrb2: {
    position: 'absolute',
    bottom: -35,
    right: 40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(251, 146, 60, 0.06)',
  },
  aiHeroLeft: {
    flex: 1,
    paddingRight: 10,
  },
  aiBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginBottom: 6,
  },
  aiBadgePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ea580c',
    letterSpacing: 0.6,
  },
  aiHeroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  aiHeroSub: {
    fontSize: 11.5,
    color: '#64748b',
    lineHeight: 16.5,
    marginTop: 3,
  },
  aiHeroCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#f97316',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginTop: 10,
  },
  aiHeroCtaText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  aiHeroIconBox: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiHeroIconInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Section Header */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orangeIndicator: {
    width: 4,
    height: 14,
    backgroundColor: '#f97316',
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 1,
  },
  actionBtn: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#ea580c',
  },

  /* Stats Grid */
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 21,
    fontWeight: '800',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
  },
  statSub: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },

  /* Priority Alert */
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginTop: 14,
  },
  alertIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertTagText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#dc2626',
    letterSpacing: 1,
  },
  alertDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#dc2626',
  },
  alertTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  alertSub: {
    fontSize: 10.5,
    color: '#7f1d1d',
    marginTop: 2,
  },

  /* Quick Categories Grid */
  catsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catCard: {
    width: (SCREEN_WIDTH - 40 - 16) / 3,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  catIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 7,
  },
  catLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  catSub: {
    fontSize: 9.5,
    color: '#64748b',
    marginTop: 2,
    textAlign: 'center',
  },

  /* Area Map */
  mapContainer: {
    height: 185,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
  },
  mapPin: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinPulseRing: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  pinBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  pinText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  mapLegend: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  mapTotalBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  totalNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ea580c',
  },
  totalSub: {
    fontSize: 8.5,
    color: '#64748b',
    fontWeight: '600',
  },

  /* Trending Horizontal Scroll */
  trendingScrollContent: {
    paddingLeft: 20,
    paddingRight: 10,
    gap: 12,
  },
  trendingCard: {
    width: 215,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  trendingImg: {
    width: '100%',
    height: 112,
  },
  trendingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  trendingBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#dc2626',
  },
  upvoteBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  upvoteText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ea580c',
  },
  trendingBody: {
    padding: 12,
  },
  trendingCategory: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  trendingAddress: {
    fontSize: 10.5,
    color: '#64748b',
    marginTop: 2,
  },
  trendingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  trendingDelta: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#16a34a',
  },
  upvoteBtn: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  upvoteBtnText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#ea580c',
  },

  /* Processing Progress Box */
  progressBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  progressRow: {
    gap: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressColorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  progressLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
  progressRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressCount: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  progressPct: {
    fontSize: 11,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  /* My Recent Tickets */
  ticketsList: {
    gap: 10,
  },
  ticketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 13,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  ticketAccentLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3.5,
    backgroundColor: '#f97316',
  },
  ticketBody: {
    flex: 1,
    paddingLeft: 8,
    paddingRight: 8,
  },
  ticketCategory: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  ticketAddress: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  ticketTime: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 3,
  },
  ticketStatusCol: {
    alignItems: 'flex-end',
    gap: 5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  homeRateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fdba74',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  homeRateBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#ea580c',
  },

  /* Community Feed */
  feedCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  feedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  feedItemBorder: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  feedAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedAvatarText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  feedContent: {
    flex: 1,
  },
  feedUserText: {
    fontSize: 12,
  },
  feedLoc: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  feedRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  emptyReportsBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    marginVertical: 4,
  },
  emptyReportsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
    marginBottom: 4,
  },
  emptyReportsSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  feedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  feedTime: {
    fontSize: 9,
    color: '#94a3b8',
  },

  /* Footer & FAB */
  footerContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  fabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f97316',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 8,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  fabIconBox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.8,
  },

  /* Bottom Tab Bar */
  bottomTabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    paddingTop: 8,
    paddingBottom: 20,
  },
  tabItem: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    position: 'relative',
  },
  tabActiveBar: {
    position: 'absolute',
    top: -8,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#f97316',
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabLabelActive: {
    color: '#ea580c',
    fontWeight: '700',
  },
});
