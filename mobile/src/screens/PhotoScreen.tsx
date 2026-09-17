import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  StatusBar,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ReportDraft } from '../types';

const SAMPLE_IMAGES = [
  { id: '1', url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=400&h=400&fit=crop&auto=format', label: 'Ổ gà mặt đường' },
  { id: '2', url: 'https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?w=400&h=400&fit=crop&auto=format', label: 'Đèn đường hỏng' },
  { id: '3', url: 'https://images.unsplash.com/photo-1542393545-10f5cde2c810?w=400&h=400&fit=crop&auto=format', label: 'Cống tắc / Ngập' },
  { id: '4', url: 'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=400&h=400&fit=crop&auto=format', label: 'Cây gãy đổ' },
  { id: '5', url: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop&auto=format', label: 'Sụt vỉa hè' },
];

const MAX_IMAGES = 5;

interface Props {
  navigate: (s: string) => void;
  goBack: () => void;
  draft: ReportDraft;
  setDraft: (d: ReportDraft) => void;
}

export default function PhotoScreen({ navigate, goBack, draft, setDraft }: Props) {
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [validationError, setValidationError] = useState(false);

  const images = draft.imageUrls;
  const canAddMore = images.length < MAX_IMAGES;
  const galleryAllowed = draft.locationMethod === 'MANUAL_ENTRY';

  const addImage = (url: string) => {
    if (!canAddMore) return;
    if (images.includes(url)) return;
    const next = [...images, url];
    setDraft({ ...draft, imageUrls: next });
    setValidationError(false);
  };

  const removeImage = (url: string) => {
    setDraft({ ...draft, imageUrls: images.filter((u) => u !== url) });
  };

  const handleNext = () => {
    if (images.length === 0) {
      setValidationError(true);
      return;
    }
    navigate('ai-analysis');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.topAccentBar} />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Tạo báo cáo (Bước 2/4)</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Step Indicator Header */}
      <View style={styles.stepHeader}>
        <View style={styles.stepTrack}>
          <View style={[styles.stepFill, { width: '50%' }]} />
        </View>
        <View style={styles.stepTextRow}>
          <Text style={styles.stepBadgeText}>BƯỚC 02</Text>
          <Text style={styles.stepTitleText}>ĐÍNH KÈM ẢNH HIỆN TRƯỜNG</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        <View style={styles.contentPadding}>
          {/* Selected Images Grid */}
          {images.length > 0 ? (
            <View style={styles.gridSection}>
              <View style={styles.gridHeaderRow}>
                <Text style={styles.gridTitle}>
                  Đã chọn ({images.length}/{MAX_IMAGES})
                </Text>
              </View>

              <View style={styles.imageGrid}>
                {images.map((url, idx) => (
                  <View key={url} style={styles.gridImageItem}>
                    <Image source={{ uri: url }} style={styles.thumbImage} />
                    <TouchableOpacity
                      style={styles.removeBadge}
                      onPress={() => removeImage(url)}
                    >
                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}

                {canAddMore ? (
                  <TouchableOpacity
                    style={styles.addSlotBtn}
                    onPress={() =>
                      galleryAllowed
                        ? setShowGalleryModal(true)
                        : addImage(SAMPLE_IMAGES[images.length % SAMPLE_IMAGES.length].url)
                    }
                  >
                    <Ionicons name="camera-outline" size={24} color="#ea580c" />
                    <Text style={styles.addSlotText}>+ Thêm</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Empty Upload Zone */}
          {images.length === 0 ? (
            <View
              style={[
                styles.uploadBox,
                validationError && styles.uploadBoxError,
              ]}
            >
              <View style={styles.uploadIconBox}>
                <Ionicons
                  name="camera-outline"
                  size={36}
                  color={validationError ? '#dc2626' : '#f97316'}
                />
              </View>

              <Text style={styles.uploadTitle}>
                {validationError
                  ? 'CẦN ĐÍNH KÈM ÍT NHẤT 1 ẢNH!'
                  : 'CHỤP HOẶC CHỌN ẢNH SỰ CỐ'}
              </Text>
              <Text style={styles.uploadSub}>
                Tối đa {MAX_IMAGES} ảnh · Nhiều góc chụp giúp AI phân tích chính xác
              </Text>

              <View style={styles.sourceBtnRow}>
                <TouchableOpacity
                  style={styles.cameraBtn}
                  onPress={() =>
                    addImage(SAMPLE_IMAGES[images.length % SAMPLE_IMAGES.length].url)
                  }
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera" size={16} color="#ffffff" />
                  <Text style={styles.cameraBtnText}>Chụp Camera</Text>
                </TouchableOpacity>

                {galleryAllowed ? (
                  <TouchableOpacity
                    style={styles.galleryBtn}
                    onPress={() => setShowGalleryModal(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="images-outline" size={16} color="#0f172a" />
                    <Text style={styles.galleryBtnText}>Chọn Thư viện</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.galleryDisabledBtn}>
                    <Ionicons name="images-outline" size={16} color="#94a3b8" />
                    <Text style={styles.galleryDisabledText}>GPS chỉ chụp ảnh</Text>
                  </View>
                )}
              </View>

              {!galleryAllowed ? (
                <Text style={styles.gpsNoticeText}>
                  * Vị trí GPS tự động bắt buộc chụp trực tiếp từ Camera để đảm bảo tính xác thực.
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Tips Card */}
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb-outline" size={18} color="#f97316" />
              <Text style={styles.tipsTitle}>MẸO CHỤP ẢNH TỐT</Text>
            </View>
            <View style={styles.tipsList}>
              <Text style={styles.tipItem}>
                • Chụp rõ vị trí sự cố và một góc rộng thấy bối cảnh xung quanh.
              </Text>
              <Text style={styles.tipItem}>
                • Giữ khoảng cách 1 - 3m để máy ảnh chụp đủ ánh sáng.
              </Text>
              <Text style={styles.tipItem}>
                • Tránh chụp ngược sáng mạnh hoặc hình ảnh bị mờ.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Gallery Modal Picker */}
      <Modal
        visible={showGalleryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGalleryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Chọn ảnh mẫu ({images.length}/{MAX_IMAGES})
              </Text>
              <TouchableOpacity onPress={() => setShowGalleryModal(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.galleryGrid}>
              {SAMPLE_IMAGES.map((img) => {
                const selected = images.includes(img.url);
                return (
                  <TouchableOpacity
                    key={img.id}
                    style={[
                      styles.sampleThumbItem,
                      selected && styles.sampleThumbSelected,
                    ]}
                    onPress={() =>
                      selected ? removeImage(img.url) : addImage(img.url)
                    }
                  >
                    <Image source={{ uri: img.url }} style={styles.sampleThumbImage} />
                    {selected ? (
                      <View style={styles.selectedCheckOverlay}>
                        <Ionicons name="checkmark-circle" size={24} color="#f97316" />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowGalleryModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>Xong</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Footer CTA */}
      <View style={styles.footerContainer}>
        <TouchableOpacity
          style={[styles.nextBtn, images.length === 0 && styles.nextBtnDisabled]}
          disabled={images.length === 0}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>
            PHÂN TÍCH BẰNG AI ({images.length} ẢNH)
          </Text>
          <Ionicons name="sparkles" size={18} color="#ffffff" />
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
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
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  stepHeader: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  stepTrack: {
    height: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 2,
    overflow: 'hidden',
  },
  stepFill: {
    height: '100%',
    backgroundColor: '#f97316',
  },
  stepTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  stepBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ea580c',
    letterSpacing: 1,
  },
  stepTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  scrollArea: {
    flex: 1,
  },
  contentPadding: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },

  /* Selected Grid */
  gridSection: {
    gap: 10,
  },
  gridHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridImageItem: {
    width: 90,
    height: 90,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  removeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ffffff',
    borderRadius: 10,
  },
  addSlotBtn: {
    width: 90,
    height: 90,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(249, 115, 22, 0.4)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(249, 115, 22, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  addSlotText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
  },

  /* Upload Box */
  uploadBox: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  uploadBoxError: {
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  uploadIconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  uploadSub: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
  sourceBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  cameraBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  galleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  galleryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  galleryDisabledBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    opacity: 0.6,
  },
  galleryDisabledText: {
    fontSize: 11,
    color: '#64748b',
  },
  gpsNoticeText: {
    fontSize: 10,
    color: '#ea580c',
    textAlign: 'center',
    marginTop: 4,
  },

  /* Tips Card */
  tipsCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tipsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
    letterSpacing: 1,
  },
  tipsList: {
    gap: 6,
  },
  tipItem: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },

  /* Footer CTA */
  footerContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f97316',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextBtnDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.8,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sampleThumbItem: {
    width: 95,
    height: 95,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sampleThumbSelected: {
    borderColor: '#f97316',
  },
  sampleThumbImage: {
    width: '100%',
    height: '100%',
  },
  selectedCheckOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtn: {
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCloseBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});
