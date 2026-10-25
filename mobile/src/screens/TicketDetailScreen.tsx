import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  ReportedTicket,
  mapBackendStatus,
  cancelTicket,
  getTicketById,
  TicketRating,
  getMyRating,
  getTicketRatings,
  createRating,
  updateRating,
  deleteRating,
} from '../api';

const RATING_LABELS: Record<number, { text: string; color: string }> = {
  1: { text: 'Rất tệ', color: '#ef4444' },
  2: { text: 'Chưa đạt', color: '#f97316' },
  3: { text: 'Bình thường', color: '#eab308' },
  4: { text: 'Hài lòng', color: '#84cc16' },
  5: { text: 'Rất hài lòng!', color: '#16a34a' },
};

interface Props {
  ticketId: string | null;
  ticketData?: ReportedTicket | null;
  goBack: () => void;
  navigate: (s: string) => void;
  onTicketCancelled?: (updatedTicket: ReportedTicket) => void;
}

export interface Ticket {
  id: string;
  category: string;
  address: string;
  submittedAt: string;
  locationMethod: 'AUTO_GPS' | 'MANUAL_PIN';
  agency: string;
  deadline: string;
  upvotes: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: string;
  statusKey: 'processing' | 'received' | 'done' | 'rejected' | 'cancelled';
  description: string;
  imageUrl: string;
  rawStatus?: string;
}

export const MOCK_TICKETS_FULL: Ticket[] = [
  {
    id: 'CF-2910',
    category: 'Đèn đường chiếu sáng không hoạt động',
    address: '128 Nguyễn Trãi, Phường 3, Quận 5, TP.HCM',
    submittedAt: '20 phút trước (08:15 17/09/2026)',
    locationMethod: 'AUTO_GPS',
    agency: 'Công ty Chiếu sáng Công cộng TP.HCM',
    deadline: '24 giờ (trước 08:15 18/09/2026)',
    upvotes: 14,
    severity: 'MEDIUM',
    status: 'ĐANG XỬ LÝ',
    statusKey: 'processing',
    description:
      'Đèn đường đoạn trước số nhà 128 Nguyễn Trãi bị chập chập tắt liên tục từ tối qua, sau đó tắt hẳn gây nguy hiểm cho người tham gia giao thông ban đêm.',
    imageUrl:
      'https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?w=800&h=400&fit=crop&auto=format',
  },
  {
    id: 'CF-2898',
    category: 'Nắp cống bị bể gây nguy hiểm',
    address: '45 Trần Hưng Đạo, Phường Phạm Ngũ Lão, Q.1',
    submittedAt: '2 giờ trước (06:30 17/09/2026)',
    locationMethod: 'MANUAL_PIN',
    agency: 'Công ty TNHH MTV Thủy lợi & Cấp thoát nước',
    deadline: '12 giờ (trước 18:30 17/09/2026)',
    upvotes: 8,
    severity: 'HIGH',
    status: 'ĐÃ TIẾP NHẬN',
    statusKey: 'received',
    description:
      'Tấm bê tông nắp cống nứt bể tạo khoảng trống khoảng 30cm trên lòng đường, xe máy rất dễ sụp hố vào buổi tối.',
    imageUrl:
      'https://images.unsplash.com/photo-1542393545-10f5cde2c810?w=800&h=400&fit=crop&auto=format',
  },
  {
    id: 'CF-2750',
    category: 'Cây xanh che khuất biển báo giao thông',
    address: 'Hẻm 210 Lê Văn Sỹ, Phường 10, Q.3',
    submittedAt: '3 ngày trước (14/09/2026)',
    locationMethod: 'AUTO_GPS',
    agency: 'Công ty Công viên Cây xanh TP.HCM',
    deadline: 'Đã hoàn thành',
    upvotes: 22,
    severity: 'LOW',
    status: 'HOÀN THÀNH',
    statusKey: 'done',
    description:
      'Tán cây phượng lớn che hoàn toàn biển báo đường một chiều tại đầu hẻm 210, nhân viên cây xanh đã tỉa cành gọn gàng.',
    imageUrl:
      'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=800&h=400&fit=crop&auto=format',
  },
];

const STATUS_MAP = {
  processing: { label: 'Đang xử lý', color: '#ea580c', bg: 'rgba(249, 115, 22, 0.08)', border: 'rgba(249, 115, 22, 0.25)' },
  received: { label: 'Đã tiếp nhận', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
  done: { label: 'Hoàn thành', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  rejected: { label: 'Từ chối', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  cancelled: { label: 'Đã hủy', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
};

const SEVERITY_MAP = {
  LOW: { label: 'Thấp', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  MEDIUM: { label: 'Trung bình', color: '#ea580c', bg: 'rgba(249, 115, 22, 0.08)', border: 'rgba(249, 115, 22, 0.25)' },
  HIGH: { label: 'Cao', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  CRITICAL: { label: 'Nghiêm trọng', color: '#991b1b', bg: '#fee2e2', border: '#f87171' },
};

function getTimeline(statusKey: string) {
  if (statusKey === 'cancelled') {
    return [
      { key: 'received', label: 'Đã tiếp nhận', desc: 'Hệ thống đã ghi nhận báo cáo từ người dân', done: true, active: false },
      { key: 'cancelled', label: 'Đã hủy', desc: 'Người dân đã hủy yêu cầu xử lý này', done: true, active: true },
    ];
  }
  if (statusKey === 'rejected') {
    return [
      { key: 'received', label: 'Đã tiếp nhận', desc: 'Hệ thống đã ghi nhận báo cáo từ người dân', done: true, active: false },
      { key: 'rejected', label: 'Từ chối', desc: 'Sự cố không thuộc diện xử lý', done: true, active: true },
    ];
  }
  const steps = [
    { key: 'received', label: 'Đã tiếp nhận', desc: 'Hệ thống ghi nhận báo cáo từ người dân' },
    { key: 'processing', label: 'Đang xử lý', desc: 'Cơ quan chức năng đã điều động nhân sự kiểm tra' },
    { key: 'done', label: 'Hoàn thành', desc: 'Sự cố đã được khắc phục hoàn tất' },
  ];
  const activeIdx = statusKey === 'done' ? 2 : statusKey === 'processing' ? 1 : 0;
  return steps.map((s, i) => ({ ...s, done: i <= activeIdx, active: i === activeIdx }));
}

export default function TicketDetailScreen({
  ticketId,
  ticketData: initialTicketData,
  goBack,
  navigate,
  onTicketCancelled,
}: Props) {
  const [ticketData, setTicketData] = useState<ReportedTicket | null>(initialTicketData || null);
  const [cancelling, setCancelling] = useState(false);
  const [loading, setLoading] = useState<boolean>(
    !initialTicketData && Boolean(ticketId) && !ticketId?.startsWith('CF-')
  );

  useEffect(() => {
    if (initialTicketData) {
      setTicketData(initialTicketData);
      setLoading(false);
      return;
    }

    if (ticketId && !ticketId.startsWith('CF-')) {
      let isMounted = true;
      setLoading(true);
      getTicketById(ticketId)
        .then((fetched) => {
          if (isMounted && fetched) {
            setTicketData(fetched);
          }
        })
        .catch((err) => {
          console.warn('Lỗi tải chi tiết vé từ server:', err);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [ticketId, initialTicketData]);

  let ticket: Ticket;
  if (ticketData) {
    const stInfo = mapBackendStatus(ticketData.status);
    ticket = {
      id: ticketData.id,
      category: ticketData.categoryName || ticketData.subCategories?.[0]?.name || ticketData.description || 'Sự cố hạ tầng',
      address: ticketData.address || 'Chưa xác định vị trí',
      submittedAt: ticketData.createdAt ? new Date(ticketData.createdAt).toLocaleString('vi-VN') : 'Vừa xong',
      locationMethod: ticketData.locationMethod === 'MANUAL_ENTRY' ? 'MANUAL_PIN' : 'AUTO_GPS',
      agency: ticketData.departmentName || 'Chờ phân công cơ quan xử lý',
      deadline: ticketData.deadline
        ? new Date(ticketData.deadline).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
        : (ticketData.status === 'INITIATED' ? 'Chờ duyệt / Chưa có hạn chót' : 'Chưa có hạn chót'),
      upvotes: 0,
      severity: (((ticketData.priority || ticketData.severity || 'LOW')).toUpperCase() as any),
      status: stInfo.statusText,
      statusKey: stInfo.statusKey,
      description: ticketData.description || 'Không có mô tả chi tiết.',
      imageUrl:
        ticketData.imageUrl ||
        (ticketData.images && ticketData.images[0]) ||
        'https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?w=800&h=400&fit=crop&auto=format',
      rawStatus: ticketData.status,
    };
  } else {
    ticket = MOCK_TICKETS_FULL.find((t) => t.id === ticketId) || MOCK_TICKETS_FULL[0];
  }

  const isInitiated = (ticketData?.status || ticket.rawStatus || '').toUpperCase() === 'INITIATED';
  const isCompleted =
    ticket.statusKey === 'done' ||
    ['RESOLVED', 'COMPLETED'].includes((ticketData?.status || ticket.rawStatus || '').toUpperCase());

  // Rating states
  const [myRating, setMyRating] = useState<TicketRating | null>(null);
  const [loadingRating, setLoadingRating] = useState(false);
  const [communityRatings, setCommunityRatings] = useState<TicketRating[]>([]);
  const [loadingCommunityRatings, setLoadingCommunityRatings] = useState(false);

  // Rating modal states
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [ratingFeedback, setRatingFeedback] = useState<string>('');
  const [isAnonymousRating, setIsAnonymousRating] = useState<boolean>(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [editingRatingId, setEditingRatingId] = useState<string | null>(null);

  // Evidences modal
  const [showEvidencesModal, setShowEvidencesModal] = useState(false);

  const fetchRatings = useCallback(async () => {
    const targetId = ticketData?.id || ticket.id;
    if (!targetId || targetId.startsWith('CF-')) return;

    try {
      setLoadingRating(true);
      const my = await getMyRating(targetId);
      setMyRating(my);
    } catch (e: any) {
      console.log('Fetch my rating note:', e?.message);
    } finally {
      setLoadingRating(false);
    }

    try {
      setLoadingCommunityRatings(true);
      const res = await getTicketRatings(targetId, 0, 10);
      if (res && Array.isArray(res.content)) {
        setCommunityRatings(res.content);
      }
    } catch (e: any) {
      console.log('Fetch community ratings note:', e?.message);
    } finally {
      setLoadingCommunityRatings(false);
    }
  }, [ticketData?.id, ticket.id]);

  useEffect(() => {
    if (isCompleted) {
      fetchRatings();
    }
  }, [isCompleted, fetchRatings]);

  const openCreateRatingModal = () => {
    setEditingRatingId(null);
    setRatingScore(5);
    setRatingFeedback('');
    setIsAnonymousRating(false);
    setRatingModalVisible(true);
  };

  const openEditRatingModal = () => {
    if (!myRating) return;
    setEditingRatingId(myRating.id);
    setRatingScore(myRating.rate || 5);
    setRatingFeedback(myRating.feedback || '');
    setIsAnonymousRating(Boolean(myRating.isAnonymous));
    setRatingModalVisible(true);
  };

  const handleSaveRating = async () => {
    const targetId = ticketData?.id || ticket.id;
    if (!targetId) return;

    if (ratingScore < 1 || ratingScore > 5) {
      Alert.alert('Lỗi', 'Vui lòng chọn số sao từ 1 đến 5.');
      return;
    }

    try {
      setSubmittingRating(true);
      if (editingRatingId) {
        const updated = await updateRating(targetId, editingRatingId, {
          rate: ratingScore,
          feedback: ratingFeedback.trim(),
          isAnonymous: isAnonymousRating,
        });
        setMyRating(updated);
        Alert.alert('Thành công', 'Đánh giá của bạn đã được cập nhật.');
      } else {
        const created = await createRating(targetId, {
          rate: ratingScore,
          feedback: ratingFeedback.trim(),
          isAnonymous: isAnonymousRating,
        });
        setMyRating(created);
        Alert.alert('Thành công', 'Cảm ơn bạn đã gửi đánh giá cho sự cố này!');
      }
      setRatingModalVisible(false);
      fetchRatings();
    } catch (err: any) {
      console.error('Lỗi gửi đánh giá:', err);
      Alert.alert('Không thể gửi đánh giá', err?.message || 'Có lỗi xảy ra khi lưu đánh giá.');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleDeleteRating = () => {
    const targetId = ticketData?.id || ticket.id;
    if (!targetId || !myRating?.id) return;

    Alert.alert(
      'Xóa đánh giá',
      'Bạn có chắc chắn muốn xóa đánh giá của mình không? Sau khi xóa, bạn có thể gửi đánh giá mới bất kỳ lúc nào.',
      [
        { text: 'Quay lại', style: 'cancel' },
        {
          text: 'Xác nhận xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoadingRating(true);
              await deleteRating(targetId, myRating.id);
              setMyRating(null);
              Alert.alert('Thành công', 'Đánh giá của bạn đã được xóa.');
              fetchRatings();
            } catch (err: any) {
              console.error('Lỗi xóa đánh giá:', err);
              Alert.alert('Không thể xóa', err?.message || 'Có lỗi xảy ra khi xóa đánh giá.');
            } finally {
              setLoadingRating(false);
            }
          },
        },
      ]
    );
  };

  const allEvidences = (ticketData?.steps || []).flatMap((st: any) =>
    (st?.evidences || []).map((ev: any) => ({
      ...ev,
      stepName: st?.stepName || 'Khắc phục sự cố',
    }))
  );

  const handleCancelTicket = () => {
    const targetId = ticketData?.id || ticket.id;
    if (!targetId) return;

    Alert.alert(
      'Hủy vé phản ánh',
      'Bạn có chắc chắn muốn hủy vé phản ánh này không? Sau khi hủy, yêu cầu sẽ không được chuyển cho cơ quan xử lý.',
      [
        { text: 'Quay lại', style: 'cancel' },
        {
          text: 'Xác nhận hủy',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);
              const updatedTicket = await cancelTicket(targetId);
              setTicketData(updatedTicket);
              onTicketCancelled?.(updatedTicket);
              Alert.alert('Thành công', 'Vé phản ánh đã được hủy thành công.');
            } catch (err: any) {
              console.error('❌ Lỗi hủy vé:', err);
              Alert.alert('Không thể hủy vé', err?.message || 'Có lỗi xảy ra khi hủy vé.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.notFoundContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={[styles.notFoundText, { marginTop: 16 }]}>Đang tải thông tin sự cố...</Text>
      </View>
    );
  }

  if (!ticketId && !ticketData) {
    return (
      <View style={styles.notFoundContainer}>
        <StatusBar barStyle="dark-content" />
        <Ionicons name="document-text-outline" size={48} color="#94a3b8" />
        <Text style={styles.notFoundText}>Không tìm thấy thông tin vé sự cố</Text>
        <TouchableOpacity style={styles.goBackBtn} onPress={goBack}>
          <Text style={styles.goBackBtnText}>← Quay lại danh sách</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const st = STATUS_MAP[ticket.statusKey] || STATUS_MAP.received;
  const sev = SEVERITY_MAP[ticket.severity] || SEVERITY_MAP.MEDIUM;
  const timeline = getTimeline(ticket.statusKey);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topAccentBar} />

      {/* Top Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitleText}>Chi tiết phản ánh</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {ticket.category || 'Thông tin sự cố'}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadgeHeader,
            { backgroundColor: st.bg, borderColor: st.border },
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: st.color }]} />
          <Text style={[styles.statusBadgeText, { color: st.color }]}>
            {ticket.status || st.label}
          </Text>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        <View style={styles.contentPadding}>
          {/* Hero Image Card */}
          <View style={styles.heroCard}>
            <Image source={{ uri: ticket.imageUrl }} style={styles.heroImage} />
            <View style={styles.imageOverlay} />

            <View style={[styles.severityBadge, { backgroundColor: sev.bg, borderColor: sev.border }]}>
              <Text style={[styles.severityText, { color: sev.color }]}>
                ĐỘ ƯU TIÊN: {sev.label.toUpperCase()}
              </Text>
            </View>

            <View style={styles.upvoteChip}>
              <Feather name="thumbs-up" size={12} color="#f97316" />
              <Text style={styles.upvoteChipText}>{ticket.upvotes} upvote</Text>
            </View>
          </View>

          {/* General Information Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.orangeIndicator} />
              <Text style={styles.cardTitle}>THÔNG TIN CHUNG</Text>
            </View>
            <View style={styles.infoList}>
              {[
                { label: 'Loại sự cố', value: ticket.category },
                { label: 'Địa điểm', value: ticket.address },
                { label: 'Thời gian gửi', value: ticket.submittedAt },
                {
                  label: 'Vị trí',
                  value: ticket.locationMethod === 'AUTO_GPS' ? 'GPS Tự động' : 'Ghim thủ công',
                },
                { label: 'Cơ quan xử lý', value: ticket.agency },
                { label: 'Thời hạn xử lý', value: ticket.deadline },
              ].map((row, idx) => (
                <View key={idx} style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{row.label}</Text>
                  <Text style={styles.infoValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Action CTA for Resolved Tickets: Xem bằng chứng (Đưa lên đầu) */}
          {isCompleted ? (
            <TouchableOpacity
              style={styles.resolutionBtn}
              onPress={() => setShowEvidencesModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="images-outline" size={20} color="#ffffff" />
              <Text style={styles.resolutionBtnText}>
                XEM BẰNG CHỨNG XỬ LÝ ({allEvidences.length})
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* ĐÁNH GIÁ CHẤT LƯỢNG KHI VÉ HOÀN THÀNH (Đưa lên đầu ngay sau Thông tin chung) */}
          {isCompleted ? (
            <View style={styles.ratingSectionContainer}>
              {loadingRating ? (
                <View style={styles.ratingLoadingBox}>
                  <ActivityIndicator size="small" color="#ea580c" />
                  <Text style={styles.ratingLoadingText}>Đang tải đánh giá...</Text>
                </View>
              ) : myRating ? (
                /* Card đánh giá của chính người dùng */
                <View style={styles.myRatingCard}>
                  <View style={styles.myRatingHeader}>
                    <View style={styles.myRatingHeaderLeft}>
                      <View style={styles.starBadgeIcon}>
                        <Ionicons name="star" size={16} color="#ffffff" />
                      </View>
                      <View>
                        <Text style={styles.myRatingTitle}>ĐÁNH GIÁ CỦA BẠN</Text>
                        <Text style={styles.myRatingDate}>
                          {new Date(myRating.updatedAt || myRating.createdAt).toLocaleDateString('vi-VN')}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.myRatingHeaderActions}>
                      <TouchableOpacity
                        style={styles.ratingActionBtn}
                        onPress={openEditRatingModal}
                        activeOpacity={0.7}
                      >
                        <Feather name="edit-2" size={14} color="#ea580c" />
                        <Text style={styles.ratingActionBtnText}>Sửa</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.ratingActionBtn, styles.ratingDeleteBtn]}
                        onPress={handleDeleteRating}
                        activeOpacity={0.7}
                      >
                        <Feather name="trash-2" size={14} color="#dc2626" />
                        <Text style={[styles.ratingActionBtnText, { color: '#dc2626' }]}>Xóa</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.starsDisplayRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= myRating.rate ? 'star' : 'star-outline'}
                        size={22}
                        color={star <= myRating.rate ? '#f59e0b' : '#cbd5e1'}
                        style={{ marginRight: 3 }}
                      />
                    ))}
                    <Text style={styles.starsScoreText}>{myRating.rate}/5</Text>
                    <View
                      style={[
                        styles.ratingLabelBadge,
                        { backgroundColor: (RATING_LABELS[myRating.rate]?.color || '#16a34a') + '15' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.ratingLabelBadgeText,
                          { color: RATING_LABELS[myRating.rate]?.color || '#16a34a' },
                        ]}
                      >
                        {RATING_LABELS[myRating.rate]?.text || 'Hài lòng'}
                      </Text>
                    </View>
                  </View>

                  {myRating.feedback ? (
                    <View style={styles.feedbackQuoteBox}>
                      <Ionicons name="chatbubble-ellipses-outline" size={15} color="#ea580c" style={{ marginRight: 6, marginTop: 1 }} />
                      <Text style={styles.feedbackQuoteText}>{myRating.feedback}</Text>
                    </View>
                  ) : null}

                  {myRating.isAnonymous ? (
                    <View style={styles.anonymousBadge}>
                      <Ionicons name="eye-off-outline" size={13} color="#64748b" />
                      <Text style={styles.anonymousBadgeText}>Đánh giá ở chế độ ẩn danh</Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                /* Card mời đánh giá khi chưa đánh giá */
                <View style={styles.rateInviteCard}>
                  <View style={styles.rateInviteIconBox}>
                    <Ionicons name="star" size={26} color="#f59e0b" />
                  </View>
                  <View style={styles.rateInviteBody}>
                    <Text style={styles.rateInviteTitle}>Đánh giá chất lượng xử lý</Text>
                    <Text style={styles.rateInviteDesc}>
                      Bạn là người báo cáo hoặc đã theo dõi vé này? Hãy chia sẻ đánh giá về kết quả giải quyết sự cố.
                    </Text>
                    <TouchableOpacity
                      style={styles.openRateBtn}
                      onPress={openCreateRatingModal}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="star-outline" size={18} color="#ffffff" />
                      <Text style={styles.openRateBtnText}>ĐÁNH GIÁ NGAY</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Danh sách đánh giá cộng đồng */}
              {communityRatings.length > 0 ? (
                <View style={styles.communityCard}>
                  <View style={styles.communityHeader}>
                    <View style={styles.orangeIndicator} />
                    <Text style={styles.communityTitle}>
                      ĐÁNH GIÁ TỪ CỘNG ĐỒNG ({communityRatings.length})
                    </Text>
                  </View>

                  {communityRatings.map((item) => (
                    <View key={item.id} style={styles.reviewItem}>
                      <View style={styles.reviewAvatar}>
                        {item.userAvatar ? (
                          <Image source={{ uri: item.userAvatar }} style={styles.reviewAvatarImg} />
                        ) : (
                          <Text style={styles.reviewAvatarText}>
                            {item.isAnonymous ? '?' : (item.userName || 'U').charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View style={styles.reviewContent}>
                        <View style={styles.reviewTopRow}>
                          <Text style={styles.reviewerName}>
                            {item.isAnonymous ? 'Người dân ẩn danh' : item.userName || 'Người dân'}
                          </Text>
                          <Text style={styles.reviewDate}>
                            {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                          </Text>
                        </View>
                        <View style={styles.reviewStarsRow}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Ionicons
                              key={s}
                              name={s <= item.rate ? 'star' : 'star-outline'}
                              size={14}
                              color={s <= item.rate ? '#f59e0b' : '#cbd5e1'}
                              style={{ marginRight: 2 }}
                            />
                          ))}
                        </View>
                        {item.feedback ? (
                          <Text style={styles.reviewerFeedback}>{item.feedback}</Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Incident Description */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.orangeIndicator} />
              <Text style={styles.cardTitle}>MÔ TẢ SỰ CỐ</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.descriptionText}>{ticket.description}</Text>
            </View>
          </View>

          {/* Processing Timeline */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.orangeIndicator} />
              <Text style={styles.cardTitle}>TIẾN TRÌNH XỬ LÝ</Text>
            </View>
            <View style={styles.timelineBody}>
              {timeline.map((step, i) => (
                <View key={step.key} style={styles.timelineRow}>
                  {/* Connector column */}
                  <View style={styles.connectorCol}>
                    <View
                      style={[
                        styles.timelineCircle,
                        step.done
                          ? styles.timelineCircleDone
                          : styles.timelineCirclePending,
                      ]}
                    >
                      {step.done ? (
                        <Ionicons name="checkmark" size={14} color="#ffffff" />
                      ) : (
                        <View style={styles.pendingDot} />
                      )}
                    </View>
                    {i < timeline.length - 1 ? (
                      <View
                        style={[
                          styles.timelineLine,
                          step.done ? styles.timelineLineDone : styles.timelineLinePending,
                        ]}
                      />
                    ) : null}
                  </View>
                  {/* Text Content */}
                  <View style={styles.timelineContent}>
                    <Text
                      style={[
                        styles.timelineStepLabel,
                        step.active
                          ? { color: '#ea580c' }
                          : step.done
                          ? { color: '#0f172a' }
                          : { color: '#94a3b8' },
                      ]}
                    >
                      {step.label}
                    </Text>
                    <Text
                      style={[
                        styles.timelineStepDesc,
                        step.done ? { color: '#64748b' } : { color: '#94a3b8' },
                      ]}
                    >
                      {step.desc}
                    </Text>
                    {step.active ? (
                      <View style={styles.activeTag}>
                        <View style={styles.activePulseDot} />
                        <Text style={styles.activeTagText}>Đang tiến hành</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Upvote Info Banner */}
          <View style={styles.upvoteBanner}>
            <Feather name="thumbs-up" size={16} color="#f97316" />
            <Text style={styles.upvoteBannerText}>
              <Text style={{ fontWeight: '700', color: '#ea580c' }}>
                {ticket.upvotes} người
              </Text>{' '}
              đã upvote vé này — được xếp ưu tiên xử lý cao hơn.
            </Text>
          </View>

          {/* Action CTA for Initiated Tickets (Cancel) */}
          {isInitiated ? (
            <View style={styles.cancelActionCard}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleCancelTicket}
                disabled={cancelling}
                activeOpacity={0.8}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#dc2626" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={18} color="#dc2626" />
                    <Text style={styles.cancelBtnText}>HỦY VÉ PHẢN ÁNH</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.cancelHintText}>
                Người dân chỉ có thể hủy vé khi ở trạng thái tiếp nhận (INITIATED).
              </Text>
            </View>
          ) : null}

          {/* Banner for Cancelled Tickets */}
          {ticket.statusKey === 'cancelled' || (ticket.rawStatus || '').toUpperCase() === 'CANCELLED' ? (
            <View style={styles.cancelledBanner}>
              <Ionicons name="information-circle-outline" size={20} color="#64748b" />
              <View style={{ flex: 1 }}>
                <Text style={styles.cancelledBannerTitle}>Vé đã được hủy</Text>
                <Text style={styles.cancelledBannerText}>
                  Bạn đã hủy yêu cầu xử lý sự cố này.
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* MODAL ĐÁNH GIÁ (CREATE / EDIT) */}
      <Modal
        visible={ratingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.ratingModalCard}>
            <View style={styles.ratingModalHeader}>
              <View style={styles.ratingModalHeaderLeft}>
                <Ionicons name="star" size={20} color="#f59e0b" />
                <Text style={styles.ratingModalTitle}>
                  {editingRatingId ? 'Chỉnh sửa đánh giá' : 'Đánh giá xử lý sự cố'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setRatingModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={styles.ratingPromptText}>
                Bạn cảm thấy thế nào về kết quả và tốc độ giải quyết sự cố này?
              </Text>

              {/* Interactive Star Picker */}
              <View style={styles.starPickerRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRatingScore(star)}
                    style={styles.starPickerTouch}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={star <= ratingScore ? 'star' : 'star-outline'}
                      size={36}
                      color={star <= ratingScore ? '#f59e0b' : '#cbd5e1'}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Rating score badge label */}
              <View style={styles.scoreLabelRow}>
                <Text style={[styles.scoreLabelText, { color: RATING_LABELS[ratingScore]?.color || '#ea580c' }]}>
                  {ratingScore} sao · {RATING_LABELS[ratingScore]?.text || ''}
                </Text>
              </View>

              {/* Feedback Input */}
              <Text style={styles.modalFieldLabel}>Ý kiến đóng góp (tùy chọn):</Text>
              <TextInput
                style={styles.feedbackInput}
                placeholder="Nhập cảm nhận về chất lượng sửa chữa, thái độ nhân viên hoặc thời gian hoàn thành..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                value={ratingFeedback}
                onChangeText={setRatingFeedback}
                textAlignVertical="top"
              />

              {/* Anonymous Toggle */}
              <View style={styles.anonymousToggleRow}>
                <View style={styles.anonymousToggleLeft}>
                  <Ionicons name="eye-off-outline" size={18} color="#64748b" />
                  <View style={{ marginLeft: 8 }}>
                    <Text style={styles.anonymousToggleTitle}>Đánh giá ẩn danh</Text>
                    <Text style={styles.anonymousToggleSub}>Ẩn họ tên và ảnh đại diện của bạn</Text>
                  </View>
                </View>
                <Switch
                  value={isAnonymousRating}
                  onValueChange={setIsAnonymousRating}
                  trackColor={{ false: '#cbd5e1', true: '#fdba74' }}
                  thumbColor={isAnonymousRating ? '#ea580c' : '#f8fafc'}
                />
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRatingModalVisible(false)}
                disabled={submittingRating}
              >
                <Text style={styles.modalCancelBtnText}>HỦY</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSaveRating}
                disabled={submittingRating}
                activeOpacity={0.85}
              >
                {submittingRating ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#ffffff" />
                    <Text style={styles.modalSubmitBtnText}>
                      {editingRatingId ? 'CẬP NHẬT' : 'GỬI ĐÁNH GIÁ'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL XEM BẰNG CHỨNG XỬ LÝ */}
      <Modal
        visible={showEvidencesModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEvidencesModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.evidencesModalCard}>
            <View style={styles.ratingModalHeader}>
              <View style={styles.ratingModalHeaderLeft}>
                <Ionicons name="checkmark-done-circle" size={22} color="#16a34a" />
                <Text style={styles.ratingModalTitle}>Bằng chứng hoàn thành</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowEvidencesModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
              {allEvidences.length > 0 ? (
                allEvidences.map((ev: any, idx: number) => (
                  <View key={idx} style={styles.evidenceItemCard}>
                    <Text style={styles.evidenceStepName}>
                      Bước: {ev.stepName || `Khắc phục #${idx + 1}`}
                    </Text>
                    {ev.imageUrl ? (
                      <Image source={{ uri: ev.imageUrl }} style={styles.evidenceImg} resizeMode="cover" />
                    ) : null}
                    {ev.resolutionNote ? (
                      <View style={styles.evidenceNoteBox}>
                        <Text style={styles.evidenceNoteLabel}>Ghi chú xử lý:</Text>
                        <Text style={styles.evidenceNoteText}>{ev.resolutionNote}</Text>
                      </View>
                    ) : null}
                    <View style={styles.evidenceMetaRow}>
                      <Text style={styles.evidenceMetaStaff}>
                        Nhân viên: {ev.staffName || 'Đội công ích đô thị'}
                      </Text>
                      {ev.createdAt ? (
                        <Text style={styles.evidenceMetaDate}>
                          {new Date(ev.createdAt).toLocaleString('vi-VN')}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.noEvidenceBox}>
                  <Ionicons name="images-outline" size={40} color="#94a3b8" />
                  <Text style={styles.noEvidenceTitle}>Chưa có hình ảnh bằng chứng</Text>
                  <Text style={styles.noEvidenceDesc}>
                    Cơ quan xử lý đã xác nhận hoàn tất giải quyết sự cố này trên hệ thống.
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.evidenceCloseBtn}
              onPress={() => setShowEvidencesModal(false)}
            >
              <Text style={styles.evidenceCloseBtnText}>ĐÓNG</Text>
            </TouchableOpacity>
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
  notFoundContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  notFoundText: {
    fontSize: 15,
    color: '#64748b',
  },
  goBackBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  goBackBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ea580c',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  scrollArea: {
    flex: 1,
  },
  contentPadding: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },

  /* Hero Image Card */
  heroCard: {
    height: 190,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
  },
  severityBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  severityText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  upvoteChip: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  upvoteChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
  },

  /* Section Card */
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  orangeIndicator: {
    width: 4,
    height: 14,
    backgroundColor: '#f97316',
    borderRadius: 2,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1.2,
  },
  cardBody: {
    padding: 16,
  },
  infoList: {},
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    width: 100,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'right',
    flex: 1,
  },
  descriptionText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },

  /* Timeline */
  timelineBody: {
    padding: 16,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
  },
  connectorCol: {
    alignItems: 'center',
  },
  timelineCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineCircleDone: {
    backgroundColor: '#f97316',
  },
  timelineCirclePending: {
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 28,
    marginVertical: 4,
  },
  timelineLineDone: {
    backgroundColor: 'rgba(249, 115, 22, 0.3)',
  },
  timelineLinePending: {
    backgroundColor: '#e2e8f0',
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 20,
  },
  timelineStepLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  timelineStepDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  activePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f97316',
  },
  activeTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ea580c',
  },

  /* Upvote Banner */
  upvoteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.25)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  upvoteBannerText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
    lineHeight: 18,
  },

  /* Resolution CTA */
  resolutionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
    marginTop: 4,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  resolutionBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.8,
  },

  /* Cancel CTA */
  cancelActionCard: {
    marginTop: 10,
    gap: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    borderRadius: 16,
    paddingVertical: 14,
  },
  cancelBtnText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cancelHintText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 10,
  },
  cancelledBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  cancelledBannerText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },

  /* Rating Section */
  ratingSectionContainer: {
    gap: 12,
  },
  ratingLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  ratingLoadingText: {
    fontSize: 13,
    color: '#64748b',
  },

  /* My Rating Card */
  myRatingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 16,
    gap: 12,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  myRatingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  myRatingHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starBadgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  myRatingTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  myRatingDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  myRatingHeaderActions: {
    flexDirection: 'row',
    gap: 6,
  },
  ratingActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  ratingDeleteBtn: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  ratingActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ea580c',
  },
  starsDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsScoreText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginLeft: 6,
    marginRight: 8,
  },
  ratingLabelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingLabelBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  feedbackQuoteBox: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  feedbackQuoteText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  anonymousBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  anonymousBadgeText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },

  /* Rate Invite Card */
  rateInviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#fdba74',
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  rateInviteIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffedd5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rateInviteBody: {
    flex: 1,
    gap: 4,
  },
  rateInviteTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#c2410c',
  },
  rateInviteDesc: {
    fontSize: 12,
    color: '#7c2d12',
    lineHeight: 16,
    marginBottom: 6,
  },
  openRateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ea580c',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: 'flex-start',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  openRateBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  /* Community Reviews Card */
  communityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 12,
  },
  communityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  communityTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  reviewItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  reviewAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  reviewAvatarImg: {
    width: '100%',
    height: '100%',
  },
  reviewAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  reviewContent: {
    flex: 1,
  },
  reviewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  reviewDate: {
    fontSize: 11,
    color: '#94a3b8',
  },
  reviewStarsRow: {
    flexDirection: 'row',
    marginTop: 2,
    marginBottom: 4,
  },
  reviewerFeedback: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },

  /* Modal Generic */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  ratingModalCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  ratingModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  ratingModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingPromptText: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    marginTop: 4,
  },
  starPickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  starPickerTouch: {
    padding: 4,
  },
  scoreLabelRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreLabelText: {
    fontSize: 15,
    fontWeight: '800',
  },
  modalFieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  feedbackInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#0f172a',
    minHeight: 85,
    marginBottom: 14,
  },
  anonymousToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  anonymousToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  anonymousToggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  anonymousToggleSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  modalSubmitBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },

  /* Evidences Modal */
  evidencesModalCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 20,
    gap: 14,
    maxHeight: '85%',
  },
  evidenceItemCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  evidenceStepName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ea580c',
  },
  evidenceImg: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
  },
  evidenceNoteBox: {
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  evidenceNoteLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  evidenceNoteText: {
    fontSize: 12,
    color: '#1e293b',
    marginTop: 2,
  },
  evidenceMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  evidenceMetaStaff: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16a34a',
  },
  evidenceMetaDate: {
    fontSize: 11,
    color: '#94a3b8',
  },
  noEvidenceBox: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  noEvidenceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  noEvidenceDesc: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  evidenceCloseBtn: {
    paddingVertical: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  evidenceCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
});
