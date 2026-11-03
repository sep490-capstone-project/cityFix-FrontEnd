import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Image,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { captureRef } from 'react-native-view-shot';
import { Ionicons } from '@expo/vector-icons';
import {
  StaffTicketStep,
  StaffTicketStepEvidence,
  submitStaffEvidence,
} from '../../api';

export interface StampedPhotoItem {
  id: string;
  rawUri: string;
  stampedUri: string;
  timestamp: string;
  address: string;
  coordsText: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  ticketId: string;
  ticketAddress?: string;
  ticketLat?: number;
  ticketLng?: number;
  staffName?: string;
  steps: StaffTicketStep[];
  initialStepId?: string;
  onSuccess: (stepId: string, uploadedEvidences: StaffTicketStepEvidence[]) => void;
}

function formatNowTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} - ${pad(
    now.getDate()
  )}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
}

function getStepDisplayName(st: StaffTicketStep, idx: number): string {
  return (
    st.stepName ||
    st.name ||
    st.title ||
    st.notes ||
    `Bước ${idx + 1}`
  );
}

export default function EvidenceStampModal({
  visible,
  onClose,
  ticketId,
  ticketAddress,
  ticketLat,
  ticketLng,
  staffName,
  steps,
  initialStepId,
  onSuccess,
}: Props) {
  const [selectedStepId, setSelectedStepId] = useState<string>(initialStepId || '');
  const [photos, setPhotos] = useState<StampedPhotoItem[]>([]);
  const [resolutionNote, setResolutionNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // State cho ảnh đang được đóng dấu (pending captureRef)
  const [pendingRawUri, setPendingRawUri] = useState<string | null>(null);
  const [pendingTimestamp, setPendingTimestamp] = useState<string>('');
  const [pendingAddress, setPendingAddress] = useState<string>('');
  const [pendingCoords, setPendingCoords] = useState<string>('');
  const [processingPhoto, setProcessingPhoto] = useState<boolean>(false);

  const stampCanvasRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      if (initialStepId) {
        setSelectedStepId(initialStepId);
      } else if (steps.length > 0) {
        const activeStep =
          steps.find(
            (s) =>
              s.status === 'IN_PROGRESS' ||
              s.status === 'ASSIGNED' ||
              s.status === 'PENDING'
          ) || steps[0];
        setSelectedStepId(
          activeStep.id || activeStep.ticketStepId || activeStep.stepId || ''
        );
      }
    } else {
      setPhotos([]);
      setResolutionNote('');
      setPendingRawUri(null);
      setProcessingPhoto(false);
    }
  }, [visible, initialStepId, steps]);

  const activeStepObj = steps.find(
    (s) => (s.id || s.ticketStepId || s.stepId) === selectedStepId
  );
  const activeStepName = activeStepObj
    ? getStepDisplayName(activeStepObj, steps.indexOf(activeStepObj))
    : 'Xử lý hiện trường';

  // Lấy thông tin vị trí + địa chỉ thực tế tại thời điểm chụp
  const resolveLocationStamp = async (): Promise<{
    address: string;
    coordsText: string;
  }> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = pos.coords;
        const coordsText = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

        try {
          const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (geo && geo.length > 0) {
            const g = geo[0];
            const addr = [
              g.name,
              g.street,
              g.subregion || g.district,
              g.city || g.region,
            ]
              .filter(Boolean)
              .filter((v, i, a) => a.indexOf(v) === i)
              .join(', ');
            if (addr) {
              return { address: addr, coordsText };
            }
          }
        } catch {
          // ignore reverse geocode err
        }

        return {
          address: ticketAddress || coordsText,
          coordsText,
        };
      }
    } catch (e) {
      console.warn('Location stamp fallback:', e);
    }

    const fallbackCoords =
      ticketLat && ticketLng
        ? `${ticketLat.toFixed(6)}, ${ticketLng.toFixed(6)}`
        : 'Theo vị trí hồ sơ';
    return {
      address: ticketAddress || 'Hiện trường xử lý sự cố',
      coordsText: fallbackCoords,
    };
  };

  const startStampForPhoto = async (rawUri: string) => {
    setProcessingPhoto(true);
    const nowStr = formatNowTimestamp();
    const loc = await resolveLocationStamp();

    setPendingTimestamp(nowStr);
    setPendingAddress(loc.address);
    setPendingCoords(loc.coordsText);
    setPendingRawUri(rawUri);
  };

  // Khi ảnh trong khung đóng dấu đã tải xong, chụp lại View thành file ảnh mới có chứa chữ Ngày giờ + Địa chỉ
  const handleStampImageLoaded = async () => {
    if (!pendingRawUri) return;

    try {
      // Đợi 180ms để layout & text trên ảnh render hoàn tất
      await new Promise((r) => setTimeout(r, 180));

      let finalUri = pendingRawUri;
      if (stampCanvasRef.current) {
        try {
          const capturedUri = await captureRef(stampCanvasRef, {
            format: 'jpg',
            quality: 0.9,
            result: 'tmpfile',
          });
          if (capturedUri) {
            finalUri = capturedUri;
          }
        } catch (capErr) {
          console.warn('captureRef fallback to rawUri:', capErr);
        }
      }

      const newItem: StampedPhotoItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        rawUri: pendingRawUri,
        stampedUri: finalUri,
        timestamp: pendingTimestamp,
        address: pendingAddress,
        coordsText: pendingCoords,
      };

      setPhotos((prev) => [...prev, newItem]);
    } finally {
      setPendingRawUri(null);
      setProcessingPhoto(false);
    }
  };

  const handleTakeCameraPhoto = async () => {
    if (processingPhoto || submitting) return;
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Quyền truy cập', 'Cần cấp quyền Camera để chụp ảnh bằng chứng.');
        return;
      }

      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: false,
      });

      if (res.canceled || !res.assets?.[0]?.uri) return;
      await startStampForPhoto(res.assets[0].uri);
    } catch (err: any) {
      Alert.alert('Lỗi chụp ảnh', err?.message || 'Không thể mở máy ảnh.');
      setProcessingPhoto(false);
    }
  };

  const handlePickLibraryPhoto = async () => {
    if (processingPhoto || submitting) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Quyền truy cập', 'Cần cấp quyền Thư viện ảnh để chọn ảnh bằng chứng.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: false,
      });

      if (res.canceled || !res.assets?.[0]?.uri) return;
      await startStampForPhoto(res.assets[0].uri);
    } catch (err: any) {
      Alert.alert('Lỗi chọn ảnh', err?.message || 'Không thể chọn ảnh từ thư viện.');
      setProcessingPhoto(false);
    }
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSubmit = async () => {
    if (!selectedStepId) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn bước quy trình cần nộp bằng chứng.');
      return;
    }
    if (photos.length === 0) {
      Alert.alert('Thiếu hình ảnh', 'Vui lòng chụp ít nhất 1 ảnh bằng chứng hiện trường.');
      return;
    }

    try {
      setSubmitting(true);
      const uris = photos.map((p) => p.stampedUri);
      const uploaded = await submitStaffEvidence(
        selectedStepId,
        uris,
        resolutionNote.trim() || undefined
      );

      Alert.alert(
        'Thành công',
        'Đã tải ảnh bằng chứng (kèm dấu thời gian & địa chỉ) lên hệ thống thành công!'
      );
      onSuccess(selectedStepId, uploaded);
      onClose();
    } catch (err: any) {
      Alert.alert(
        'Không thể tải bằng chứng',
        err?.message || 'Đã xảy ra lỗi khi gửi bằng chứng.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Header chuẩn Resident Modal */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.iconBadge}>
                  <Ionicons name="camera" size={18} color="#ea580c" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Chụp & Nộp Bằng Chứng</Text>
                  <Text style={styles.modalSub} numberOfLines={1}>
                    Tự động đóng dấu Ngày giờ & Địa chỉ lên ảnh
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 480 }}
              contentContainerStyle={{ gap: 14, paddingBottom: 8 }}
            >
              {/* Nút chụp ảnh Camera & Thư viện */}
              <View style={styles.captureActionsRow}>
                <TouchableOpacity
                  style={styles.cameraPrimaryBtn}
                  onPress={handleTakeCameraPhoto}
                  disabled={processingPhoto || submitting}
                  activeOpacity={0.85}
                >
                  <Ionicons name="camera-outline" size={20} color="#ffffff" />
                  <Text style={styles.cameraPrimaryBtnText}>
                    {processingPhoto ? 'ĐANG ĐÓNG DẤU ẢNH...' : 'CHỤP ẢNH CAMERA'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.gallerySecondaryBtn}
                  onPress={handlePickLibraryPhoto}
                  disabled={processingPhoto || submitting}
                  activeOpacity={0.85}
                >
                  <Ionicons name="images-outline" size={18} color="#0f172a" />
                  <Text style={styles.gallerySecondaryBtnText}>Thư viện</Text>
                </TouchableOpacity>
              </View>

              {/* Khung kết xuất đóng dấu (Watermark Canvas) khi đang xử lý ảnh mới chụp */}
              {pendingRawUri && (
                <View style={styles.stampPreviewSection}>
                  <View style={styles.processingBanner}>
                    <ActivityIndicator size="small" color="#ea580c" />
                    <Text style={styles.processingBannerText}>
                      Đang gắn Ngày giờ & Địa chỉ hiện trường lên bức ảnh...
                    </Text>
                  </View>

                  <View
                    ref={stampCanvasRef}
                    collapsable={false}
                    style={styles.stampCanvasBox}
                  >
                    <Image
                      source={{ uri: pendingRawUri }}
                      style={styles.stampCanvasImage}
                      resizeMode="cover"
                      onLoadEnd={handleStampImageLoaded}
                    />

                    {/* Lớp phủ Watermark (Được chụp cứng vào ảnh) */}
                    <View style={styles.watermarkOverlay}>
                      <View style={styles.watermarkBadgeRow}>
                        <View style={styles.watermarkBrandPill}>
                          <Text style={styles.watermarkBrandText}>
                            CITYFIX EVIDENCE · #{String(ticketId).slice(0, 8)}
                          </Text>
                        </View>
                        <Text style={styles.watermarkStepText} numberOfLines={1}>
                          {activeStepName}
                        </Text>
                      </View>

                      <Text style={styles.watermarkTimeText}>
                        🕒 Ngày giờ: {pendingTimestamp}
                      </Text>
                      <Text style={styles.watermarkAddressText} numberOfLines={2}>
                        📍 Địa chỉ: {pendingAddress}
                      </Text>
                      <Text style={styles.watermarkMetaText} numberOfLines={1}>
                        🌐 GPS: {pendingCoords}
                        {staffName ? ` · Cán bộ: ${staffName}` : ''}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Danh sách các ảnh đã đóng dấu xong */}
              {photos.length > 0 && (
                <View style={styles.fieldSection}>
                  <Text style={styles.fieldLabel}>
                    ẢNH ĐÃ ĐÓNG DẤU NGÀY GIỜ & ĐỊA CHỈ ({photos.length})
                  </Text>
                  <View style={styles.stampedList}>
                    {photos.map((item) => (
                      <View key={item.id} style={styles.stampedCard}>
                        <Image
                          source={{ uri: item.stampedUri }}
                          style={styles.stampedCardImage}
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          style={styles.removePhotoBtn}
                          onPress={() => handleRemovePhoto(item.id)}
                        >
                          <Ionicons name="close-circle" size={24} color="#ef4444" />
                        </TouchableOpacity>
                        <View style={styles.stampedInfoStrip}>
                          <Text style={styles.stampedInfoTime}>
                            🕒 {item.timestamp}
                          </Text>
                          <Text style={styles.stampedInfoAddr} numberOfLines={1}>
                            📍 {item.address}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Ghi chú kết quả xử lý */}
              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>GHI CHÚ NGHIỆM THU / XỬ LÝ</Text>
                <TextInput
                  style={styles.noteInput}
                  multiline
                  numberOfLines={3}
                  value={resolutionNote}
                  onChangeText={setResolutionNote}
                  placeholder="Mô tả kết quả khắc phục sự cố tại hiện trường..."
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </ScrollView>

            {/* Footer Actions */}
            <View style={styles.footerRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Đóng</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  (photos.length === 0 || submitting || processingPhoto) &&
                    styles.submitBtnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={photos.length === 0 || submitting || processingPhoto}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={17} color="#ffffff" />
                    <Text style={styles.submitBtnText}>
                      GỬI BẰNG CHỨNG ({photos.length})
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldSection: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
  },
  stepChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stepChipActive: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderColor: '#f97316',
  },
  stepChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  stepChipTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  captureActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cameraPrimaryBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f97316',
    borderRadius: 14,
    paddingVertical: 13,
  },
  cameraPrimaryBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  gallerySecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingVertical: 13,
  },
  gallerySecondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  stampPreviewSection: {
    gap: 8,
  },
  processingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  processingBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
    flex: 1,
  },
  stampCanvasBox: {
    width: '100%',
    height: 250,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    position: 'relative',
  },
  stampCanvasImage: {
    width: '100%',
    height: '100%',
  },
  watermarkOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1.5,
    borderTopColor: '#f97316',
    gap: 2,
  },
  watermarkBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  watermarkBrandPill: {
    backgroundColor: '#f97316',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  watermarkBrandText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  watermarkStepText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fdba74',
    flex: 1,
    textAlign: 'right',
  },
  watermarkTimeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  watermarkAddressText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#f8fafc',
    lineHeight: 14,
  },
  watermarkMetaText: {
    fontSize: 9,
    color: '#cbd5e1',
    marginTop: 1,
  },
  stampedList: {
    gap: 10,
  },
  stampedCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    position: 'relative',
  },
  stampedCardImage: {
    width: '100%',
    height: 210,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 14,
  },
  stampedInfoStrip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  stampedInfoTime: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
  },
  stampedInfoAddr: {
    fontSize: 10,
    color: '#475569',
    marginTop: 1,
  },
  noteInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 12,
  },
  submitBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});
