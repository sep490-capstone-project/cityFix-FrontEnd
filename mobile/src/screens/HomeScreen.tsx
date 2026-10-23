import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthUser } from './LoginScreen';
import { getMyReportedTickets, ReportedTicket, mapBackendStatus } from '../api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  navigate: (screen: string) => void;
  authUser: AuthUser | null;
  openTicket?: (id: string, ticketObj?: any) => void;
}

const QUICK_CATS = [
  { label: 'Ổ gà', icon: 'road-variant' as const },
  { label: 'Đèn đường', icon: 'lightbulb-outline' as const },
  { label: 'Cây đổ', icon: 'tree' as const },
  { label: 'Ngập úng', icon: 'water-outline' as const },
  { label: 'Vỉa hè', icon: 'walk' as const },
  { label: 'Khác', icon: 'dots-horizontal-circle-outline' as const },
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

const MY_TICKETS = [
  {
    id: 'CF-2910',
    category: 'Đèn đường chiếu sáng không hoạt động',
    address: '128 Nguyễn Trãi, Phường 3, Quận 5',
    status: 'ĐANG XỬ LÝ',
    statusKey: 'processing',
    time: '20 phút trước',
  },
  {
    id: 'CF-2898',
    category: 'Nắp cống bị bể gây nguy hiểm',
    address: '45 Trần Hưng Đạo, Phường Phạm Ngũ Lão, Q.1',
    status: 'ĐÃ TIẾP NHẬN',
    statusKey: 'received',
    time: '2 giờ trước',
  },
  {
    id: 'CF-2750',
    category: 'Cây xanh che khuất biển báo giao thông',
    address: 'Hẻm 210 Lê Văn Sỹ, Phường 10, Q.3',
    status: 'HOÀN THÀNH',
    statusKey: 'done',
    time: '3 ngày trước',
  },
];

const COMMUNITY_FEED = [
  { time: '14 phút', user: 'Minh T.', action: 'báo cáo ổ gà', loc: 'Hoàng Diệu, Q.4', avatar: 'MT', report: true },
  { time: '32 phút', user: 'Lan N.', action: 'ủng hộ sự cố ngập úng', loc: 'Bình Thạnh', avatar: 'LN', report: false },
  { time: '1 giờ', user: 'Hùng P.', action: 'báo cáo đèn hỏng', loc: 'Lê Văn Sỹ, Q.3', avatar: 'HP', report: true },
  { time: '2 giờ', user: 'Thu M.', action: 'ủng hộ sự cố mặt đường', loc: 'Q.5', avatar: 'TM', report: false },
];

function SectionLabel({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.orangeIndicator} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action ? (
        <TouchableOpacity onPress={onAction} style={styles.actionBtn}>
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

export default function HomeScreen({ navigate, authUser, openTicket }: Props) {
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'my-reports' | 'profile'>('home');
  const [realTickets, setRealTickets] = useState<ReportedTicket[]>([]);

  useEffect(() => {
    getMyReportedTickets(null, 0, 3)
      .then((res) => {
        if (res && Array.isArray(res.content)) {
          setRealTickets(res.content);
        }
      })
      .catch((e) => console.log('HomeScreen tickets load note:', e?.message));
  }, []);

  const initials = (authUser?.fullName?.trim() || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.topAccentBar} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfoContainer}>
          <View style={styles.greetingRow}>
            <View style={styles.pingDot} />
            <Text style={styles.greetingText}>
              {getGreeting()} · {[authUser?.ward, authUser?.province].filter(Boolean).join(', ') || 'TP.HCM'}
            </Text>
          </View>
          <Text style={styles.userName} numberOfLines={1}>
            {authUser?.fullName ?? 'CityFix'}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={20} color="#475569" />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => navigate('profile')}>
            <Text style={styles.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Body */}
      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {/* Stats Grid */}
        <View style={styles.paddingHorizontal}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="warning-outline" size={18} color="#f97316" />
              <Text style={styles.statValue}>34</Text>
              <Text style={styles.statLabel}>Sự cố hôm nay</Text>
              <Text style={styles.statSub}>↑12% tuần</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="construct-outline" size={18} color="#f97316" />
              <Text style={styles.statValue}>1</Text>
              <Text style={styles.statLabel}>Đang xử lý</Text>
              <Text style={styles.statSub}>khu vực bạn</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#16a34a" />
              <Text style={[styles.statValue, { color: '#16a34a' }]}>127</Text>
              <Text style={styles.statLabel}>Hoàn thành</Text>
              <Text style={[styles.statSub, { color: '#16a34a' }]}>Tháng 9/2026</Text>
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
                onPress={() => navigate('emergency-alert')}
              >
                <View style={styles.alertTagRow}>
                  <Text style={styles.alertTagText}>CẢNH BÁO KHU VỰC</Text>
                  <View style={styles.alertDot} />
                </View>
                <Text style={styles.alertTitle}>Ngập úng nghiêm trọng · Đinh Tiên Hoàng</Text>
                <Text style={styles.alertSub}>
                  11 người upvote · Bình Thạnh · <Text style={{ color: '#dc2626', fontWeight: '700' }}>Xem chi tiết →</Text>
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setAlertDismissed(true)}>
                <Ionicons name="close" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Decorative Tape Divider Accent */}
        <View style={[styles.paddingHorizontal, { marginVertical: 14 }]}>
          <View style={styles.tapeDivider} />
        </View>

        {/* Quick Categories */}
        <View style={styles.paddingHorizontal}>
          <SectionLabel title="BÁO CÁO NHANH" />
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
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Area Map Preview */}
        <View style={[styles.paddingHorizontal, { marginTop: 20 }]}>
          <SectionLabel title="BẢN ĐỒ KHU VỰC" />
          <View style={styles.mapContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=400&fit=crop&auto=format' }}
              style={styles.mapImage}
            />
            <View style={styles.mapOverlay} />

            {/* Pins */}
            {[
              { x: '38%', y: '35%', color: '#ef4444', count: '11' },
              { x: '63%', y: '25%', color: '#f97316', count: '7' },
              { x: '24%', y: '55%', color: '#f97316', count: '4' },
              { x: '72%', y: '50%', color: '#eab308', count: '2' },
            ].map((pin, i) => (
              <View key={i} style={[styles.mapPin, { left: pin.x as any, top: pin.y as any }]}>
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
                <Text style={styles.legendText}>Xử lý</Text>
              </View>
            </View>

            {/* Total Counter */}
            <View style={styles.mapTotalBadge}>
              <Text style={styles.totalNumber}>24</Text>
              <Text style={styles.totalSub}>sự cố 5km</Text>
            </View>
          </View>
        </View>

        {/* Trending Horizontal Scroll */}
        <View style={{ marginTop: 20 }}>
          <View style={styles.paddingHorizontal}>
            <SectionLabel
              title="ĐANG ĐƯỢC QUAN TÂM"
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
                  <Text style={styles.trendingBadgeText}>{t.severity}</Text>
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
                    <TouchableOpacity style={styles.upvoteBtn}>
                      <Text style={styles.upvoteBtnText}>Upvote</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Processing Performance Progress */}
        <View style={[styles.paddingHorizontal, { marginTop: 20 }]}>
          <SectionLabel title="HIỆU SUẤT XỬ LÝ THEO LOẠI" />
          <View style={styles.progressBox}>
            {[
              { label: 'Ổ gà / Mặt đường', pct: 72, count: '18/25' },
              { label: 'Đèn đường hỏng', pct: 60, count: '9/15' },
              { label: 'Cây xanh', pct: 88, count: '7/8' },
              { label: 'Ngập úng / Thoát nước', pct: 40, count: '4/10' },
            ].map((row, idx) => (
              <View key={idx} style={styles.progressRow}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>{row.label}</Text>
                  <View style={styles.progressRight}>
                    <Text style={styles.progressCount}>{row.count}</Text>
                    <Text style={styles.progressPct}>{row.pct}%</Text>
                  </View>
                </View>
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${row.pct}%` }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* My Recent Tickets */}
        <View style={[styles.paddingHorizontal, { marginTop: 20 }]}>
          <SectionLabel
            title="VÉ GẦN ĐÂY CỦA TÔI"
            action="Xem tất cả →"
            onAction={() => navigate('my-reports')}
          />
          <View style={styles.ticketsList}>
            {realTickets.length > 0 ? (
              realTickets.slice(0, 3).map((t) => {
                const st = mapBackendStatus(t.status);
                const catName = t.categoryName || t.subCategories?.[0]?.name || t.description || 'Sự cố';
                const timeStr = t.createdAt ? new Date(t.createdAt).toLocaleDateString('vi-VN') : '';
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
                      <Text style={styles.ticketTime}>{timeStr}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              MY_TICKETS.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.ticketCard}
                  onPress={() => navigate('my-reports')}
                  activeOpacity={0.75}
                >
                  <View style={styles.ticketAccentLine} />
                  <View style={styles.ticketBody}>
                    <Text style={styles.ticketCategory} numberOfLines={1}>
                      {t.category}
                    </Text>
                    <Text style={styles.ticketAddress} numberOfLines={1}>
                      {t.address}
                    </Text>
                  </View>
                  <View style={styles.ticketStatusCol}>
                    <View
                      style={[
                        styles.statusBadge,
                        t.statusKey === 'processing'
                          ? styles.statusProcessing
                          : t.statusKey === 'done'
                          ? styles.statusDone
                          : styles.statusReceived,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          t.statusKey === 'processing'
                            ? { color: '#ea580c' }
                            : t.statusKey === 'done'
                            ? { color: '#16a34a' }
                            : { color: '#64748b' },
                        ]}
                      >
                        {t.status}
                      </Text>
                    </View>
                    <Text style={styles.ticketTime}>{t.time}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* Community Feed */}
        <View style={[styles.paddingHorizontal, { marginTop: 20, marginBottom: 24 }]}>
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
            { id: 'profile', label: 'Hồ sơ', icon: 'person-outline' },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.tabItem}
                onPress={() => {
                  setActiveTab(tab.id as any);
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
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  pingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f97316',
  },
  greetingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ea580c',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.3,
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
    top: 10,
    right: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f97316',
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
    letterSpacing: 1.2,
  },
  actionBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 10,
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
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f97316',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  statSub: {
    fontSize: 8,
    fontWeight: '700',
    color: '#ea580c',
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
    width: 32,
    height: 32,
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
    fontSize: 8,
    fontWeight: '800',
    color: '#dc2626',
    letterSpacing: 1.2,
  },
  alertDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#dc2626',
  },
  alertTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  alertSub: {
    fontSize: 10,
    color: '#7f1d1d',
    marginTop: 2,
  },

  tapeDivider: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
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
    alignItems: 'center',
    gap: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  catIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  catLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },

  /* Area Map */
  mapContainer: {
    height: 180,
    borderRadius: 16,
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
  },
  pinBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pinText: {
    fontSize: 9,
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
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0f172a',
  },
  mapTotalBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
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
    fontSize: 8,
    color: '#64748b',
  },

  /* Trending Horizontal Scroll */
  trendingScrollContent: {
    paddingLeft: 20,
    paddingRight: 10,
    gap: 12,
  },
  trendingCard: {
    width: 210,
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
    height: 110,
  },
  trendingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 4,
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
  trendingId: {
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#94a3b8',
  },
  trendingCategory: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  trendingAddress: {
    fontSize: 10,
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
    fontSize: 9,
    fontWeight: '700',
    color: '#16a34a',
  },
  upvoteBtn: {
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.25)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  upvoteBtnText: {
    fontSize: 9,
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
  progressLabel: {
    fontSize: 11,
    color: '#475569',
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
    fontSize: 10,
    fontWeight: '700',
    color: '#ea580c',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#f97316',
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
    padding: 12,
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
    width: 3,
    backgroundColor: '#f97316',
  },
  ticketBody: {
    flex: 1,
    paddingLeft: 8,
  },
  ticketId: {
    fontSize: 9,
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  ticketCategory: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  ticketAddress: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  ticketStatusCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusProcessing: {
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    borderColor: 'rgba(249, 115, 22, 0.25)',
  },
  statusDone: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  statusReceived: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  ticketTime: {
    fontSize: 9,
    color: '#94a3b8',
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
