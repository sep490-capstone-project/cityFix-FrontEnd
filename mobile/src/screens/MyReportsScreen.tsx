import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthUser } from './LoginScreen';
import {
  getMyReportedTickets,
  ReportedTicket,
  mapBackendStatus,
} from '../api';

interface Props {
  navigate: (screen: string) => void;
  authUser: AuthUser | null;
  openTicket: (id: string, ticketObj?: ReportedTicket) => void;
}

type FilterKey = 'all' | 'processing' | 'received' | 'done';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'processing', label: 'Đang xử lý' },
  { key: 'received', label: 'Đã tiếp nhận' },
  { key: 'done', label: 'Hoàn thành' },
];

function formatTimeAgo(dateString?: string): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ngày trước`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
    return d.toLocaleDateString('vi-VN');
  } catch {
    return dateString;
  }
}

function getCategoryIcon(catName?: string): any {
  const lower = (catName || '').toLowerCase();
  if (lower.includes('đèn') || lower.includes('chiếu sáng')) return 'lightbulb-outline';
  if (lower.includes('cống') || lower.includes('nước') || lower.includes('ngập')) return 'water-outline';
  if (lower.includes('ổ gà') || lower.includes('đường') || lower.includes('mặt đường')) return 'car-wash';
  if (lower.includes('cây') || lower.includes('gãy')) return 'tree';
  if (lower.includes('vỉa hè') || lower.includes('lối đi')) return 'walk';
  if (lower.includes('rác') || lower.includes('vệ sinh')) return 'trash-can-outline';
  return 'alert-circle-outline';
}

export default function MyReportsScreen({ navigate, authUser, openTicket }: Props) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [tickets, setTickets] = useState<ReportedTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await getMyReportedTickets(null, 0, 50, 'createdAt,desc');
      if (res && Array.isArray(res.content)) {
        setTickets(res.content);
      } else {
        setTickets([]);
      }
    } catch (err: any) {
      console.error('❌ Lỗi tải danh sách báo cáo:', err);
      setError(err?.message || 'Không thể tải danh sách báo cáo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const filtered = useMemo(() => {
    if (filter === 'all') return tickets;
    return tickets.filter((t) => {
      const { statusKey } = mapBackendStatus(t.status);
      return statusKey === filter;
    });
  }, [tickets, filter]);

  function countFor(key: FilterKey) {
    if (key === 'all') return tickets.length;
    return tickets.filter((t) => mapBackendStatus(t.status).statusKey === key).length;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.topAccentBar} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.orangeIndicator} />
          <Text style={styles.headerTitle}>BÁO CÁO CỦA TÔI</Text>
        </View>
        <Text style={styles.headerSub}>
          {authUser?.fullName ?? 'Người dân'} · {tickets.length} vé báo cáo
        </Text>
      </View>

      {/* Filter Chips Bar */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {FILTERS.map((f) => {
            const count = countFor(f.key);
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, active ? styles.filterChipActive : null]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterText, active ? styles.filterTextActive : null]}>
                  {f.label}
                </Text>
                <View style={[styles.countBadge, active ? styles.countBadgeActive : null]}>
                  <Text style={[styles.countText, active ? styles.countTextActive : null]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Ticket List Area */}
      <ScrollView
        style={styles.scrollArea}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchTickets(true)}
            colors={['#ea580c']}
            tintColor="#ea580c"
          />
        }
      >
        <View style={styles.contentPadding}>
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ea580c" />
              <Text style={styles.loadingText}>Đang tải danh sách báo cáo...</Text>
            </View>
          ) : null}

          {error && !loading && tickets.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconBox, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="alert-circle-outline" size={32} color="#dc2626" />
              </View>
              <Text style={[styles.emptyText, { color: '#dc2626' }]}>{error}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => fetchTickets(false)}
              >
                <Ionicons name="reload-outline" size={16} color="#ffffff" />
                <Text style={styles.retryBtnText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!loading && !error && filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="document-text-outline" size={32} color="#94a3b8" />
              </View>
              <Text style={styles.emptyText}>
                {filter === 'all'
                  ? 'Bạn chưa gửi báo cáo sự cố nào'
                  : 'Không tìm thấy vé báo cáo ở trạng thái này'}
              </Text>
              {filter === 'all' ? (
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => navigate('location')}
                >
                  <Ionicons name="add-circle-outline" size={16} color="#ffffff" />
                  <Text style={styles.retryBtnText}>Tạo báo cáo ngay</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {!loading && filtered.map((t) => {
            const stInfo = mapBackendStatus(t.status);
            const catName =
              t.categoryName ||
              t.subCategories?.[0]?.name ||
              t.description ||
              'Sự cố đô thị';
            const iconName = getCategoryIcon(catName);
            const photoUrl = t.imageUrl || (t.images && t.images[0]);

            return (
              <TouchableOpacity
                key={t.id}
                style={styles.ticketCard}
                onPress={() => openTicket(t.id, t)}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.ticketAccentLine,
                    { backgroundColor: stInfo.color || '#f97316' },
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
                  <Text style={styles.ticketTime}>{formatTimeAgo(t.createdAt)}</Text>
                </View>

                <View style={styles.ticketRight}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: stInfo.bgColor,
                        borderColor: stInfo.borderColor,
                      },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: stInfo.color }]}>
                      {stInfo.statusText}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* CTA FAB + Bottom Navigation */}
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

        {/* Bottom Tab Bar */}
        <View style={styles.bottomTabBar}>
          {[
            { id: 'home', label: 'Trang chủ', icon: 'home-outline' },
            { id: 'my-reports', label: 'Báo cáo', icon: 'document-text-outline' },
            { id: 'profile', label: 'Hồ sơ', icon: 'person-outline' },
          ].map((tab) => {
            const active = tab.id === 'my-reports';
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.tabItem}
                onPress={() => navigate(tab.id)}
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orangeIndicator: {
    width: 4,
    height: 18,
    backgroundColor: '#f97316',
    borderRadius: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },

  /* Filter Bar */
  filterContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 10,
  },
  filterScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#ea580c',
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  countTextActive: {
    color: '#ea580c',
  },

  /* Scroll Area */
  scrollArea: {
    flex: 1,
  },
  contentPadding: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ea580c',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },

  /* Ticket Card */
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
    gap: 12,
  },
  ticketAccentLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#f97316',
  },
  categoryIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  ticketThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    marginLeft: 4,
  },
  ticketBody: {
    flex: 1,
  },
  ticketId: {
    fontSize: 9,
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
  },
  ticketCategory: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  ticketAddress: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  ticketTime: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 4,
  },
  ticketRight: {
    alignItems: 'flex-end',
    gap: 6,
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

  /* Footer & FAB */
  footerContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  paddingHorizontal: {
    paddingHorizontal: 20,
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
