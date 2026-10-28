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
  Modal,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthUser } from './LoginScreen';
import {
  getMyReportedTickets,
  getMyUpvotedTickets,
  ReportedTicket,
  mapBackendStatus,
  createRating,
  updateRating,
  getMyRating,
  TicketRating,
} from '../api';

const RATING_LABELS: Record<number, { text: string; color: string }> = {
  1: { text: 'Rất tệ', color: '#ef4444' },
  2: { text: 'Chưa đạt', color: '#f97316' },
  3: { text: 'Bình thường', color: '#eab308' },
  4: { text: 'Hài lòng', color: '#84cc16' },
  5: { text: 'Rất hài lòng!', color: '#16a34a' },
};

interface Props {
  navigate: (screen: string) => void;
  authUser: AuthUser | null;
  openTicket: (id: string, ticketObj?: ReportedTicket) => void;
}

type TabKey = 'my_reports' | 'upvoted';
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

export default function MyReportsScreen({ navigate, authUser, openTicket }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('my_reports');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [tickets, setTickets] = useState<ReportedTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rating Modal state directly on MyReportsScreen
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedTicketForRating, setSelectedTicketForRating] = useState<ReportedTicket | null>(null);
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [ratingFeedback, setRatingFeedback] = useState<string>('');
  const [isAnonymousRating, setIsAnonymousRating] = useState<boolean>(false);
  const [submittingRating, setSubmittingRating] = useState<boolean>(false);
  const [editingRatingId, setEditingRatingId] = useState<string | null>(null);
  const [ratedTicketIds, setRatedTicketIds] = useState<Set<string>>(new Set());

  const fetchTickets = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = activeTab === 'my_reports'
        ? await getMyReportedTickets(null, 0, 50, 'createdAt,desc')
        : await getMyUpvotedTickets(null, 0, 50, 'createdAt,desc');

      if (res && Array.isArray(res.content)) {
        setTickets(res.content);

        // Kiểm tra những vé đã hoàn thành xem vé nào đã được đánh giá để ẩn khung ngôi sao
        const resolvedTickets = res.content.filter(
          (t) => mapBackendStatus(t.status).statusKey === 'done'
        );
        if (resolvedTickets.length > 0) {
          Promise.allSettled(
            resolvedTickets.map((t) =>
              getMyRating(t.id)
                .then((r) => (r ? t.id : null))
                .catch(() => null)
            )
          ).then((results) => {
            const newlyRatedIds = new Set<string>();
            results.forEach((r) => {
              if (r.status === 'fulfilled' && r.value) {
                newlyRatedIds.add(r.value);
              }
            });
            if (newlyRatedIds.size > 0) {
              setRatedTicketIds((prev) => new Set([...prev, ...newlyRatedIds]));
            }
          });
        }
      } else {
        setTickets([]);
      }
    } catch (err: any) {
      console.warn('⚠️ Lỗi tải danh sách vé:', err);
      setTickets([]);
      setError(
        err?.message ||
        (activeTab === 'my_reports'
          ? 'Không thể tải danh sách báo cáo từ máy chủ.'
          : 'Không thể tải danh sách vé đã upvote từ máy chủ.')
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleOpenRating = async (ticket: ReportedTicket) => {
    setSelectedTicketForRating(ticket);
    setRatingScore(5);
    setRatingFeedback('');
    setIsAnonymousRating(false);
    setEditingRatingId(null);
    setRatingModalVisible(true);

    try {
      const my = await getMyRating(ticket.id);
      if (my) {
        setRatingScore(my.rate || 5);
        setRatingFeedback(my.feedback || '');
        setIsAnonymousRating(Boolean(my.isAnonymous));
        setEditingRatingId(my.id);
        setRatedTicketIds((prev) => new Set([...prev, ticket.id]));
      }
    } catch {
      // Chưa đánh giá, giữ giá trị mặc định
    }
  };

  const handleSubmitRating = async () => {
    if (!selectedTicketForRating) return;
    try {
      setSubmittingRating(true);
      if (editingRatingId) {
        await updateRating(selectedTicketForRating.id, editingRatingId, {
          rate: ratingScore,
          feedback: ratingFeedback.trim() || undefined,
          isAnonymous: isAnonymousRating,
        });
        Alert.alert('Thành công', 'Đánh giá của bạn đã được cập nhật thành công!');
      } else {
        await createRating(selectedTicketForRating.id, {
          rate: ratingScore,
          feedback: ratingFeedback.trim() || undefined,
          isAnonymous: isAnonymousRating,
        });
        Alert.alert('Thành công', 'Cảm ơn bạn đã gửi đánh giá chất lượng khắc phục sự cố!');
      }
      // Đánh dấu vé đã đánh giá để ẩn khung ngôi sao đánh giá ngay
      setRatedTicketIds((prev) => new Set([...prev, selectedTicketForRating.id]));
      setRatingModalVisible(false);
    } catch (err: any) {
      Alert.alert('Không thể gửi đánh giá', err?.message || 'Có lỗi xảy ra.');
    } finally {
      setSubmittingRating(false);
    }
  };

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
      <StatusBar barStyle="dark-content" />
      <View style={styles.topAccentBar} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.orangeIndicator} />
          <Text style={styles.headerTitle}>
            {activeTab === 'my_reports' ? 'BÁO CÁO CỦA TÔI' : 'VÉ TÔI ĐÃ UPVOTE'}
          </Text>
        </View>
        <Text style={styles.headerSub}>
          {authUser?.fullName ?? 'Người dân'} · {tickets.length} {activeTab === 'my_reports' ? 'vé báo cáo' : 'vé đã upvote'}
        </Text>

        {/* Tab switch */}
        <View style={styles.tabSwitchContainer}>
          <TouchableOpacity
            style={[styles.tabSwitchBtn, activeTab === 'my_reports' && styles.tabSwitchBtnActive]}
            onPress={() => {
              if (activeTab !== 'my_reports') {
                setTickets([]);
                setError(null);
                setActiveTab('my_reports');
                setFilter('all');
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="document-text"
              size={15}
              color={activeTab === 'my_reports' ? '#ea580c' : '#64748b'}
            />
            <Text style={[styles.tabSwitchText, activeTab === 'my_reports' && styles.tabSwitchTextActive]}>
              Báo cáo của tôi
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabSwitchBtn, activeTab === 'upvoted' && styles.tabSwitchBtnActive]}
            onPress={() => {
              if (activeTab !== 'upvoted') {
                setTickets([]);
                setError(null);
                setActiveTab('upvoted');
                setFilter('all');
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="thumbs-up"
              size={15}
              color={activeTab === 'upvoted' ? '#ea580c' : '#64748b'}
            />
            <Text style={[styles.tabSwitchText, activeTab === 'upvoted' && styles.tabSwitchTextActive]}>
              Vé đã upvote
            </Text>
          </TouchableOpacity>
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
              <Text style={styles.loadingText}>
                {activeTab === 'my_reports' ? 'Đang tải danh sách báo cáo...' : 'Đang tải danh sách vé đã upvote...'}
              </Text>
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

              <Text style={styles.serverErrorHint}>
                💡 Vuốt màn hình từ trên xuống để thử tải lại tự động
              </Text>
            </View>
          ) : null}

          {!loading && !error && filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons
                  name={activeTab === 'my_reports' ? 'document-text-outline' : 'thumbs-up-outline'}
                  size={32}
                  color="#94a3b8"
                />
              </View>
              <Text style={styles.emptyText}>
                {filter === 'all'
                  ? (activeTab === 'my_reports'
                      ? 'Bạn chưa gửi báo cáo sự cố nào'
                      : 'Bạn chưa upvote sự cố nào')
                  : 'Không tìm thấy vé ở trạng thái này'}
              </Text>
              {filter === 'all' ? (
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => navigate(activeTab === 'my_reports' ? 'location' : 'home')}
                >
                  <Ionicons
                    name={activeTab === 'my_reports' ? 'add-circle-outline' : 'compass-outline'}
                    size={16}
                    color="#ffffff"
                  />
                  <Text style={styles.retryBtnText}>
                    {activeTab === 'my_reports' ? 'Tạo báo cáo ngay' : 'Khám phá sự cố quanh đây'}
                  </Text>
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
            const photoUrl =
              (t.imageUrls && t.imageUrls.length > 0 ? t.imageUrls[0] : null) ||
              t.imageUrl ||
              (t.images && t.images[0]);
            const isResolved = stInfo.statusKey === 'done';
            const isAlreadyRated = ratedTicketIds.has(t.id);

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

                  {/* Ẩn khung ngôi sao đánh giá ngay nếu vé này đã được đánh giá */}
                  {isResolved && !isAlreadyRated ? (
                    <TouchableOpacity
                      style={styles.rateHighlightBadge}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleOpenRating(t);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="star" size={12} color="#ea580c" />
                      <Text style={styles.rateHighlightBadgeText}>Đánh giá ngay</Text>
                    </TouchableOpacity>
                  ) : null}

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

      {/* MODAL ĐÁNH GIÁ TRỰC TIẾP TRÊN DANH SÁCH VÉ */}
      <Modal
        visible={ratingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <View style={styles.modalStarIconBox}>
                  <Ionicons name="star" size={20} color="#f59e0b" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>
                    {editingRatingId ? 'Cập nhật đánh giá' : 'Đánh giá xử lý sự cố'}
                  </Text>
                  <Text style={styles.modalSubtitle} numberOfLines={1}>
                    {selectedTicketForRating?.categoryName ||
                      selectedTicketForRating?.subCategories?.[0]?.name ||
                      selectedTicketForRating?.description ||
                      'Sự cố đô thị'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setRatingModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Stars selection row */}
            <View style={styles.modalRatingRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRatingScore(star)}
                  style={styles.modalStarBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={star <= ratingScore ? 'star' : 'star-outline'}
                    size={38}
                    color={star <= ratingScore ? '#f59e0b' : '#cbd5e1'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.ratingLabelContainer}>
              <Text
                style={[
                  styles.ratingLabelText,
                  { color: RATING_LABELS[ratingScore]?.color || '#16a34a' },
                ]}
              >
                {RATING_LABELS[ratingScore]?.text}
              </Text>
            </View>

            {/* Feedback TextInput */}
            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>Nhận xét của bạn (không bắt buộc)</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Chia sẻ trải nghiệm về tiến độ và kết quả khắc phục sự cố..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                value={ratingFeedback}
                onChangeText={setRatingFeedback}
              />
            </View>

            {/* Anonymous switch */}
            <View style={styles.modalSwitchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Đánh giá ẩn danh</Text>
                <Text style={styles.switchSub}>Tên và ảnh của bạn sẽ không hiển thị công khai</Text>
              </View>
              <Switch
                value={isAnonymousRating}
                onValueChange={setIsAnonymousRating}
                trackColor={{ false: '#cbd5e1', true: '#fed7aa' }}
                thumbColor={isAnonymousRating ? '#ea580c' : '#f8fafc'}
              />
            </View>

            {/* Actions */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRatingModalVisible(false)}
                disabled={submittingRating}
              >
                <Text style={styles.modalCancelText}>HỦY</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSubmitRating}
                disabled={submittingRating}
                activeOpacity={0.85}
              >
                {submittingRating ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                    <Text style={styles.modalSubmitText}>
                      {editingRatingId ? 'CẬP NHẬT' : 'GỬI ĐÁNH GIÁ'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  tabSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 3,
    marginTop: 12,
    gap: 4,
  },
  tabSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabSwitchBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabSwitchText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabSwitchTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  rateHighlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rateHighlightBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#c2410c',
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
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '500',
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

  /* Server Error Card */
  serverErrorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 24,
    alignItems: 'center',
    gap: 12,
    marginVertical: 12,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  serverErrorIconBox: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  serverErrorTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  serverErrorDesc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  serverErrorDetailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
    marginBottom: 4,
    width: '100%',
  },
  serverErrorDetailText: {
    flex: 1,
    fontSize: 12,
    color: '#c2410c',
    fontWeight: '600',
  },
  serverErrorActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 6,
  },
  serverErrorRetryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ea580c',
    borderRadius: 12,
    paddingVertical: 12,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  serverErrorRetryText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  serverErrorHomeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  serverErrorHomeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  serverErrorHint: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },

  /* Rating Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 420,
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modalStarIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fffbeb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  modalRatingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 12,
  },
  modalStarBtn: {
    padding: 4,
  },
  ratingLabelContainer: {
    alignItems: 'center',
    marginBottom: 14,
  },
  ratingLabelText: {
    fontSize: 15,
    fontWeight: '800',
  },
  modalInputGroup: {
    marginBottom: 14,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  modalTextInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#0f172a',
    textAlignVertical: 'top',
    minHeight: 70,
  },
  modalSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  switchSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  modalSubmitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#ea580c',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  modalSubmitText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});
