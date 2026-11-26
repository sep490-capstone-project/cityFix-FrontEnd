import React, { useEffect, useState, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  mapBackendStatus,
  getMediaThumbnailUrl,
  formatVietnamDate,
  formatVietnamTime,
  formatShortTicketCode,
} from '../../api';
import { ReportDraft, CATEGORIES } from '../../types';
import { Haptics } from '../../utils/haptics';

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
  // Animated celebration pop-in
  const iconScale = useRef(new Animated.Value(0.2)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(iconScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(iconOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  const [countdown, setCountdown] = useState(12);
  const [isPaused, setIsPaused] = useState(false);
  const [subscribed, setSubscribed] = useState(true);

  // 1. Mã hồ sơ báo cáo động (đồng bộ chuẩn #8ký_tự_đầu với cổng Web Manager/Admin)
  const rawId = ticket?.id || ticket?.ticketId || ticket?.ticketCode || '';
  const displayTicketId = formatShortTicketCode(rawId);

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

  const subCategoryNames: string[] = [];
  if (Array.isArray(ticket?.subCategories) && ticket.subCategories.length > 0) {
    ticket.subCategories.forEach((sc: any) => {
      const n = sc.name || sc.subCategoryName;
      if (n && !subCategoryNames.includes(n)) subCategoryNames.push(n);
    });
  }
  if (subCategoryNames.length === 0 && Array.isArray(draft?.aiAnalysis?.subCategoryNames)) {
    draft.aiAnalysis.subCategoryNames.forEach((n) => {
      if (n && !subCategoryNames.includes(n)) subCategoryNames.push(n);
    });
  }
  if (subCategoryNames.length === 0) {
    const single = ticket?.subCategories?.[0]?.name || draft?.aiAnalysis?.subCategoryName;
    if (single) subCategoryNames.push(single);
  }

  const subCategoryName = subCategoryNames[0] || null;

  // 3. Cơ quan tiếp nhận động
  const agencyName =
    ticket?.departmentName ||
    ticket?.agency ||
    (isUpvote ? 'Cơ quan chức năng phụ trách' : 'Chờ điều phối tiếp nhận');

  // 4. Thời hạn xử lý động (theo múi giờ Việt Nam UTC+7)
  let deadlineText = 'Theo chuẩn SLA';
  if (ticket?.deadline) {
    try {
      deadlineText = formatVietnamDate(ticket.deadline, true);
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

  // 5. Thời gian gửi động (chuẩn hóa theo múi giờ Việt Nam UTC+7)
  const timeFormatted = formatVietnamTime(ticket?.createdAt);
  const dateFormatted = formatVietnamDate(ticket?.createdAt || new Date(), true);

  // 6. Địa chỉ sự cố
  const address =
    ticket?.address ||
    draft?.address ||
    'Chưa xác định vị trí';

  // 7. Mức độ ưu tiên (Đồng bộ bảng màu tối giản: Slate & Cam/Đỏ cảnh báo)
  const severityRaw = (ticket?.priority || ticket?.severity || draft?.aiAnalysis?.priority || draft?.aiAnalysis?.severity || 'LOW').toUpperCase();
  const severityMap: Record<string, { label: string; color: string; bg: string }> = {
    LOW: { label: 'Thấp', color: '#0f172a', bg: '#f8fafc' },
    MEDIUM: { label: 'Trung bình', color: '#0f172a', bg: '#f8fafc' },
    HIGH: { label: 'Cao', color: '#ea580c', bg: '#fff7ed' },
    CRITICAL: { label: 'Khẩn cấp', color: '#dc2626', bg: '#fef2f2' },
  };
  const severityInfo = severityMap[severityRaw] || severityMap.LOW;

  // 8. Trạng thái hồ sơ báo cáo
  const stInfo = isUpvote
    ? {
        statusText: 'ĐÃ ĐỒNG TÌNH',
        color: '#ea580c',
        bgColor: '#fff7ed',
        borderColor: '#fed7aa',
      }
    : mapBackendStatus(ticket?.status || 'INITIATED');

  // 9. Ảnh sự cố
  const photoUrl =
    (ticket?.imageUrls && ticket?.imageUrls[0]) ||
    ticket?.imageUrl ||
    (ticket?.images && ticket?.images[0]) ||
    draft?.imageUrls?.[0] ||
    null;

  // Giữ màn hình để người dùng chủ động đọc và sao chép mã phản ánh
  useEffect(() => {
    return; // Người dùng chủ động chuyển trang qua nút bấm

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
      'Mã hồ sơ báo cáo phản ánh',
      `Mã hồ sơ: ${displayTicketId}\nMã định danh đầy đủ (UUID): ${rawId || displayTicketId}\n\nBạn có thể dùng mã này để đối chiếu và tra cứu tiến độ xử lý sự cố bất kỳ lúc nào.`,
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
      <StatusBar barStyle="dark-content" />
      <View style={styles.topAccentBar} />

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        <View style={styles.contentPadding}>
          {/* Hero Celebration Box */}
          <View style={styles.heroBox}>
            <Animated.View
              style={[
                styles.successIconBox,
                {
                  opacity: iconOpacity,
                  transform: [{ scale: iconScale }],
                },
              ]}
            >
              <Ionicons
                name={isUpvote ? 'thumbs-up' : 'checkmark-circle'}
                size={40}
                color="#ffffff"
              />
            </Animated.View>

            <Text style={styles.heroTitle}>
              {isUpvote ? 'ĐÃ GỬI ĐỒNG TÌNH THÀNH CÔNG!' : 'BÁO CÁO ĐÃ ĐƯỢC GỬI!'}
            </Text>

            <Text style={styles.heroSubText}>
              {isUpvote
                ? 'Cảm ơn bạn đã đồng tình. Mức độ ưu tiên xử lý sự cố này sẽ được tăng cường.'
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
                  <Text style={styles.ticketLabel}>MÃ HỒ SƠ BÁO CÁO SỰ CỐ</Text>
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
                  <Ionicons name="construct-outline" size={14} color="#64748b" />
                  <Text style={styles.gridLabel}>Loại sự cố</Text>
                </View>
                <Text style={styles.gridValue} numberOfLines={1}>
                  {categoryName}
                </Text>
                {subCategoryNames.length > 1 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {subCategoryNames.map((name, idx) => (
                      <View
                        key={idx}
                        style={{
                          backgroundColor: '#f1f5f9',
                          borderWidth: 1,
                          borderColor: '#e2e8f0',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#334155' }} numberOfLines={1}>
                          {name}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : subCategoryName && subCategoryName !== categoryName ? (
                  <Text style={styles.gridSubValue} numberOfLines={1}>
                    {subCategoryName}
                  </Text>
                ) : null}
              </View>

              {/* 2. Cơ quan xử lý */}
              <View style={styles.infoGridItem}>
                <View style={styles.gridItemHeader}>
                  <Ionicons name="business-outline" size={14} color="#64748b" />
                  <Text style={styles.gridLabel}>Cơ quan tiếp nhận</Text>
                </View>
                <Text style={styles.gridValue} numberOfLines={2}>
                  {agencyName}
                </Text>
              </View>

              {/* 3. Mức độ ưu tiên / nghiêm trọng */}
              <View style={styles.infoGridItem}>
                <View style={styles.gridItemHeader}>
                  <Ionicons name="alert-circle-outline" size={14} color="#64748b" />
                  <Text style={styles.gridLabel}>Mức độ</Text>
                </View>
                <Text style={[styles.gridValue, { color: severityInfo.color }]}>
                  {severityInfo.label}
                </Text>
              </View>

              {/* 4. Thời hạn xử lý */}
              <View style={styles.infoGridItem}>
                <View style={styles.gridItemHeader}>
                  <Ionicons name="time-outline" size={14} color="#64748b" />
                  <Text style={styles.gridLabel}>Thời hạn dự kiến</Text>
                </View>
                <Text style={styles.gridValue}>{deadlineText}</Text>
              </View>

              {/* 5. Thời gian gửi */}
              <View style={styles.infoGridItem}>
                <View style={styles.gridItemHeader}>
                  <Ionicons name="calendar-outline" size={14} color="#64748b" />
                  <Text style={styles.gridLabel}>Thời gian gửi</Text>
                </View>
                <Text style={styles.gridValue}>
                  {timeFormatted} · {dateFormatted}
                </Text>
              </View>

              {/* 6. Phương thức vị trí */}
              <View style={styles.infoGridItem}>
                <View style={styles.gridItemHeader}>
                  <Ionicons name="navigate-outline" size={14} color="#64748b" />
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
              <Ionicons name="location-outline" size={16} color="#64748b" style={{ marginTop: 1 }} />
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
                <Image source={{ uri: getMediaThumbnailUrl(photoUrl) }} style={styles.photoThumb} />
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text style={styles.photoLabel}>Tệp hiện trường đính kèm</Text>
                  <Text style={styles.photoSub} numberOfLines={1}>
                    Đã tải lên hệ thống thành công
                  </Text>
                </View>
                <View style={styles.photoCheckBadge}>
                  <Ionicons name="checkmark" size={14} color="#ea580c" />
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
                Theo dõi tiến trình xử lý hồ sơ báo cáo {displayTicketId}
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
            VỀ TRANG CHỦ
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
    paddingTop: 14,
    paddingBottom: 8,
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
    fontSize: 20,
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
    fontSize: 20,
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
    color: '#64748b',
    fontWeight: '600',
  },

  /* Address Box */
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
  },
  addressLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 2,
  },
  addressValue: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '600',
    lineHeight: 17,
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
    color: '#64748b',
    marginTop: 2,
  },
  photoCheckBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
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
