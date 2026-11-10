import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Modal,
  Dimensions,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { ReportedTicket } from '../../api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  ticket: ReportedTicket | null;
  onClose: () => void;
}

function formatDateTime(isoString?: string | null): string {
  if (!isoString) return 'Chưa xác định';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${mins} - ${day}/${month}/${year}`;
  } catch {
    return isoString;
  }
}

function getStatusBadge(status?: string) {
  const upper = (status || '').toUpperCase();
  if (upper === 'IN_PROGRESS') {
    return {
      label: 'ĐANG XỬ LÝ KHẨN CẤP',
      color: '#ea580c',
      bg: '#fff7ed',
      border: '#fed7aa',
      icon: 'time-outline' as const,
    };
  }
  if (upper === 'ASSIGNED') {
    return {
      label: 'ĐÃ ĐIỀU PHỐI NHÂN LỰC',
      color: '#0284c7',
      bg: '#f0f9ff',
      border: '#bae6fd',
      icon: 'people-outline' as const,
    };
  }
  if (upper === 'RESOLVED' || upper === 'COMPLETED') {
    return {
      label: 'ĐÃ HOÀN THÀNH XỬ LÝ',
      color: '#16a34a',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      icon: 'checkmark-circle-outline' as const,
    };
  }
  return {
    label: upper || 'TIẾP NHẬN XỬ LÝ',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    icon: 'alert-circle-outline' as const,
  };
}

export default function SOSTicketDetailModal({ visible, ticket, onClose }: Props) {
  const [selectedImgIdx, setSelectedImgIdx] = useState<number>(0);
  const [zoomImgUrl, setZoomImgUrl] = useState<string | null>(null);

  if (!ticket) return null;

  // Lấy danh sách ảnh hiện trường
  const images: string[] = [];
  if (Array.isArray(ticket.imageUrls) && ticket.imageUrls.length > 0) {
    images.push(...ticket.imageUrls);
  } else if (ticket.imageUrl) {
    images.push(ticket.imageUrl);
  } else if (Array.isArray(ticket.images) && ticket.images.length > 0) {
    images.push(...ticket.images);
  }

  const activeImage = images[selectedImgIdx] || images[0] || '';
  const statusInfo = getStatusBadge(ticket.status);

  const hasCoords =
    typeof ticket.latitude === 'number' &&
    typeof ticket.longitude === 'number' &&
    ticket.latitude !== 0 &&
    ticket.longitude !== 0;

  const lat = hasCoords ? ticket.latitude! : 10.7769;
  const lng = hasCoords ? ticket.longitude! : 106.7009;

  const openNavigation = () => {
    if (!hasCoords) return;
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });
    Linking.openURL(url!).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Top Emergency Accent Line */}
        <View style={styles.emergencyBar} />

        {/* Header Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={22} color="#0f172a" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <View style={styles.sosTagRow}>
              <View style={styles.redPulseDot} />
              <Text style={styles.sosHeaderTag}>SỰ CỐ KHẨN CẤP · CÙNG PHƯỜNG</Text>
            </View>
            <Text style={styles.headerMainTitle} numberOfLines={1}>
              {ticket.categories?.[0]?.categoryName || 'Sự cố nguy hiểm tính mạng'}
            </Text>
          </View>

          <TouchableOpacity style={styles.actionBtn} onPress={openNavigation}>
            <Ionicons name="navigate-circle-outline" size={24} color="#dc2626" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. SOS Critical Banner */}
          <View style={styles.criticalCard}>
            <View style={styles.criticalCardTop}>
              <View style={styles.criticalBadge}>
                <Ionicons name="warning" size={16} color="#ffffff" />
                <Text style={styles.criticalBadgeText}>NGUY HIỂM TÍNH MẠNG (SOS)</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusInfo.bg, borderColor: statusInfo.border },
                ]}
              >
                <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} />
                <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
                  {statusInfo.label}
                </Text>
              </View>
            </View>

            <Text style={styles.criticalNote}>
              ⚠️ Cảnh báo an toàn cho cư dân trong cùng khu vực Phường. Vui lòng giữ khoảng cách an toàn và chú ý khi di chuyển qua tuyến đường này.
            </Text>
          </View>

          {/* 2. Interactive Map Section with Red Pin */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="map" size={17} color="#dc2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>VỊ TRÍ HIỆN TRƯỜNG TRÊN BẢN ĐỒ</Text>
                <Text style={styles.sectionSub}>Ghim đỏ đánh dấu chính xác tọa độ sự cố</Text>
              </View>
              {hasCoords && (
                <TouchableOpacity
                  style={styles.openMapsBtn}
                  onPress={openNavigation}
                  activeOpacity={0.8}
                >
                  <Ionicons name="compass-outline" size={14} color="#dc2626" />
                  <Text style={styles.openMapsBtnText}>Chỉ đường</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Map Canvas */}
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: lat,
                  longitude: lng,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                {/* Red Pin Marker */}
                <Marker
                  coordinate={{ latitude: lat, longitude: lng }}
                  title="Hiện trường sự cố nguy hiểm"
                  description={ticket.address || 'Khu vực xảy ra sự cố'}
                  pinColor="#dc2626"
                />
              </MapView>

              {/* Floating Map Callout Badge */}
              <View style={styles.mapCalloutBadge}>
                <Ionicons name="alert-circle" size={14} color="#dc2626" />
                <Text style={styles.mapCalloutText}>Điểm ghim đỏ: Tọa độ sự cố SOS</Text>
              </View>
            </View>

            {/* Address Banner */}
            <View style={styles.addressBox}>
              <Ionicons name="location-sharp" size={18} color="#dc2626" />
              <View style={{ flex: 1 }}>
                <Text style={styles.addressLabel}>Địa chỉ hiện trường:</Text>
                <Text style={styles.addressValue}>{ticket.address || 'Chưa cập nhật địa chỉ'}</Text>
              </View>
            </View>
          </View>

          {/* 3. Incident Description */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconWrap, { backgroundColor: '#fff7ed' }]}>
                <Ionicons name="document-text-outline" size={17} color="#ea580c" />
              </View>
              <Text style={styles.sectionTitle}>MÔ TẢ CHI TIẾT SỰ CỐ</Text>
            </View>

            <Text style={styles.descriptionText}>
              {ticket.description || 'Không có mô tả chi tiết.'}
            </Text>

            {/* Priority Reasoning if any */}
            {ticket.priorityReasoning ? (
              <View style={styles.reasoningBox}>
                <View style={styles.reasoningHeader}>
                  <Ionicons name="analytics-outline" size={15} color="#c2410c" />
                  <Text style={styles.reasoningTitle}>ĐÁNH GIÁ MỨC ĐỘ NGUY HIỂM & ƯU TIÊN</Text>
                </View>
                <Text style={styles.reasoningText}>{ticket.priorityReasoning}</Text>
              </View>
            ) : null}
          </View>

          {/* 4. Incident Images */}
          {images.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.sectionIconWrap, { backgroundColor: '#f0fdf4' }]}>
                  <Ionicons name="images-outline" size={17} color="#16a34a" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>HÌNH ẢNH HIỆN TRƯỜNG ({images.length})</Text>
                  <Text style={styles.sectionSub}>Bấm để phóng to xem chi tiết</Text>
                </View>
              </View>

              {/* Main Image View */}
              <TouchableOpacity
                style={styles.mainImgWrap}
                activeOpacity={0.9}
                onPress={() => setZoomImgUrl(activeImage)}
              >
                <Image source={{ uri: activeImage }} style={styles.mainImg} resizeMode="cover" />
                <View style={styles.zoomHintBadge}>
                  <Ionicons name="scan-outline" size={14} color="#ffffff" />
                  <Text style={styles.zoomHintText}>Bấm để phóng to</Text>
                </View>
              </TouchableOpacity>

              {/* Thumbnail Bar if multiple */}
              {images.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbsRow}>
                  {images.map((img, idx) => (
                    <TouchableOpacity
                      key={`${img}-${idx}`}
                      style={[
                        styles.thumbBtn,
                        idx === selectedImgIdx && styles.thumbBtnActive,
                      ]}
                      onPress={() => setSelectedImgIdx(idx)}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: img }} style={styles.thumbImg} resizeMode="cover" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* 5. Categories & Department Responsible */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconWrap, { backgroundColor: '#f1f5f9' }]}>
                <Ionicons name="information-circle-outline" size={17} color="#334155" />
              </View>
              <Text style={styles.sectionTitle}>THÔNG TIN XỬ LÝ & ĐIỀU PHỐI</Text>
            </View>

            <View style={styles.metaGrid}>
              {/* Category */}
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Danh mục sự cố:</Text>
                <Text style={styles.metaValue}>
                  {ticket.categories?.map((c) => c.categoryName).join(', ') ||
                    ticket.categoryName ||
                    'Sự cố đô thị'}
                </Text>
              </View>

              {/* Sub Categories */}
              {Array.isArray(ticket.subCategories) && ticket.subCategories.length > 0 && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Hạng mục chi tiết:</Text>
                  <View style={styles.subCatChipsWrap}>
                    {ticket.subCategories.map((sub, idx) => (
                      <View key={idx} style={styles.subCatChip}>
                        <Text style={styles.subCatChipText}>{sub.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Department */}
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Đơn vị phụ trách:</Text>
                <Text style={[styles.metaValue, { color: '#0f172a', fontWeight: '700' }]}>
                  {ticket.departmentName || 'Đội phản ứng nhanh đô thị'}
                </Text>
              </View>

              {/* Created At */}
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Thời gian ghi nhận:</Text>
                <Text style={styles.metaValue}>{formatDateTime(ticket.createdAt)}</Text>
              </View>

              {/* Deadline */}
              {ticket.deadline && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Hạn hoàn thành xử lý:</Text>
                  <Text style={[styles.metaValue, { color: '#ea580c', fontWeight: '700' }]}>
                    {formatDateTime(ticket.deadline)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* 6. Technical Handling Steps Progress if available */}
          {Array.isArray(ticket.steps) && ticket.steps.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.sectionIconWrap, { backgroundColor: '#eff6ff' }]}>
                  <Ionicons name="construct-outline" size={17} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>TIẾN ĐỘ XỬ LÝ KỸ THUẬT</Text>
                  <Text style={styles.sectionSub}>Các bước triển khai khắc phục tại hiện trường</Text>
                </View>
              </View>

              <View style={styles.stepsTimeline}>
                {ticket.steps.map((step, idx) => {
                  const isDone = step.status === 'COMPLETED' || step.status === 'RESOLVED';
                  const isInProgress = step.status === 'IN_PROGRESS';
                  return (
                    <View key={step.id || idx} style={styles.stepItemRow}>
                      <View style={styles.stepIndicatorCol}>
                        <View
                          style={[
                            styles.stepDot,
                            isDone && styles.stepDotDone,
                            isInProgress && styles.stepDotInProgress,
                          ]}
                        >
                          <Ionicons
                            name={isDone ? 'checkmark' : isInProgress ? 'refresh' : 'ellipse'}
                            size={12}
                            color={isDone || isInProgress ? '#ffffff' : '#94a3b8'}
                          />
                        </View>
                        {idx < ticket.steps!.length - 1 && <View style={styles.stepLine} />}
                      </View>

                      <View style={styles.stepContentCol}>
                        <View style={styles.stepHeaderRow}>
                          <Text style={styles.stepName}>{step.stepName}</Text>
                          <View
                            style={[
                              styles.stepStatusBadge,
                              isDone && { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
                              isInProgress && { backgroundColor: '#fff7ed', borderColor: '#fed7aa' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.stepStatusText,
                                isDone && { color: '#16a34a' },
                                isInProgress && { color: '#ea580c' },
                              ]}
                            >
                              {isDone ? 'Xong' : isInProgress ? 'Đang làm' : 'Chờ thực hiện'}
                            </Text>
                          </View>
                        </View>

                        {step.notes ? (
                          <Text style={styles.stepNotesText}>{step.notes}</Text>
                        ) : null}

                        {step.startedAt && (
                          <Text style={styles.stepTimeText}>
                            Bắt đầu: {formatDateTime(step.startedAt)}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Privacy & Safety Note */}
          <View style={styles.privacyNoteBox}>
            <Ionicons name="shield-checkmark" size={16} color="#16a34a" />
            <Text style={styles.privacyNoteText}>
              Thông tin người báo cáo được bảo mật hoàn toàn theo quy định bảo vệ an toàn công dân.
            </Text>
          </View>

          {/* Bottom Action Button */}
          <TouchableOpacity style={styles.dismissBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.dismissBtnText}>ĐÃ HIỂU & ĐÓNG CẢNH BÁO</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Full Image Zoom Modal */}
        <Modal
          visible={Boolean(zoomImgUrl)}
          transparent
          animationType="fade"
          onRequestClose={() => setZoomImgUrl(null)}
        >
          <View style={styles.zoomModalOverlay}>
            <TouchableOpacity
              style={styles.zoomCloseBtn}
              onPress={() => setZoomImgUrl(null)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={26} color="#ffffff" />
            </TouchableOpacity>
            {zoomImgUrl && (
              <Image
                source={{ uri: zoomImgUrl }}
                style={styles.zoomedImage}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  emergencyBar: {
    height: 4,
    backgroundColor: '#dc2626',
  },
  headerBar: {
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
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
  },
  sosTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  redPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#dc2626',
  },
  sosHeaderTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#dc2626',
    letterSpacing: 0.8,
  },
  headerMainTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 1,
  },
  actionBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 36,
  },

  /* 1. Critical Banner */
  criticalCard: {
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  criticalCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  criticalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dc2626',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  criticalBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  criticalNote: {
    fontSize: 12,
    color: '#991b1b',
    lineHeight: 18,
    fontWeight: '500',
  },

  /* Section Card */
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  sectionSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  openMapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  openMapsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
  },

  /* Map Container */
  mapContainer: {
    height: 190,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  mapCalloutBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fca5a5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mapCalloutText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#dc2626',
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 10,
    padding: 10,
  },
  addressLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  addressValue: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '700',
    marginTop: 2,
    lineHeight: 18,
  },

  /* Description */
  descriptionText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  reasoningBox: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    borderRadius: 10,
    padding: 10,
    gap: 5,
  },
  reasoningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reasoningTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#c2410c',
    letterSpacing: 0.5,
  },
  reasoningText: {
    fontSize: 12,
    color: '#9a3412',
    lineHeight: 17,
  },

  /* Images */
  mainImgWrap: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f1f5f9',
  },
  mainImg: {
    width: '100%',
    height: '100%',
  },
  zoomHintBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  zoomHintText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  thumbsRow: {
    marginTop: 4,
  },
  thumbBtn: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbBtnActive: {
    borderColor: '#dc2626',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },

  /* Meta Grid */
  metaGrid: {
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    gap: 12,
  },
  metaLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  subCatChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-end',
    flex: 1,
  },
  subCatChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  subCatChipText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },

  /* Steps Timeline */
  stepsTimeline: {
    gap: 14,
    paddingTop: 4,
  },
  stepItemRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stepIndicatorCol: {
    alignItems: 'center',
    width: 20,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: '#16a34a',
  },
  stepDotInProgress: {
    backgroundColor: '#ea580c',
  },
  stepLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 4,
  },
  stepContentCol: {
    flex: 1,
    gap: 4,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stepName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  stepStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  stepStatusText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
  },
  stepNotesText: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
  stepTimeText: {
    fontSize: 10,
    color: '#94a3b8',
  },

  /* Privacy Note */
  privacyNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 10,
  },
  privacyNoteText: {
    fontSize: 11,
    color: '#166534',
    flex: 1,
    lineHeight: 16,
    fontWeight: '500',
  },

  /* Dismiss Button */
  dismissBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  dismissBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.6,
  },

  /* Zoom Modal */
  zoomModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomedImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
});
