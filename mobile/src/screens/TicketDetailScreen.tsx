import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { ReportedTicket, mapBackendStatus, cancelTicket } from '../api';

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

  useEffect(() => {
    if (initialTicketData) {
      setTicketData(initialTicketData);
    }
  }, [initialTicketData]);

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
      deadline: ticketData.duration ? `${ticketData.duration} giờ` : 'Theo quy định',
      upvotes: 0,
      severity: ((ticketData.severity || 'MEDIUM').toUpperCase() as any),
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

  if (!ticketId && !ticketData) {
    return (
      <View style={styles.notFoundContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
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
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
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

          {/* Action CTA for Resolved Tickets */}
          {ticket.statusKey === 'done' ? (
            <TouchableOpacity
              style={styles.resolutionBtn}
              onPress={() => navigate('ticket-resolution')}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
              <Text style={styles.resolutionBtnText}>XEM BẰNG CHỨNG XỬ LÝ</Text>
            </TouchableOpacity>
          ) : null}

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
    ...StyleSheet.absoluteFillObject,
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
});
