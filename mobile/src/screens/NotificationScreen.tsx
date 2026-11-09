import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  StatusBar,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  NotificationItem,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../api';
import { Haptics } from '../utils/haptics';

interface Props {
  navigate: (screen: string) => void;
  goBack: () => void;
  openTicket?: (ticketId: string) => void;
}

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (isNaN(diffSec)) return dateStr;
  if (diffSec < 60) return 'Vừa xong';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Tải TOÀN BỘ thông báo từ máy chủ (không giới hạn 50 phần tử)
 */
async function fetchAllNotifications(): Promise<NotificationItem[]> {
  let allItems: NotificationItem[] = [];
  let page = 0;
  const requestedSize = 200;
  let hasMore = true;

  while (hasMore) {
    try {
      const res: any = await getNotifications(undefined, page, requestedSize, 'createdAt,desc');
      const batch: NotificationItem[] = Array.isArray(res)
        ? res
        : Array.isArray(res?.content)
        ? res.content
        : [];

      if (batch.length === 0) {
        break;
      }

      allItems = allItems.concat(batch);

      const serverTotal = typeof res?.totalElements === 'number' ? res.totalElements : undefined;
      const totalPages = typeof res?.totalPages === 'number' ? res.totalPages : undefined;

      if (serverTotal !== undefined && allItems.length >= serverTotal) {
        hasMore = false;
      } else if (totalPages !== undefined && page + 1 >= totalPages) {
        hasMore = false;
      } else if (batch.length < 50) {
        // Backend trả về ít hơn 50 phần tử tức là đã tải đến trang cuối cùng
        hasMore = false;
      } else {
        page++;
        if (page >= 15) break; // Giới hạn an toàn tối đa 15 trang
      }
    } catch (err) {
      console.warn(`Lỗi khi tải thông báo trang ${page}:`, err);
      break;
    }
  }

  // Khử trùng lặp theo notificationId
  const uniqueMap = new Map<string, NotificationItem>();
  allItems.forEach((item) => {
    if (item.notificationId) {
      uniqueMap.set(item.notificationId, item);
    }
  });

  return Array.from(uniqueMap.values());
}

function NotificationSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4, 5].map((key) => (
        <View key={key} style={styles.skeletonRow}>
          <View style={styles.skeletonIconBox} />
          <View style={styles.skeletonContent}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonBody} />
            <View style={styles.skeletonBodyShort} />
            <View style={styles.skeletonFooterRow}>
              <View style={styles.skeletonTime} />
              <View style={styles.skeletonLink} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

function NotificationScreen({
  navigate,
  goBack,
  openTicket,
}: Props) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [items, unreadApiCount] = await Promise.all([
        fetchAllNotifications(),
        getUnreadNotificationCount().catch(() => 0),
      ]);

      const localUnread = items.filter((n) => !n.read).length;
      const finalUnread = Math.max(unreadApiCount, localUnread);
      const finalTotal = Math.max(items.length, finalUnread);

      setNotifications(items);
      setTotalCount(finalTotal);
      setUnreadCount(finalUnread);
    } catch (err) {
      console.warn('Lỗi khi tải thông báo:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleTabChange = (newFilter: 'all' | 'unread') => {
    setFilter(newFilter);
  };

  const handleItemPress = async (item: NotificationItem) => {
    if (!item.read) {
      try {
        await markNotificationAsRead(item.notificationId);
        setNotifications((prev) =>
          prev.map((n) =>
            n.notificationId === item.notificationId
              ? { ...n, read: true, readAt: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (e) {
        console.warn('Lỗi đánh dấu đã đọc:', e);
      }
    }

    if (item.ticketId && openTicket) {
      openTicket(item.ticketId);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || markingAll) return;

    setMarkingAll(true);
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          read: true,
          readAt: new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
    } catch (e) {
      console.warn('Lỗi đánh dấu tất cả đã đọc:', e);
    } finally {
      setMarkingAll(false);
    }
  };

  const displayedList = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.read);
    }
    return notifications;
  }, [filter, notifications]);

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[styles.notificationRow, !item.read && styles.notificationRowUnread]}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${item.title || 'Thông báo hệ thống'}. ${item.read ? 'Đã đọc' : 'Chưa đọc'}`}
    >
      <View style={[styles.iconBox, !item.read && styles.iconBoxUnread]}>
        <Ionicons
          name={item.ticketId ? 'document-text-outline' : 'notifications-outline'}
          size={20}
          color={!item.read ? '#C2410C' : '#64748B'}
        />
      </View>

      <View style={styles.itemContent}>
        <View style={styles.itemHeaderRow}>
          <Text
            style={[styles.itemTitle, !item.read && styles.itemTitleUnread]}
            numberOfLines={2}
          >
            {item.title || 'Thông báo hệ thống'}
          </Text>
          {!item.read && <View style={styles.unreadDot} />}
        </View>

        <Text style={styles.itemBody} numberOfLines={3}>
          {item.content}
        </Text>

        <View style={styles.itemFooterRow}>
          <Text style={styles.itemTime}>{formatRelativeTime(item.createdAt)}</Text>
          {item.ticketId && (
            <View style={styles.ticketLinkRow}>
              <Text style={styles.ticketLinkText}>Xem chi tiết</Text>
              <Ionicons name="chevron-forward" size={13} color="#475569" />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            goBack();
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <Ionicons name="arrow-back" size={21} color="#1E293B" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Thông báo</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>

        {unreadCount > 0 ? (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllAsRead}
            disabled={markingAll}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={[styles.markAllText, markingAll && styles.disabledText]}>
              {markingAll ? 'Đang xử lý...' : 'Đọc tất cả'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerActionPlaceholder} />
        )}
      </View>

      <View style={styles.summaryBar}>
        <View>
          <Text style={styles.summaryTitle}>Trung tâm thông báo</Text>
          <Text style={styles.summarySubtitle}>
            Cập nhật hồ sơ và hoạt động hệ thống
          </Text>
        </View>
        <Ionicons name="notifications-outline" size={21} color="#64748B" />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabItem, filter === 'all' && styles.tabItemActive]}
          onPress={() => handleTabChange('all')}
          activeOpacity={0.8}
          accessibilityRole="tab"
          accessibilityState={{ selected: filter === 'all' }}
        >
          <Text style={[styles.tabText, filter === 'all' && styles.tabTextActive]}>
            Tất cả
          </Text>
          <View style={[styles.tabCount, filter === 'all' && styles.tabCountActive]}>
            <Text style={[styles.tabCountText, filter === 'all' && styles.tabCountTextActive]}>
              {totalCount > 999 ? '999+' : totalCount}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, filter === 'unread' && styles.tabItemActive]}
          onPress={() => handleTabChange('unread')}
          activeOpacity={0.8}
          accessibilityRole="tab"
          accessibilityState={{ selected: filter === 'unread' }}
        >
          <Text style={[styles.tabText, filter === 'unread' && styles.tabTextActive]}>
            Chưa đọc
          </Text>
          {unreadCount > 0 && (
            <View style={[styles.tabCount, filter === 'unread' && styles.tabCountActive]}>
              <Text style={[styles.tabCountText, filter === 'unread' && styles.tabCountTextActive]}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <NotificationSkeleton />
      ) : (
        <FlatList
          data={displayedList}
          keyExtractor={(item) => item.notificationId}
          renderItem={renderItem}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={11}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#64748B"
              colors={['#64748B']}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            displayedList.length === 0 && styles.emptyListContent,
          ]}
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons
                  name="notifications-off-outline"
                  size={27}
                  color="#64748B"
                />
              </View>
              <Text style={styles.emptyTitle}>
                {filter === 'unread'
                  ? 'Không có thông báo chưa đọc'
                  : 'Chưa có thông báo nào'}
              </Text>
              <Text style={styles.emptySubtitle}>
                Các cập nhật về hồ sơ và hoạt động hệ thống sẽ hiển thị tại đây.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  skeletonRow: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  skeletonIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  skeletonContent: {
    flex: 1,
    gap: 8,
  },
  skeletonTitle: {
    width: '65%',
    height: 14,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  skeletonBody: {
    width: '95%',
    height: 11,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
  },
  skeletonBodyShort: {
    width: '80%',
    height: 11,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
  },
  skeletonFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  skeletonTime: {
    width: 70,
    height: 10,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
  },
  skeletonLink: {
    width: 80,
    height: 10,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
  },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 4 : 0,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '700',
  },
  markAllButton: {
    minWidth: 78,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  markAllText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  disabledText: {
    opacity: 0.55,
  },
  headerActionPlaceholder: {
    width: 78,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  summaryTitle: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
  },
  summarySubtitle: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 36,
    paddingHorizontal: 13,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  tabItemActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#C2410C',
    fontWeight: '700',
  },
  tabCount: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  tabCountActive: {
    backgroundColor: '#FFEDD5',
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  tabCountTextActive: {
    color: '#C2410C',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  notificationRow: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  notificationRowUnread: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FDBA74',
    borderLeftWidth: 3,
    borderLeftColor: '#EA580C',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxUnread: {
    backgroundColor: '#FFEDD5',
  },
  itemContent: {
    flex: 1,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
    lineHeight: 19,
  },
  itemTitleUnread: {
    color: '#0F172A',
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EA580C',
    marginTop: 5,
  },
  itemBody: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 4,
  },
  itemFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  itemTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  ticketLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ticketLinkText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C2410C',
  },
  itemSeparator: {
    height: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 30,
  },
  emptyIconBox: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default NotificationScreen;
