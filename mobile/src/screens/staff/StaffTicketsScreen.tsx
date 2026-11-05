import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthUser } from '../LoginScreen';
import {
  getStaffAssignedTickets,
  ReportedTicket,
  mapBackendStatus,
} from '../../api';

interface Props {
  navigate: (screen: string) => void;
  authUser: AuthUser | null;
  openTicket: (id: string, ticketObj?: ReportedTicket) => void;
}

type FilterKey = 'all' | 'processing' | 'received' | 'done' | 'cancelled';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'received', label: 'Đã tiếp nhận' },
  { key: 'processing', label: 'Đang xử lý' },
  { key: 'done', label: 'Hoàn thành' },
  { key: 'cancelled', label: 'Đã hủy' },
];

function formatDate(dateString?: string): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '';
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

export default function StaffTicketsScreen({ navigate, authUser, openTicket }: Props) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tickets, setTickets] = useState<ReportedTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await getStaffAssignedTickets(null, 'all', 0, 50);
      if (res && Array.isArray(res.content)) {
        setTickets(res.content);
      } else {
        setTickets([]);
      }
    } catch (err: any) {
      console.warn('⚠️ Lỗi tải danh sách hồ sơ tiếp nhận:', err);
      setTickets([]);
      setError(err?.message || 'Không thể tải danh sách hồ sơ tiếp nhận từ máy chủ.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const filtered = useMemo(() => {
    let list = tickets;
    if (filter !== 'all') {
      list = list.filter((t) => mapBackendStatus(t.status).statusKey === filter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => {
        const cat = (
          t.categoryName ||
          t.subCategories?.[0]?.name ||
          t.description ||
          ''
        ).toLowerCase();
        const addr = (t.address || '').toLowerCase();
        const idStr = (t.id || '').toLowerCase();
        return cat.includes(q) || addr.includes(q) || idStr.includes(q);
      });
    }
    return list;
  }, [tickets, filter, searchQuery]);

  function countFor(key: FilterKey) {
    if (key === 'all') return tickets.length;
    return tickets.filter((t) => mapBackendStatus(t.status).statusKey === key).length;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topAccentBar} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.orangeIndicator} />
          <Text style={styles.headerTitle}>HỒ SƠ TIẾP NHẬN</Text>
        </View>
        <Text style={styles.headerSub}>
          {authUser?.fullName ?? 'Nhân viên xử lý'} · {tickets.length} hồ sơ được phân công
        </Text>

        {/* Search Input */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo loại sự cố, địa chỉ, mã hồ sơ..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
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
              <Text style={styles.loadingText}>Đang tải danh sách hồ sơ tiếp nhận...</Text>
            </View>
          ) : null}

          {error && !loading ? (
            <View style={styles.serverErrorCard}>
              <View style={styles.serverErrorIconBox}>
                <Ionicons name="cloud-offline-outline" size={44} color="#ea580c" />
              </View>
              <Text style={styles.serverErrorTitle}>Hệ thống tạm thời gián đoạn</Text>
              <View style={styles.serverErrorActions}>
                <TouchableOpacity
                  style={styles.serverErrorRetryBtn}
                  onPress={() => fetchTickets(false)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="reload-outline" size={16} color="#ffffff" />
                  <Text style={styles.serverErrorRetryText}>Thử tải lại</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.serverErrorHomeBtn}
                  onPress={() => navigate('home')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="home-outline" size={16} color="#475569" />
                  <Text style={styles.serverErrorHomeText}>Về trang chủ</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {!loading && !error && filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="briefcase-outline" size={32} color="#94a3b8" />
              </View>
              <Text style={styles.emptyText}>
                {filter === 'all' && !searchQuery
                  ? 'Hiện chưa có hồ sơ nào được phân công cho bạn'
                  : 'Không tìm thấy hồ sơ phù hợp với bộ lọc'}
              </Text>
            </View>
          ) : null}

          {!loading &&
            filtered.map((t) => {
              const stInfo = mapBackendStatus(t.status);
              const catName =
                t.categoryName ||
                t.subCategories?.[0]?.name ||
                t.description ||
                'Sự cố đô thị';
              const iconName = getCategoryIcon(catName);
              const photoUrl =
                (t.imageUrls && t.imageUrls.length > 0 ? t.imageUrls[0] : null) ||
                t.imageUrl ||
                (t.images && t.images[0]);
              const isResolved = stInfo.statusKey === 'done';

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
                    <Text style={styles.ticketTime}>{formatDate(t.createdAt)}</Text>
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

                    {!isResolved ? (
                      <View style={styles.processHighlightBadge}>
                        <Ionicons name="camera" size={12} color="#ea580c" />
                        <Text style={styles.processHighlightBadgeText}>Xử lý bước</Text>
                      </View>
                    ) : null}

                    <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                  </View>
                </TouchableOpacity>
              );
            })}
        </View>
      </ScrollView>

      {/* Staff Bottom Navigation */}
      <View style={styles.footerContainer}>
        <View style={styles.bottomTabBar}>
          {[
            { id: 'home', label: 'Trang chủ', icon: 'home-outline' },
            { id: 'my-reports', label: 'Hồ sơ tiếp nhận', icon: 'briefcase-outline' },
            { id: 'profile', label: 'Tài khoản', icon: 'person-outline' },
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a',
    paddingVertical: 0,
  },
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
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  countText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  countTextActive: {
    color: '#ffffff',
  },
  scrollArea: {
    flex: 1,
  },
  contentPadding: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
  },
  serverErrorCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  serverErrorIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serverErrorTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  serverErrorActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  serverErrorRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ea580c',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  serverErrorRetryText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  serverErrorHomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  serverErrorHomeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  ticketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 12,
    gap: 12,
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
    width: 48,
    height: 48,
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
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 4,
  },
  ticketRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  processHighlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fdba74',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  processHighlightBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ea580c',
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

