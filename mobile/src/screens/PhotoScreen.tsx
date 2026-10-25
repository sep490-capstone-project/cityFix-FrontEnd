import React, { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadReportImage } from '../api';

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

const MAX_IMAGES = 5;

interface Props {
  navigate: (s: string) => void;
  goBack: () => void;
  draft: ReportDraft;
  setDraft: (d: ReportDraft) => void;
}

export default function PhotoScreen({
  navigate,
  goBack,
  draft,
  setDraft,
}: Props) {
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [validationError, setValidationError] = useState(false);
  const [uploading, setUploading] = useState(false);

  const images = draft.imageUrls;
  const canAddMore = images.length < MAX_IMAGES;

  // Cả Camera lẫn Thư viện đều luôn được phép

  // =========================================================
  // CAMERA
  // =========================================================

  const handleTakePhoto = async () => {
    if (uploading || images.length >= MAX_IMAGES) {
      return;
    }

    try {
      setUploading(true);
      setValidationError(false);

      // 1. Xin quyền Camera
      const permission =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        alert(
          'CityFix cần quyền Camera để chụp ảnh sự cố.'
        );
        return;
      }

      // 2. Mở Camera
      const result =
        await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          allowsEditing: false,
        });

      // Người dùng bấm Cancel
      if (result.canceled) {
        return;
      }

      const photo = result.assets[0];

      if (!photo?.uri) {
        alert('Không lấy được ảnh từ Camera.');
        return;
      }

      console.log('📷 Local image:', photo.uri);

      // 3. Lấy access token
      const accessToken =
        await AsyncStorage.getItem('accessToken');

      if (!accessToken) {
        alert(
          'Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.'
        );
        return;
      }

      // 4. Upload ảnh lên backend -> Cloudinary
      const secureUrl = await uploadReportImage(
        photo.uri,
        accessToken
      );

     console.log('================================');
console.log('☁️ UPLOAD ẢNH THÀNH CÔNG');
console.log('🔗 CLOUDINARY URL:', secureUrl);
console.log('================================');

      // 5. Lưu URL Cloudinary vào draft
      const nextImages = [
        ...draft.imageUrls,
        secureUrl,
      ];

      setDraft({
        ...draft,
        imageUrls: nextImages,
      });

      console.log(
        '✅ imageUrls:',
        nextImages
      );
    } catch (error) {
      console.error(
        '❌ Camera / Upload error:',
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : 'Không thể chụp hoặc tải ảnh lên.'
      );
    } finally {
      setUploading(false);
    }
  };

  // =========================================================
  // GALLERY
  // =========================================================

  const handlePickFromGallery = async () => {
    if (
      uploading ||
      images.length >= MAX_IMAGES
    ) {
      return;
    }

    try {
      setUploading(true);
      setValidationError(false);

      // 1. Xin quyền thư viện ảnh
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        alert(
          'CityFix cần quyền thư viện ảnh để chọn ảnh sự cố.'
        );
        return;
      }

      // 2. Mở Gallery (ảnh lẫn video)
      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          quality: 0.8,
          allowsEditing: false,
          allowsMultipleSelection: true,
          selectionLimit:
            MAX_IMAGES - images.length,
        });

      // Người dùng Cancel
      if (result.canceled) {
        return;
      }

      if (!result.assets?.length) {
        return;
      }

      console.log(
        '🖼️ Selected images:',
        result.assets.length
      );

      // 3. Lấy access token
      const accessToken =
        await AsyncStorage.getItem('accessToken');

      if (!accessToken) {
        alert(
          'Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.'
        );
        return;
      }

      // 4. Upload từng ảnh
      const uploadedUrls: string[] = [];

      for (const asset of result.assets) {
        if (!asset.uri) {
          continue;
        }

        console.log(
          '☁️ Uploading:',
          asset.uri
        );

        const secureUrl =
          await uploadReportImage(
            asset.uri,
            accessToken
          );

        uploadedUrls.push(secureUrl);

        console.log(
          '✅ Uploaded:',
          secureUrl
        );
      }

      // 5. Lưu tất cả URL vào draft
      const nextImages = [
        ...draft.imageUrls,
        ...uploadedUrls,
      ].slice(0, MAX_IMAGES);

      setDraft({
        ...draft,
        imageUrls: nextImages,
      });

      console.log(
        '✅ imageUrls:',
        nextImages
      );

      setShowGalleryModal(false);
    } catch (error) {
      console.error(
        '❌ Gallery / Upload error:',
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : 'Không thể chọn hoặc tải ảnh lên.'
      );
    } finally {
      setUploading(false);
    }
  };

  // =========================================================
  // REMOVE IMAGE
  // =========================================================

  const removeImage = (url: string) => {
    setDraft({
      ...draft,
      imageUrls: images.filter(
        (item) => item !== url
      ),
    });
  };

  // =========================================================
  // NEXT
  // =========================================================

  const handleNext = () => {
    if (images.length === 0) {
      setValidationError(true);
      return;
    }

    navigate('ai-analysis');
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
      />

      <View style={styles.topAccentBar} />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={goBack}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color="#0f172a"
          />
        </TouchableOpacity>

        <Text style={styles.topBarTitle}>
          Tạo báo cáo (Bước 2/4)
        </Text>

        <View style={{ width: 36 }} />
      </View>

      {/* Step Indicator Header */}
      <View style={styles.stepHeader}>
        <View style={styles.stepTrack}>
          <View
            style={[
              styles.stepFill,
              { width: '50%' },
            ]}
          />
        </View>

        <View style={styles.stepTextRow}>
          <Text style={styles.stepBadgeText}>
            BƯỚC 02
          </Text>

          <Text style={styles.stepTitleText}>
            ĐÍNH KÈM ẢNH HIỆN TRƯỜNG
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentPadding}>
          {/* ================================================= */}
          {/* SELECTED IMAGES */}
          {/* ================================================= */}

          {images.length > 0 ? (
            <View style={styles.gridSection}>
              <View style={styles.gridHeaderRow}>
                <Text style={styles.gridTitle}>
                  Đã chọn ({images.length}/
                  {MAX_IMAGES})
                </Text>
              </View>

              <View style={styles.imageGrid}>
                {images.map((url) => (
                  <View
                    key={url}
                    style={styles.gridImageItem}
                  >
                    <Image
                      source={{ uri: url }}
                      style={styles.thumbImage}
                    />

                    <TouchableOpacity
                      style={styles.removeBadge}
                      onPress={() =>
                        removeImage(url)
                      }
                    >
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color="#ef4444"
                      />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Add more */}
                {canAddMore ? (
                  <TouchableOpacity
                    style={styles.addSlotBtn}
                    onPress={() =>
                      setShowGalleryModal(true)
                    }
                    disabled={uploading}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={24}
                      color="#ea580c"
                    />

                    <Text
                      style={styles.addSlotText}
                    >
                      {uploading
                        ? 'ĐANG TẢI...'
                        : '+ Thêm'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* ================================================= */}
          {/* EMPTY UPLOAD ZONE */}
          {/* ================================================= */}

          {images.length === 0 ? (
            <View
              style={[
                styles.uploadBox,
                validationError &&
                  styles.uploadBoxError,
              ]}
            >
              <View
                style={styles.uploadIconBox}
              >
                <Ionicons
                  name="camera-outline"
                  size={36}
                  color={
                    validationError
                      ? '#dc2626'
                      : '#f97316'
                  }
                />
              </View>

              <Text
                style={styles.uploadTitle}
              >
                {validationError
                  ? 'CẦN ĐÍNH KÈM ÍT NHẤT 1 ẢNH!'
                  : 'CHỤP HOẶC CHỌN ẢNH SỰ CỐ'}
              </Text>

              <Text
                style={styles.uploadSub}
              >
                Tối đa {MAX_IMAGES} ảnh · Nhiều
                góc chụp giúp AI phân tích chính
                xác
              </Text>

              <View
                style={styles.sourceBtnRow}
              >
                {/* Camera */}
                <TouchableOpacity
                  style={styles.addTile}
                  onPress={handleTakePhoto}
                  disabled={uploading}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="camera-outline"
                    size={24}
                    color="#ea580c"
                  />

                  <Text
                    style={styles.addText}
                  >
                    {uploading
                      ? 'ĐANG TẢI...'
                      : 'Camera'}
                  </Text>
                </TouchableOpacity>

                {/* Thư viện */}
                <TouchableOpacity
                  style={styles.galleryBtn}
                  onPress={() =>
                    setShowGalleryModal(true)
                  }
                  disabled={uploading}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="images-outline"
                    size={16}
                    color="#0f172a"
                  />

                  <Text
                    style={
                      styles.galleryBtnText
                    }
                  >
                    Thư viện
                  </Text>
                </TouchableOpacity>
              </View>

            </View>
          ) : null}

          {/* ================================================= */}
          {/* TIPS */}
          {/* ================================================= */}

          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Ionicons
                name="bulb-outline"
                size={18}
                color="#f97316"
              />

              <Text style={styles.tipsTitle}>
                MẸO CHỤP ẢNH TỐT
              </Text>
            </View>

            <View style={styles.tipsList}>
              <Text style={styles.tipItem}>
                • Chụp rõ vị trí sự cố và một góc
                rộng thấy bối cảnh xung quanh.
              </Text>

              <Text style={styles.tipItem}>
                • Giữ khoảng cách 1 - 3m để máy
                ảnh chụp đủ ánh sáng.
              </Text>

              <Text style={styles.tipItem}>
                • Tránh chụp ngược sáng mạnh hoặc
                hình ảnh bị mờ.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ================================================= */}
      {/* GALLERY MODAL */}
      {/* ================================================= */}

      <Modal
        visible={showGalleryModal}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setShowGalleryModal(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Thêm ảnh / video
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setShowGalleryModal(false)
                }
              >
                <Ionicons
                  name="close"
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>

            <Text
              style={styles.modalDescription}
            >
              Còn có thể thêm tối đa{' '}
              {MAX_IMAGES - images.length} file.
            </Text>

            {/* Camera button */}
            <TouchableOpacity
              style={styles.modalGalleryBtn}
              onPress={() => {
                setShowGalleryModal(false);
                handleTakePhoto();
              }}
              disabled={uploading}
              activeOpacity={0.8}
            >
              <Ionicons
                name="camera-outline"
                size={22}
                color="#ffffff"
              />

              <Text
                style={
                  styles.modalGalleryBtnText
                }
              >
                CHỤP ẢNH BẰNG CAMERA
              </Text>
            </TouchableOpacity>

            {/* Gallery button */}
            <TouchableOpacity
              style={[
                styles.modalGalleryBtn,
                { backgroundColor: '#0f172a', marginTop: 10 },
              ]}
              onPress={handlePickFromGallery}
              disabled={uploading}
              activeOpacity={0.8}
            >
              <Ionicons
                name="images-outline"
                size={22}
                color="#ffffff"
              />

              <Text
                style={
                  styles.modalGalleryBtnText
                }
              >
                {uploading
                  ? 'ĐANG TẢI LÊN...'
                  : 'CHỌN TỪ THƯ VIỆN (ẢNH / VIDEO)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() =>
                setShowGalleryModal(false)
              }
              disabled={uploading}
            >
              <Text
                style={styles.modalCloseBtnText}
              >
                Đóng
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================================================= */}
      {/* FOOTER CTA */}
      {/* ================================================= */}

      <View style={styles.footerContainer}>
        <TouchableOpacity
          style={[
            styles.nextBtn,
            images.length === 0 &&
              styles.nextBtnDisabled,
          ]}
          disabled={
            images.length === 0 || uploading
          }
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>
            PHÂN TÍCH BẰNG AI ({images.length}{' '}
            ẢNH)
          </Text>

          <Ionicons
            name="sparkles"
            size={18}
            color="#ffffff"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// =========================================================
// STYLES
// =========================================================

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
    backgroundColor:
      'rgba(249, 115, 22, 0.1)',
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
    alignItems: 'center',
  },

  addTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },

  addText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
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

  /* Tips */

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

  /* Footer */

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
    shadowOffset: {
      width: 0,
      height: 4,
    },
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
    backgroundColor:
      'rgba(15, 23, 42, 0.5)',
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

  modalDescription: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },

  modalGalleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 13,
    gap: 8,
  },

  modalGalleryBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },

  modalCloseBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },

  modalCloseBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
});