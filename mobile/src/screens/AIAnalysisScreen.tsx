import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyzeReportImage } from '../api';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ReportDraft } from '../types';



const AI_STEPS = [
  'Tải ảnh lên hệ thống',
  'Tiền xử lý hình ảnh',
  'Nhận diện đối tượng (AI Model)',
  'Phân loại loại sự cố',
  'Đánh giá mức độ nghiêm trọng',
  'Hoàn tất — Kết quả sẵn sàng',
];

interface Props {
  navigate: (s: string) => void;
  goBack: () => void;
  draft: ReportDraft;
  setDraft: (d: ReportDraft) => void;
}

export default function AIAnalysisScreen({ navigate, goBack, draft, setDraft }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [done, setDone] = useState(false);
  const [confidence, setConfidence] = useState(0);

useEffect(() => {
  let mounted = true;

  const analyzeImage = async () => {
    try {
      setCurrentStep(0);
      setConfidence(0);
      setDone(false);

      // Step 1: lấy access token
      const accessToken = await AsyncStorage.getItem('accessToken');

      if (!accessToken) {
        throw new Error('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');
      }

      // Lấy ảnh/video đầu tiên để phân tích
      // Normalize .mov → .mp4 vì backend chỉ hỗ trợ mp4, không hỗ trợ .mov (QuickTime)
      let imageUrl = draft.imageUrls?.[0];

      if (!imageUrl) {
        throw new Error('Không tìm thấy ảnh/video để phân tích.');
      }

      // Cloudinary hỗ trợ convert format qua URL: đổi đuôi .mov → .mp4
      if (imageUrl.toLowerCase().endsWith('.mov')) {
        imageUrl = imageUrl.slice(0, -4) + '.mp4';
        console.log('🔄 Converted .mov → .mp4:', imageUrl);
      }


      console.log('🤖 START AI ANALYSIS');
      console.log('🖼️ Image URL:', imageUrl);

      // UI progress - bước upload
      if (mounted) {
        setCurrentStep(0);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      // UI progress - preprocessing
      if (mounted) {
        setCurrentStep(1);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      // UI progress - AI
      if (mounted) {
        setCurrentStep(2);
      }

      console.log('🤖 Calling analyzeReportImage...');

      // GỌI AI BACKEND THẬT
      const result = await analyzeReportImage(
        imageUrl,
        accessToken
      );

      console.log('✅ AI RESULT:', result);

      if (!mounted) return;

      // Progress animation đến 100%
      setCurrentStep(3);

      await new Promise((resolve) => setTimeout(resolve, 300));

      setCurrentStep(4);

      setConfidence(result.confidenceScore);

      await new Promise((resolve) => setTimeout(resolve, 300));

      setCurrentStep(5);

      // Lưu kết quả AI vào draft
      setDraft({
        ...draft,
        aiAnalysis: result,
        userCategoryId: result.categoryId,
        userSubCategoryId: result.subCategoryId || (result as any).subCategoryIds?.[0] || null,
      });

      setDone(true);

    } catch (error) {
      console.error('❌ AI ANALYSIS ERROR:', error);

      if (!mounted) return;

      // Có thể xử lý UI error sau
      setCurrentStep(0);

      alert(
        error instanceof Error
          ? error.message
          : 'Không thể phân tích hình ảnh. Vui lòng thử lại.'
      );
    }
  };

  analyzeImage();

  return () => {
    mounted = false;
  };
}, []);

  const handleNext = () => {
    navigate('review-draft');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.topAccentBar} />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[styles.backBtn, !done && { opacity: 0.4 }]}
          disabled={!done}
          onPress={goBack}
        >
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Tạo báo cáo (Bước 3/4)</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Step Header */}
      <View style={styles.stepHeader}>
        <View style={styles.stepTrack}>
          <View style={[styles.stepFill, { width: '75%' }]} />
        </View>
        <View style={styles.stepTextRow}>
          <Text style={styles.stepBadgeText}>BƯỚC 03</Text>
          <Text style={styles.stepTitleText}>PHÂN TÍCH BẰNG AI</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        <View style={styles.contentPadding}>
          {/* Scan Image Preview */}
          <View style={styles.scanImageCard}>
            {draft.imageUrls[0] ? (
              <Image source={{ uri: draft.imageUrls[0] }} style={styles.scanImage} />
            ) : null}
            <View style={styles.imageOverlay} />

            {!done ? (
              <View style={styles.scanningOverlay}>
                <ActivityIndicator size="large" color="#f97316" />
                <Text style={styles.scanningText}>
                  {AI_STEPS[currentStep] || 'Đang quét phân tích...'}
                </Text>
              </View>
            ) : (
              <View style={styles.doneBadgeTag}>
                <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
                <Text style={styles.doneBadgeText}>AI ĐÃ PHÂN TÍCH</Text>
              </View>
            )}
          </View>

          {/* Loading Confidence Bar */}
          {!done ? (
            <View style={styles.card}>
              <View style={styles.confidenceHeader}>
                <Text style={styles.confidenceTitle}>Tính toán độ tin cậy...</Text>
                <Text style={styles.confidenceScoreText}>
                  {Math.round(confidence)}%
                </Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.round(confidence)}%` },
                  ]}
                />
              </View>
            </View>
          ) : null}

          {/* AI Result Card */}
          {done ? (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Ionicons name="sparkles" size={18} color="#f97316" />
                <Text style={styles.resultTitle}>KẾT QUẢ PHÂN TÍCH AI</Text>
                <View style={styles.confidenceBadge}>
                  <Text style={styles.confidenceBadgeText}>
                    {Math.round(draft.aiAnalysis?.confidenceScore ?? 0)}% tin cậy
                  </Text>
                </View>
              </View>

              <View style={styles.resultRowsList}>
                {/* 1. Danh mục sự cố */}
                <View style={styles.resultRow}>
                  <Text style={styles.rowLabel}>Danh mục sự cố</Text>
                  <Text style={[styles.rowValue, { color: '#0f172a' }]}>
                    {draft.aiAnalysis?.categoryName ||
                      draft.aiAnalysis?.categoryId ||
                      'Chưa xác định'}
                  </Text>
                </View>

                {/* 2. Danh mục con (subCategoryName) */}
                {draft.aiAnalysis?.subCategoryName || draft.aiAnalysis?.subCategoryId ? (
                  <View style={styles.resultRow}>
                    <Text style={styles.rowLabel}>Chi tiết sự cố</Text>
                    <Text style={[styles.rowValue, { color: '#ea580c' }]}>
                      {draft.aiAnalysis?.subCategoryName || draft.aiAnalysis?.subCategoryId}
                    </Text>
                  </View>
                ) : null}

                {/* 3. Mức độ nghiêm trọng (severity) */}
                <View style={styles.resultRow}>
                  <Text style={styles.rowLabel}>Nghiêm trọng</Text>
                  {(() => {
                    const sev = (draft.aiAnalysis?.severity || '').toUpperCase();
                    const sevMap: Record<string, { label: string; bg: string; border: string; text: string }> = {
                      LOW: { label: 'Thấp', bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' },
                      MEDIUM: { label: 'Trung bình', bg: '#fffbeb', border: '#fde68a', text: '#d97706' },
                      HIGH: { label: 'Cao', bg: '#fef2f2', border: '#fca5a5', text: '#dc2626' },
                      CRITICAL: { label: 'Khẩn cấp', bg: '#fdf2f8', border: '#fbcfe8', text: '#be185d' },
                    };
                    const badge = sevMap[sev] || {
                      label: draft.aiAnalysis?.severity || 'Không xác định',
                      bg: '#f8fafc',
                      border: '#e2e8f0',
                      text: '#475569',
                    };
                    return (
                      <View style={{ backgroundColor: badge.bg, borderWidth: 1, borderColor: badge.border, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: badge.text }}>
                          {badge.label}
                        </Text>
                      </View>
                    );
                  })()}
                </View>

                {/* 4. Mức độ ưu tiên (priority) */}
                <View style={styles.resultRow}>
                  <Text style={styles.rowLabel}>Ưu tiên xử lý</Text>
                  {(() => {
                    const prio = (draft.aiAnalysis?.priority || '').toUpperCase();
                    const prioMap: Record<string, { label: string; bg: string; border: string; text: string }> = {
                      LOW: { label: 'Thấp', bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' },
                      MEDIUM: { label: 'Trung bình', bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb' },
                      HIGH: { label: 'Cao', bg: '#fef2f2', border: '#fca5a5', text: '#dc2626' },
                    };
                    const badge = prioMap[prio] || {
                      label: draft.aiAnalysis?.priority || 'Trung bình',
                      bg: '#f8fafc',
                      border: '#e2e8f0',
                      text: '#475569',
                    };
                    return (
                      <View style={{ backgroundColor: badge.bg, borderWidth: 1, borderColor: badge.border, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: badge.text }}>
                          {badge.label}
                        </Text>
                      </View>
                    );
                  })()}
                </View>

                {/* 5. Mô tả AI đề xuất */}
                <View style={styles.descBlock}>
                  <Text style={styles.descLabel}>Mô tả AI đề xuất:</Text>
                  <Text style={styles.descContent}>
                    {draft.aiAnalysis?.description || 'Không có mô tả.'}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Footer CTA Next */}
      {done ? (
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>XEM & XÁC NHẬN BẢN NHÁP</Text>
            <Ionicons name="arrow-forward" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      ) : null}
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

  /* Scan Image Card */
  scanImageCard: {
    height: 180,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  scanImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  scanningText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
    letterSpacing: 0.5,
  },
  doneBadgeTag: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  doneBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },

  /* Card */
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  confidenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confidenceTitle: {
    fontSize: 12,
    color: '#64748b',
  },
  confidenceScoreText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ea580c',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#f97316',
    borderRadius: 4,
  },

  /* Result Card */
  resultCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(249, 115, 22, 0.15)',
    gap: 8,
  },
  resultTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
    flex: 1,
  },
  confidenceBadge: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  confidenceBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ea580c',
  },
  resultRowsList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rowLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  chipHigh: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chipHighText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#dc2626',
  },
  chipDanger: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chipDangerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ea580c',
  },
  descBlock: {
    paddingVertical: 10,
    gap: 4,
  },
  descLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  descContent: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    fontStyle: 'italic',
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
  nextBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
});
