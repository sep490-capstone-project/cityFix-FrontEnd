import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthUser } from '../LoginScreen';
import {
  getStaffAssignedTickets,
  ReportedTicket,
  mapBackendStatus,
  getUnreadNotificationCount,
} from '../../api';

interface Props {
  navigate: (screen: string) => void;
  authUser: AuthUser | null;
  openTicket?: (id: string, ticketObj?: ReportedTicket) => void;
}

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

function getCategoryIcon(catName?: string): any {
  const lower = (catName || '').toLowerCase();
  if (lower.includes('đèn') || lower.includes('chiếu sáng')) return 'lightbulb-outline';
  if (lower.includes('cống') || lower.includes('nước') || lower.includes('ngập')) return 'water-outline';
  if (lower.includes('ổ gà') || lower.includes('đường') || lower.includes('mặt đường')) return 'road-variant';
  if (lower.includes('cây') || lower.includes('gãy')) return 'tree';
  if (lower.includes('vỉa hè') || lower.includes('lối đi')) return 'walk';
  if (lower.includes('rác') || lower.includes('vệ sinh')) return 'trash-can-outline';
  return 'alert-circle-outline';
}

export default function StaffHomeScreen({ navigate, authUser, openTicket }: Props) {
  const [assignedTickets, setAssignedTickets] = useState<ReportedTicket[]>([]);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await getStaffAssignedTickets(null, 'all', 0, 50);
      if (res && Array.isArray(res.content)) {
        setAssignedTickets(res.content);
        setTotalElements(res.totalElements ?? res.content.length);
      }
    } catch (e: any) {
      console.log('StaffHomeScreen assigned tickets note:', e?.message);
    }

    try {
      const c = await getUnreadNotificationCount();
      setUnreadCount(c);
    } catch (e: any) {
      console.log('StaffHomeScreen unread count note:', e?.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const initials = (authUser?.fullName?.trim() || 'NV')
    .split(/\s+/)
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase();

  const totalCount = totalElements || assignedTickets.length;
  const processingCount = assignedTickets.filter(
    (t) => mapBackendStatus(t.status).statusKey === 'processing'
  ).length;
  const receivedCount = assignedTickets.filter(
    (t) => mapBackendStatus(t.status).statusKey === 'received'
  ).length;
  const doneCount = assignedTickets.filter(
    (t) => mapBackendStatus(t.status).statusKey === 'done'
  ).length;

  const urgentTickets = assignedTickets.filter((t) => {
    const sev = (t.priority || t.severity || '').toUpperCase();
    const stKey = mapBackendStatus(t.status).statusKey;
    return (sev === 'HIGH' || sev === 'CRITICAL') && stKey !== 'done' && stKey !== 'cancelled';
  });

  const completionPct =
    totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topAccentBar} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfoContainer}>
          <View style={styles.greetingRow}>
            <View style={styles.pingDot} />
            <Text style={styles.greetingText}>
              {getGreeting()} · NHÂN VIÊN XỬ LÝ HIỆN TRƯỜNG
            </Text>
          </View>
          <Text style={styles.userName} numberOfLines={1}>
            {authUser?.fullName ?? 'Nhân viên CityFix'}
          </Text>
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
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => navigate('profile')}>
            <Text style={styles.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Body */}
      <ScrollView
        style={styles.scrollArea}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            colors={['#ea580c']}
            tintColor="#ea580c"
          />
        }
      >
        {/* Stats Grid */}
        <View style={styles.paddingHorizontal}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="briefcase-outline" size={18} color="#f97316" />
              <Text style={styles.statValue}>{totalCount}</Text>
              <Text style={styles.statLabel}>Hồ sơ tiếp nhận</Text>
              <Text style={styles.statSub}>{receivedCount} chờ bắt đầu</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="construct-outline" size={18} color="#f97316" />
              <Text style={styles.statValue}>{processingCount}</Text>
              <Text style={styles.statLabel}>Đang xử lý</Text>
              <Text style={styles.statSub}>cần chụp evidence</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#16a34a" />
              <Text style={[styles.statValue, { color: '#16a34a' }]}>{doneCount}</Text>
              <Text style={styles.statLabel}>Đã hoàn thành</Text>
              <Text style={[styles.statSub, { color: '#16a34a' }]}>Tỷ lệ {completionPct}%</Text>
            </View>
          </View>
        </View>

        {/* Priority Alert for Staff if urgent tickets exist */}
        {urgentTickets.length > 0 ? (
          <View style={styles.paddingHorizontal}>
            <TouchableOpacity
              style={styles.alertCard}
              activeOpacity={0.85}
              onPress={() => openTicket?.(urgentTickets[0].id, urgentTickets[0])}
            >
              <View style={styles.alertIconBox}>
                <Ionicons name="alert-circle" size={20} color="#dc2626" />
              </View>
              <View style={styles.alertContent}>
                <View style={styles.alertTagRow}>
                  <Text style={styles.alertTagText}>HỒ SƠ ƯU TIÊN CAO ({urgentTickets.length})</Text>
                  <View style={styles.alertDot} />
                </View>
                <Text style={styles.alertTitle} numberOfLines={1}>
                  {urgentTickets[0].categoryName ||
                    urgentTickets[0].subCategories?.[0]?.name ||
                    urgentTickets[0].description ||
                    'Sự cố khẩn cấp'}
                </Text>
                <Text style={styles.alertSub} numberOfLines={1}>
                  {urgentTickets[0].address || 'Khu vực phụ trách'} ·{' '}
                  <Text style={{ color: '#dc2626', fontWeight: '700' }}>Xử lý ngay →</Text>
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Decorative Tape Divider Accent */}
        <View style={[styles.paddingHorizontal, { marginVertical: 14 }]}>
          <View style={styles.tapeDivider} />
        </View>

        {/* Quick Staff Workflow Actions */}
        <View style={styles.paddingHorizontal}>
          <SectionLabel title="THAO TÁC NGHIỆP VỤ NHANH" />
          <View style={styles.catsGrid}>
            <TouchableOpacity
              style={styles.catCard}
              onPress={() => navigate('my-reports')}
              activeOpacity={0.75}
            >
              <View style={styles.catIconBox}>
                <Ionicons name="briefcase-outline" size={22} color="#f97316" />
              </View>
              <Text style={styles.catLabel}>Tất cả hồ sơ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.catCard}
              onPress={() => navigate('my-reports')}
              activeOpacity={0.75}
            >
              <View style={styles.catIconBox}>
                <Ionicons name="camera-outline" size={22} color="#f97316" />
              </View>
              <Text style={styles.catLabel}>Nộp Evidence</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.catCard}
              onPress={() => navigate('notifications')}
              activeOpacity={0.75}
            >
              <View style={styles.catIconBox}>
                <Ionicons name="notifications-outline" size={22} color="#f97316" />
              </View>
              <Text style={styles.catLabel}>Thông báo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Staff Progress Summary */}
        <View style={[styles.paddingHorizontal, { marginTop: 20 }]}>
          <SectionLabel title="TIẾN ĐỘ GIẢI QUYẾT HỒ SƠ" />
          <View style={styles.progressBox}>
            {[
              {
                label: 'Hồ sơ đã hoàn tất xử lý',
                pct: completionPct,
                count: `${doneCount}/${totalCount}`,
              },
              {
                label: 'Hồ sơ đang triển khai tại hiện trường',
                pct: totalCount > 0 ? Math.round((processingCount / totalCount) * 100) : 0,
                count: `${processingCount}/${totalCount}`,
              },
              {
                label: 'Hồ sơ mới phân công chờ tiếp nhận',
                pct: totalCount > 0 ? Math.round((receivedCount / totalCount) * 100) : 0,
                count: `${receivedCount}/${totalCount}`,
              },
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

        {/* Assigned Tickets List */}
        <View style={[styles.paddingHorizontal, { marginTop: 20, marginBottom: 24 }]}>
          <SectionLabel
            title="HỒ SƠ TIẾP NHẬN GẦN ĐÂY"
            action="Xem tất cả →"
            onAction={() => navigate('my-reports')}
          />
          <View style={styles.ticketsList}>
            {assignedTickets.length > 0 ? (
              assignedTickets.slice(0, 6).map((t) => {
                const st = mapBackendStatus(t.status);
                const catName =
                  t.categoryName ||
                  t.subCategories?.[0]?.name ||
                  t.description ||
                  'Hồ sơ sự cố';
                const timeStr = t.createdAt
                  ? new Date(t.createdAt).toLocaleDateString('vi-VN')
                  : '';
                const iconName = getCategoryIcon(catName);
                const photoUrl =
                  (t.imageUrls && t.imageUrls.length > 0 ? t.imageUrls[0] : null) ||
                  t.imageUrl ||
                  (t.images && t.images[0]);

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
                    {photoUrl ? (
                      <Image source={{ uri: photoUrl }} style={styles.ticketThumbnail} />
                    ) : (
                      <View style={styles.categoryIconBox}>
                        <MaterialCommunityIcons name={iconName} size={20} color="#f97316" />
                      </View>
                    )}
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
              <View style={styles.emptyCard}>
                <Ionicons name="briefcase-outline" size={32} color="#94a3b8" />
                <Text style={styles.emptyCardText}>
                  Hiện chưa có hồ sơ nào được phân công cho bạn
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Staff Bottom Navigation (No Create Report FAB) */}
      <View style={styles.footerContainer}>
        <View style={styles.bottomTabBar}>
          {[
            { id: 'home', label: 'Trang chủ', icon: 'home-outline' },
            { id: 'my-reports', label: 'Hồ sơ tiếp nhận', icon: 'briefcase-outline' },
            { id: 'profile', label: 'Hồ sơ', icon: 'person-outline' },
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
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
  },
  catsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  catCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  catIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  catLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  progressBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 16,
    gap: 12,
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
    fontWeight: '600',
    color: '#334155',
  },
  progressRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressCount: {
    fontSize: 9,
    color: '#64748b',
  },
  progressPct: {
    fontSize: 11,
    fontWeight: '800',
    color: '#f97316',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#f97316',
  },
  ticketsList: {
    gap: 8,
  },
  ticketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 12,
    gap: 10,
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
    top: 8,
    bottom: 8,
    width: 3,
    backgroundColor: '#f97316',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  ticketThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketBody: {
    flex: 1,
  },
  ticketCategory: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  ticketAddress: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  ticketStatusCol: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 8,
    fontWeight: '800',
  },
  ticketTime: {
    fontSize: 8,
    color: '#94a3b8',
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 8,
  },
  emptyCardText: {
    fontSize: 12,
    color: '#64748b',
  },
  footerContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  tabActiveBar: {
    position: 'absolute',
    top: 0,
    width: 32,
    height: 2,
    backgroundColor: '#f97316',
    borderRadius: 1,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 3,
  },
  tabLabelActive: {
    color: '#f97316',
    fontWeight: '700',
  },
});

