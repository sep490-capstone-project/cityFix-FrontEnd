import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mapBackendStatus } from '../api';
import { ReportDraft, CATEGORIES } from '../types';

interface Props {
  ticket?: any | null;
  draft?: ReportDraft | null;
  resetReport: () => void;
  isUpvote?: boolean;
  onViewDetail?: (ticketId: string, ticketObj?: any) => void;
}

export default function SuccessScreen({
  ticket,
  draft,
  resetReport,
  isUpvote = false,
  onViewDetail,
}: Props) {
  const [countdown, setCountdown] = useState(12);
  const [isPaused, setIsPaused] = useState(false);
  const [subscribed, setSubscribed] = useState(true);

  // 1. Mã vé động
  const rawId = ticket?.ticketCode || ticket?.id || ticket?.ticketId || '';
  const displayTicketId = rawId
    ? rawId.length >= 8 && rawId.includes('-')
      ? `CF-${rawId.replace(/-/g, '').slice(0, 8).toUpperCase()}`
      : rawId.startsWith('CF-')
      ? rawId
      : `CF-${rawId.toUpperCase()}`
    : `CF-${2800 + Math.floor(Math.random() * 100)}`;

  // 2. Loại sự cố động
  const categoryName =
    ticket?.categoryName ||
    ticket?.subCategories?.[0]?.name ||
    draft?.aiAnalysis?.subCategoryName ||
    draft?.aiAnalysis?.categoryName ||
    (draft?.userCategoryId
      ? CATEGORIES.find((c) => c.categoryId === draft.userCategoryId)?.name
      : null) ||
    ticket?.category ||
    'Sự cố đô thị';

  const subCategoryName =
    ticket?.subCategories?.[0]?.name ||
    draft?.aiAnalysis?.subCategoryName ||
    null;

  // 3. Cơ quan tiếp nhận động
  const agencyName =
    ticket?.departmentName ||
    ticket?.agency ||
    (isUpvote ? 'Cơ quan chức năng phụ trách' : 'Chờ điều phối tiếp nhận');

  // 4. Thời hạn xử lý động
  let deadlineText = 'Theo chuẩn SLA';
  if (ticket?.deadline) {
    try {
      deadlineText = new Date(ticket.deadline).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      deadlineText = '24 - 72 giờ';
    }
  } else if (ticket?.sla || ticket?.subCategories?.[0]?.sla) {
    deadlineText = `${ticket?.sla || ticket?.subCategories?.[0]?.sla} giờ`;
  } else if (isUpvote) {
    deadlineText = 'Ưu tiên giải quyết';
  } else {
    deadlineText = '24 - 72 giờ';
  }

  // 5. Thời gian gửi động
  const createdDate = ticket?.createdAt ? new Date(ticket.createdAt) : new Date();
  const timeFormatted = createdDate.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateFormatted = createdDate.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });

  // 6. Địa chỉ sự cố
  const address =
    ticket?.address ||
    draft?.address ||
    'Chưa xác định vị trí';

  // 7. Mức độ ưu tiên
  const severityRaw = (ticket?.priority || ticket?.severity || draft?.aiAnalysis?.priority || draft?.aiAnalysis?.severity || 'LOW').toUpperCase();
  const severityMap: Record<string, { label: string; color: string; bg: string }> = {
    LOW: { label: 'Thấp', color: '#16a34a', bg: '#f0fdf4' },
    MEDIUM: { label: 'Trung bình', color: '#2563eb', bg: '#eff6ff' },
    HIGH: { label: 'Cao', color: '#dc2626', bg: '#fef2f2' },
    CRITICAL: { label: 'Khẩn cấp', color: '#991b1b', bg: '#fee2e2' },
  };
  const severityInfo = severityMap[severityRaw] || severityMap.LOW;

  // 8. Trạng thái vé
  const stInfo = isUpvote
    ? {
        statusText: 'ĐÃ ĐỒNG THUẬN',
        color: '#2563eb',
        bgColor: '#eff6ff',
        borderColor: '#bfdbfe',
      }
    : mapBackendStatus(ticket?.status || 'INITIATED');

  // 9. Ảnh sự cố
  const photoUrl =
    ticket?.imageUrl ||
    (ticket?.images && ticket?.images[0]) ||
    draft?.imageUrls?.[0] ||
    null;

  // Countdown timer tự động về trang chủ nếu không thao tác
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          setTimeout(resetReport, 300);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, resetReport]);

  const handleCopyCode = () => {
    setIsPaused(true);
    Alert.alert(
      'Mã vé phản ánh',
      `Mã đầy đủ: ${rawId || displayTicketId}\n\nBạn có thể dùng mã này để tra cứu tiến độ xử lý sự cố bất kỳ lúc nào.`,
      [{ text: 'Đã hiểu' }]
    );
  };

  const handleGoToDetail = () => {
    setIsPaused(true);
    if (onViewDetail && rawId) {
      onViewDetail(rawId, ticket);
    } else {
      resetReport();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.topAccentBar} />

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        <View style={styles.contentPadding}>
          {/* Hero Celebration Box */}
          <View style={styles.heroBox}>
            <View
              style={[
                styles.successIconBox,
                isUpvote && { backgroundColor: '#2563eb', shadowColor: '#2563eb' },
              ]}
            >
              <Ionicons
                name={isUpvote ? 'thumbs-up' : 'checkmark-circle'}
                size={40}
                color="#ffffff"
              />
            </View>

            <Text style={styles.heroTitle}>
              {isUpvote ? 'ĐÃ BÌNH CHỌN THÀNH CÔNG!' : 'BÁO CÁO ĐÃ ĐƯỢC GỬI!'}
            </Text>

            <Text style={styles.heroSubText}>
              {isUpvote
                ? 'Cảm ơn bạn đã upvote đồng thuận. Mức độ ưu tiên xử lý sự cố này sẽ được tăng cường.'
                : 'Cảm ơn bạn đã phản ánh sự cố. Báo cáo đã được tiếp nhận và đang được điều phối xử lý.'}
            </Text>
          </View>

          {/* Ticket Receipt Card */}
          <View style={styles.ticketCard}>
            <View style={styles.ticketHeaderRow}>
              <TouchableOpacity
                onPress={handleCopyCode}
                activeOpacity={0.7}
                style={styles.codeTouchArea}
              >
                <View style={styles.ticketLabelRow}>
                  <Text style={styles.ticketLabel}>MÃ VÉ SỰ CỐ</Text>
                  <Ionicons name="copy-outline" size={12} color="#94a3b8" />
                </View>
                <Text style={styles.ticketIdText}>{displayTicketId}</Text>
              </TouchableOpacity>

              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: stInfo.bgColor || '#f0fdf4',
                    borderColor: stInfo.borderColor || '#bbf7d0',
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: stInfo.color || '#16a34a' },
                  ]}
                />
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: stInfo.color || '#16a34a' },
                  ]}
                >
                  {stInfo.statusText}
                </Text>
              </View>
            </View>

            <View style={styles.dashedDivider} />

            {/* Info Grid */}
            <View style={styles.infoGrid}>
              {/* 1. Loại sự cố */}
              <View style={styles.infoGridItem}>
                <View style={styles.gridItemHeader}>
                  <Ionicons name="construct-outline" size={14} color="#f97316" />
                  <Text style={styles.gridLabel}>Loại sự cố</Text>
                </View>
                <Text style={styles.gridValue} numberOfLines={1}>
                  {categoryName}
                </Text>
                {subCategoryName && subCategoryName !== categoryName ? (
                  <Text style={styles.gridSubValue} numberOfLines={1}>
                    {subCategoryName}
                  </Text>
                ) : null}
              </View>

              {/* 2. Cơ quan xử lý */}
              <View style={styles.infoGridItem}>
                <View style={styles.gridItemHeader}>
                  <Ionicons name="business-outline" size={14} color="#3b82f6" />
                  <Text style={styles.gridLabel}>Cơ quan tiếp nhận</Text>
                </View>
                <Text style={styles.gridValue} numberOfLines={2}>
                  {agencyName}
                </Text>
              </View>

              {/* 3. Mức độ ưu tiên / nghiêm trọng */}
              <View style={styles.infoGridItem}>
                <View style={styles.gridItemHeader}>
                  <Ionicons name="alert-circle-outline" size={14} color={severityInfo.color} />
                  <Text style={styles.gridLabel}>Mức độ</Text>
                </View>
                <Text style={[styles.gridValue, { color: severityInfo.color }]}>
                  {severityInfo.label}
                </Text>
              </View>

              {/* 4. Thời hạn xử lý */}
              <View style={styles.infoGridItem}>
                <View style={styles.gridItemHeader}>
                  <Ionicons name="time-outline" size={14} color="#eab308" />
                  <Text style={styles.gridLabel}>Thời hạn dự kiến</Text>
                </View>
                <Text style={styles.gridValue}>{deadlineText}</Text>
              </View>

              {/* 5. Thời gian gửi */}
              <View style={styles.infoGridItem}>
                <View style={styles.gridItemHeader}>
                  <Ionicons name="calendar-outline" size={14} color="#8b5cf6" />
                  <Text style={styles.gridLabel}>Thời gian gửi</Text>
                </View>
                <Text style={styles.gridValue}>{timeFormatted}</Text>
                <Text style={styles.gridSubValue}>{dateFormatted}</Text>
              </View>

              {/* 6. Phương thức vị trí */}
              <View style={styles.infoGridItem}>
                <View style={styles.gridItemHeader}>
                  <Ionicons name="navigate-outline" size={14} color="#10b981" />
                  <Text style={styles.gridLabel}>Phương thức</Text>
                </View>
                <Text style={styles.gridValue}>
                  {(ticket?.locationMethod || draft?.locationMethod) === 'MANUAL_ENTRY'
                    ? 'Ghim thủ công'
                    : 'GPS Tự động'}
                </Text>
              </View>
            </View>

            {/* Address Row */}
            <View style={styles.addressBox}>
              <Ionicons name="location" size={16} color="#ea580c" style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.addressLabel}>Địa điểm phản ánh</Text>
                <Text style={styles.addressValue} numberOfLines={2}>
                  {address}
                </Text>
              </View>
            </View>

            {/* Photo Thumbnail Row if available */}
            {photoUrl ? (
              <View style={styles.photoRow}>
                <Image source={{ uri: photoUrl }} style={styles.photoThumb} />
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text style={styles.photoLabel}>Hình ảnh đính kèm</Text>
                  <Text style={styles.photoSub} numberOfLines={1}>
                    Đã upload thành công lên máy chủ
                  </Text>
                </View>
                <View style={styles.photoCheckBadge}>
                  <Ionicons name="checkmark" size={14} color="#16a34a" />
                </View>
              </View>
            ) : null}
          </View>

          {/* Notification Subscribe Switch */}
          <View style={styles.subscribeCard}>
            <View style={styles.subIconBox}>
              <Ionicons name="notifications-outline" size={20} color="#ea580c" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.subTitle}>Nhận thông báo cập nhật</Text>
              <Text style={styles.subText}>
                Theo dõi tiến trình xử lý vé {displayTicketId}
              </Text>
            </View>
            <Switch
              value={subscribed}
              onValueChange={setSubscribed}
              trackColor={{ false: '#cbd5e1', true: '#f97316' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>
      </ScrollView>

      {/* Actions Footer */}
      <View style={styles.footerContainer}>
        {rawId && onViewDetail ? (
          <TouchableOpacity
            style={styles.detailBtn}
            onPress={handleGoToDetail}
            activeOpacity={0.85}
          >
            <Ionicons name="document-text-outline" size={18} color="#ea580c" />
            <Text style={styles.detailBtnText}>XEM CHI TIẾT BÁO CÁO</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={resetReport}
          activeOpacity={0.85}
        >
          <Ionicons name="home" size={18} color="#ffffff" />
          <Text style={styles.homeBtnText}>
            VỀ TRANG CHỦ {!isPaused && countdown > 0 ? `(${countdown}s)` : ''}
          </Text>
        </TouchableOpacity>
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
  scrollArea: {
    flex: 1,
  },
  contentPadding: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
  },

  /* Hero Celebration Box */
  heroBox: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  successIconBox: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginTop: 4,
  },
  heroSubText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 12,
  },

  /* Ticket Receipt Card */
  ticketCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  ticketHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeTouchArea: {
    gap: 2,
  },
  ticketLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  ticketIdText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ea580c',
    letterSpacing: 0.8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  dashedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },

  /* Info Grid */
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  infoGridItem: {
    width: '48.5%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    gap: 2,
  },
  gridItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  gridValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  gridSubValue: {
    fontSize: 10,
    color: '#ea580c',
    fontWeight: '600',
  },

  /* Address Box */
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 12,
    padding: 10,
  },
  addressLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#c2410c',
    marginBottom: 2,
  },
  addressValue: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '500',
    lineHeight: 16,
  },

  /* Photo Thumbnail Row */
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 8,
  },
  photoThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#cbd5e1',
  },
  photoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  photoSub: {
    fontSize: 10,
    color: '#16a34a',
    marginTop: 2,
  },
  photoCheckBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Subscribe Card */
  subscribeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  subIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  subText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },

  /* Footer CTA */
  footerContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    gap: 8,
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#fdba74',
    borderRadius: 14,
    paddingVertical: 13,
    gap: 8,
  },
  detailBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ea580c',
    letterSpacing: 0.5,
  },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f97316',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  homeBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.6,
  },
});
