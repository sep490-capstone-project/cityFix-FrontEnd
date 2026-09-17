import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthUser } from './LoginScreen';

interface Props {
  navigate: (screen: string) => void;
  authUser: AuthUser | null;
  openTicket: (id: string) => void;
}

export const MY_REPORTS_TICKETS = [
  {
    id: 'CF-2910',
    category: 'Đèn đường chiếu sáng không hoạt động',
    categoryKey: 'cat-002',
    address: '128 Nguyễn Trãi, Phường 3, Quận 5',
    status: 'ĐANG XỬ LÝ',
    statusKey: 'processing',
    time: '20 phút trước',
    icon: 'lightbulb-outline' as const,
  },
  {
    id: 'CF-2898',
    category: 'Nắp cống bị bể gây nguy hiểm',
    categoryKey: 'cat-005',
    address: '45 Trần Hưng Đạo, Phường Phạm Ngũ Lão, Q.1',
    status: 'ĐÃ TIẾP NHẬN',
    statusKey: 'received',
    time: '2 giờ trước',
    icon: 'water-outline' as const,
  },
  {
    id: 'CF-2853',
    category: 'Ổ gà sụt lún nguy hiểm lòng đường',
    categoryKey: 'cat-001',
    address: 'Nguyễn Văn Cừ, Q.5',
    status: 'ĐANG XỬ LÝ',
    statusKey: 'processing',
    time: '5 giờ trước',
    icon: 'car-wash' as const,
  },
  {
    id: 'CF-2750',
    category: 'Cây xanh che khuất biển báo giao thông',
    categoryKey: 'cat-004',
    address: 'Hẻm 210 Lê Văn Sỹ, Phường 10, Q.3',
    status: 'HOÀN THÀNH',
    statusKey: 'done',
    time: '3 ngày trước',
    icon: 'tree' as const,
  },
  {
    id: 'CF-2620',
    category: 'Sạt lở gạch lát vỉa hè người đi bộ',
    categoryKey: 'cat-006',
    address: 'Đinh Tiên Hoàng, Bình Thạnh',
    status: 'HOÀN THÀNH',
    statusKey: 'done',
    time: '1 tuần trước',
    icon: 'walk' as const,
  },
];

type FilterKey = 'all' | 'processing' | 'received' | 'done';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'processing', label: 'Đang xử lý' },
  { key: 'received', label: 'Đã tiếp nhận' },
  { key: 'done', label: 'Hoàn thành' },
];

export default function MyReportsScreen({ navigate, authUser, openTicket }: Props) {
  const [filter, setFilter] = useState<FilterKey>('all');

  const filtered =
    filter === 'all'
      ? MY_REPORTS_TICKETS
      : MY_REPORTS_TICKETS.filter((t) => t.statusKey === filter);

  function countFor(key: FilterKey) {
    if (key === 'all') return MY_REPORTS_TICKETS.length;
    return MY_REPORTS_TICKETS.filter((t) => t.statusKey === key).length;
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
          {authUser?.fullName ?? 'Người dân'} · {MY_REPORTS_TICKETS.length} vé báo cáo
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
      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        <View style={styles.contentPadding}>
          {filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="document-text-outline" size={32} color="#94a3b8" />
              </View>
              <Text style={styles.emptyText}>Không tìm thấy vé báo cáo nào</Text>
            </View>
          ) : null}

          {filtered.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={styles.ticketCard}
              onPress={() => openTicket(t.id)}
              activeOpacity={0.75}
            >
              <View style={styles.ticketAccentLine} />
              <View style={styles.categoryIconBox}>
                <MaterialCommunityIcons name={t.icon} size={20} color="#f97316" />
              </View>

              <View style={styles.ticketBody}>
                <Text style={styles.ticketId}>{t.id}</Text>
                <Text style={styles.ticketCategory} numberOfLines={1}>
                  {t.category}
                </Text>
                <Text style={styles.ticketAddress} numberOfLines={1}>
                  {t.address}
                </Text>
                <Text style={styles.ticketTime}>{t.time}</Text>
              </View>

              <View style={styles.ticketRight}>
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
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          ))}
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
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  ticketBody: {
    flex: 1,
  },
  ticketId: {
    fontSize: 9,
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
