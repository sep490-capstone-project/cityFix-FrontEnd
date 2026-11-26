import React, { useState, useEffect } from 'react';
import {
  View,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ReportDraft, CATEGORIES } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createTicket,
  checkDuplicates,
  DuplicateTicketItem,
  isVideoUrl,
  getMediaThumbnailUrl,
} from '../../api';
import { AuthUser } from '../LoginScreen';
import { formatStandardAddress } from '../../constants/vnProvinces2025';

const LOW_CONFIDENCE_THRESHOLD = 70;

interface Props {
  navigate: (s: string) => void;
  goBack: () => void;
  draft: ReportDraft;
  setDraft: (d: ReportDraft) => void;
  authUser?: AuthUser | null;
  onDuplicatesFound?: (dupes: DuplicateTicketItem[]) => void;
  onTicketCreated?: (ticket: any) => void;
}

export default function ReviewDraftScreen({
  navigate,
  goBack,
  draft,
  setDraft,
  authUser,
  onDuplicatesFound,
  onTicketCreated,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);

  const ai = draft.aiAnalysis;
  const isLowConfidence = (ai?.confidenceScore ?? 100) < LOW_CONFIDENCE_THRESHOLD;

  useEffect(() => {
    if (isLowConfidence) {
      setEditing(true);
    }
  }, [isLowConfidence]);

  useEffect(() => {
    if (!draft.userDescription && ai?.description) {
      setDraft({ ...draft, userDescription: ai.description });
    }
  }, [ai?.description]);
  const currentCatId = draft.userCategoryId || ai?.categoryId || '';
  const matchedCat = CATEGORIES.find((c) => c.categoryId === currentCatId);
  const currentCatName =
    matchedCat?.name ||
    ai?.categoryName ||
    ai?.subCategoryName ||
    ai?.subCategoryNames?.[0] ||
    'Chưa xác định';

  const handleSubmit = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);

      // 1. Lấy access token
      const accessToken = await AsyncStorage.getItem('accessToken');

      if (!accessToken) {
        throw new Error('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');
      }

      // 2. Kiểm tra dữ liệu bắt buộc
      if (!draft.imageUrls?.length) {
        throw new Error('Chưa có ảnh sự cố.');
      }

      if (!draft.location) {
        throw new Error('Chưa có vị trí sự cố.');
      }

      if (!draft.aiAnalysis) {
        throw new Error('Chưa có kết quả phân tích AI.');
      }

      const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      // 3. Trích xuất danh sách subCategoryIds trước khi kiểm tra trùng lặp
      const effectiveSubCatIds: string[] = [];
      if (Array.isArray(draft.userSubCategoryIds) && draft.userSubCategoryIds.length > 0) {
        effectiveSubCatIds.push(...draft.userSubCategoryIds.filter(Boolean));
      } else if (Array.isArray(draft.aiAnalysis.subCategoryIds) && draft.aiAnalysis.subCategoryIds.length > 0) {
        effectiveSubCatIds.push(...draft.aiAnalysis.subCategoryIds.filter(Boolean));
      } else if (draft.userSubCategoryId) {
        effectiveSubCatIds.push(draft.userSubCategoryId);
      } else if (draft.aiAnalysis.subCategoryId) {
        effectiveSubCatIds.push(draft.aiAnalysis.subCategoryId);
      }

      const uniqueSubCatIds = Array.from(new Set(effectiveSubCatIds.filter(Boolean)));

      if (uniqueSubCatIds.length === 0) {
        throw new Error('Chưa có danh mục con (subCategory). Vui lòng thử phân tích lại ảnh.');
      }

      const effectiveCatId =
        (draft.userCategoryId && UUID_PATTERN.test(draft.userCategoryId) ? draft.userCategoryId : null) ||
        (draft.aiAnalysis.categoryId && UUID_PATTERN.test(draft.aiAnalysis.categoryId) ? draft.aiAnalysis.categoryId : null) ||
        uniqueSubCatIds[0] ||
        '';

      const standardizedAddress = formatStandardAddress(draft.address) || draft.address || '';

      // 4. Gọi API check-duplicates trước khi tạo (Hỗ trợ quét từng subCategoryId vì BE chỉ nhận 1 subCategoryId/request)
      try {
        console.log('🔍 Checking duplicates before submit for subCategoryIds:', uniqueSubCatIds);
        const dupes = await checkDuplicates(
          {
            subCategoryId: uniqueSubCatIds[0],
            subCategoryIds: uniqueSubCatIds,
            categoryId: effectiveCatId,
            latitude: draft.location.lat,
            longitude: draft.location.lng,
            location: standardizedAddress,
          },
          accessToken
        );

        if (dupes && dupes.length > 0) {
          console.log('⚠️ Duplicates found:', dupes.length);
          if (onDuplicatesFound) {
            onDuplicatesFound(dupes);
            return;
          }
        }
      } catch (dupErr) {
        console.warn('Check duplicates API warning:', dupErr);
      }

      const effectivePriority =
        draft.aiAnalysis.priority ||
        (draft.aiAnalysis.severity === 'CRITICAL' ? 'HIGH' : draft.aiAnalysis.severity) ||
        'LOW';

      const finalCategoryId = effectiveCatId || uniqueSubCatIds[0];

      const requestBody = {
        description:
          draft.userDescription ||
          draft.aiAnalysis.description ||
          '',
        imageUrl: draft.imageUrls[0],
        imageUrls: draft.imageUrls,
        images: draft.imageUrls,
        categoryId: finalCategoryId,
        subCategoryIds: uniqueSubCatIds,
        severity: (draft.aiAnalysis.severity || effectivePriority || 'LOW').toUpperCase(),
        dangerLevel: (draft.aiAnalysis.dangerLevel || 'CAUTION').toUpperCase(),
        priority: effectivePriority.toUpperCase(),
        priorityReasoning: draft.aiAnalysis.priorityReasoning || '',
        locationMethod: draft.locationMethod || 'AUTO_GPS',
        address: standardizedAddress,
        latitude: draft.location.lat,
        longitude: draft.location.lng,
        confidenceScore: draft.aiAnalysis.confidenceScore || 0,
        isAnonymous: draft.isAnonymous ?? false,
      };

      console.log('🎫 CREATE TICKET BODY (ALL SUB-CATS):', JSON.stringify(requestBody, null, 2));

      // 5. Gọi API Backend
      const result = await createTicket(requestBody, accessToken);

      console.log('✅ TICKET CREATED:', result);

      // Trích xuất danh sách tên subCategories
      const allSubNames: string[] = [];
      if (Array.isArray(draft.aiAnalysis.subCategoryNames) && draft.aiAnalysis.subCategoryNames.length > 0) {
        allSubNames.push(...draft.aiAnalysis.subCategoryNames.filter(Boolean));
      } else if (draft.aiAnalysis.subCategoryName) {
        allSubNames.push(draft.aiAnalysis.subCategoryName);
      }

      // 6. Thành công
      const fullTicketData = {
        ...result,
        id: result?.id || result?.ticketId,
        categoryName:
          result?.categoryName ||
          currentCatName ||
          draft.aiAnalysis.categoryName,
        subCategories:
          result?.subCategories ||
          (allSubNames.length > 0
            ? allSubNames.map((name) => ({ name }))
            : []),
        address: result?.address || draft.address || '',
        imageUrl: result?.imageUrl || draft.imageUrls[0],
        priority: result?.priority || effectivePriority,
        severity: result?.priority || (result as any)?.severity || draft.aiAnalysis.severity || 'LOW',
        priorityReasoning: result?.priorityReasoning || draft.aiAnalysis.priorityReasoning,
        createdAt: result?.createdAt || new Date().toISOString(),
        locationMethod: draft.locationMethod || 'AUTO_GPS',
        description: requestBody.description,
      };

      if (onTicketCreated) {
        onTicketCreated(fullTicketData);
      } else {
        navigate('success');
      }
    } catch (error) {
      console.error('❌ CREATE TICKET ERROR:', error);

      Alert.alert(
        'Gửi báo cáo thất bại',
        error instanceof Error ? error.message : 'Đã xảy ra lỗi khi gửi báo cáo tới hệ thống. Vui lòng kiểm tra kết nối mạng và thử lại.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topAccentBar} />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Tạo báo cáo (Bước 4/4)</Text>
        <TouchableOpacity
          style={[styles.editToggleBtn, editing && styles.editToggleActive]}
          onPress={() => {
            setEditing(!editing);
            setShowCatPicker(false);
          }}
        >
          <Ionicons
            name={editing ? 'checkmark' : 'create-outline'}
            size={14}
            color={editing ? '#ffffff' : '#ea580c'}
          />
          <Text style={[styles.editToggleText, editing && { color: '#ffffff' }]}>
            {editing ? 'Xong' : 'Sửa'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Step Indicator Header */}
      <View style={styles.stepHeader}>
        <View style={styles.stepTrack}>
          <View style={[styles.stepFill, { width: '100%' }]} />
        </View>
        <View style={styles.stepTextRow}>
          <Text style={styles.stepBadgeText}>BƯỚC 04</Text>
          <Text style={styles.stepTitleText}>XEM TRƯỚC BÁO CÁO</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        <View style={styles.contentPadding}>
          {/* Section 1: Người báo cáo */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.orangeIndicator} />
              <Text style={styles.cardTitle}>NGƯỜI BÁO CÁO</Text>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.userRow}>
                <View style={styles.userAvatar}>
                  <Ionicons name="person" size={20} color="#f97316" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>
                    {authUser?.fullName || (authUser as any)?.name || 'Người dân'}
                  </Text>
                  <Text style={styles.userSub}>Tài khoản đã xác thực</Text>
                </View>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>ĐÃ XÁC THỰC</Text>
                </View>
              </View>

              <View style={styles.infoList}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Số điện thoại</Text>
                  <Text style={styles.infoValue}>
                    {authUser?.phone || (authUser as any)?.phoneNumber || '—'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>
                    {authUser?.email || '—'}
                  </Text>
                </View>
              </View>

              {/* Công tắc Báo cáo ẩn danh */}
              <View
                style={{
                  marginTop: 10,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: '#f1f5f9',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons
                      name={draft.isAnonymous ? 'eye-off' : 'eye-outline'}
                      size={16}
                      color={draft.isAnonymous ? '#ea580c' : '#64748b'}
                    />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>
                      Báo cáo ẩn danh
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#64748b', marginTop: 3, lineHeight: 16 }}>
                    {draft.isAnonymous
                      ? 'Đã bật: Ẩn thông tin của bạn với Nhân viên hiện trường & Cộng đồng (chỉ Quản lý xem được).'
                      : 'Tắt: Hiển thị tên và số điện thoại người phản ánh cho đơn vị xử lý.'}
                  </Text>
                </View>
                <Switch
                  value={Boolean(draft.isAnonymous)}
                  onValueChange={(val) => setDraft({ ...draft, isAnonymous: val })}
                  trackColor={{ false: '#cbd5e1', true: '#fdba74' }}
                  thumbColor={draft.isAnonymous ? '#ea580c' : '#f8fafc'}
                />
              </View>
            </View>
          </View>

          {/* Section 2: Ảnh / Video sự cố */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.orangeIndicator} />
              <Text style={styles.cardTitle}>
                TỆP ĐÍNH KÈM ({draft.imageUrls.length} TỆP)
              </Text>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.photoGrid}>
                {draft.imageUrls.map((url, idx) => {
                  const isVid = isVideoUrl(url);
                  const thumbUri = getMediaThumbnailUrl(url);
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.photoThumb,
                        isVid && { backgroundColor: '#0f172a' },
                      ]}
                    >
                      <Image
                        source={{ uri: thumbUri }}
                        style={styles.photoImg}
                        resizeMode="cover"
                      />
                      {isVid ? (
                        <View
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(15, 23, 42, 0.3)',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                          pointerEvents="none"
                        >
                          <Ionicons
                            name="play-circle"
                            size={24}
                            color="#ffffff"
                          />
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>

              {editing ? (
                <TouchableOpacity
                  style={styles.rePhotoBtn}
                  onPress={() => navigate('photo')}
                >
                  <Ionicons name="camera-outline" size={16} color="#ea580c" />
                  <Text style={styles.rePhotoText}>Chụp lại / Sửa ảnh</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Section 3: AI Proposing Info */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.orangeIndicator} />
              <Text style={styles.cardTitle}>THÔNG TIN AI ĐỀ XUẤT</Text>
            </View>
            <View style={styles.cardBody}>
              {isLowConfidence ? (
                <View
                  style={{
                    marginBottom: 10,
                    padding: 12,
                    backgroundColor: '#fffbeb',
                    borderWidth: 1,
                    borderColor: '#fcd34d',
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}
                >
                  <Ionicons name="warning" size={18} color="#d97706" style={{ marginTop: 1 }} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#92400e' }}>
                      Cần kiểm tra & chỉnh sửa thủ công ({Math.round(ai?.confidenceScore ?? 0)}% &lt; 70%)
                    </Text>
                    <Text style={{ fontSize: 11, color: '#b45309', lineHeight: 16 }}>
                      Độ tin cậy nhận diện AI dưới 70%. Hệ thống đã tự động bật chế độ chỉnh sửa để bạn rà soát lại danh mục con và mô tả sự cố trước khi gửi.
                    </Text>
                  </View>
                </View>
              ) : null}

              <Text style={styles.fieldLabel}>Loại sự cố</Text>
              <View style={styles.catStaticBox}>
                <Text style={styles.catStaticText}>{currentCatName}</Text>
              </View>

              {/* Chi tiết sự cố: hỗ trợ cả 1 hoặc nhiều subcategories */}
              {(() => {
                const subIds: string[] = [];
                if (Array.isArray(ai?.subCategoryIds) && ai.subCategoryIds.length > 0) {
                  subIds.push(...ai.subCategoryIds.filter(Boolean));
                } else if (ai?.subCategoryId) {
                  subIds.push(ai.subCategoryId);
                }

                const subNames: string[] = [];
                if (Array.isArray(ai?.subCategoryNames) && ai.subCategoryNames.length > 0) {
                  subNames.push(...ai.subCategoryNames.filter(Boolean));
                } else if (ai?.subCategoryName) {
                  subNames.push(ai.subCategoryName);
                }

                if (subNames.length === 0) return null;

                if (subNames.length === 1) {
                  return (
                    <View style={{ marginTop: 6, marginBottom: 4 }}>
                      <Text style={styles.metaLabel}>Chi tiết sự cố:</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#ea580c', marginTop: 2 }}>
                        {subNames[0]}
                      </Text>
                    </View>
                  );
                }

                const selectedIds =
                  Array.isArray(draft.userSubCategoryIds) && draft.userSubCategoryIds.length > 0
                    ? draft.userSubCategoryIds
                    : subIds;

                return (
                  <View style={{ marginTop: 8, marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={styles.metaLabel}>
                        Chi tiết sự cố (Chạm để chọn danh mục con phù hợp):
                      </Text>
                      <View style={{ backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#c2410c' }}>
                          {selectedIds.length}/{subNames.length} ĐÃ CHỌN
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                      {subNames.map((name, idx) => {
                        const subId = subIds[idx];
                        const isSelected = subId ? selectedIds.includes(subId) : true;
                        return (
                          <TouchableOpacity
                            key={subId || idx}
                            activeOpacity={0.75}
                            onPress={() => {
                              if (!subId) return;
                              let nextIds: string[];
                              if (isSelected) {
                                if (selectedIds.length <= 1) {
                                  Alert.alert('Lưu ý', 'Báo cáo cần giữ lại ít nhất 1 danh mục con sự cố.');
                                  return;
                                }
                                nextIds = selectedIds.filter((id) => id !== subId);
                              } else {
                                nextIds = [...selectedIds, subId];
                              }
                              const nextNames = subNames.filter((_, i) =>
                                subIds[i] ? nextIds.includes(subIds[i]) : true
                              );
                              setDraft({
                                ...draft,
                                userSubCategoryId: nextIds[0],
                                userSubCategoryIds: nextIds,
                                userSubCategoryNames: nextNames,
                              });
                            }}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 5,
                              backgroundColor: isSelected ? '#fff7ed' : '#f8fafc',
                              borderWidth: 1.5,
                              borderColor: isSelected ? '#f97316' : '#cbd5e1',
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: 8,
                            }}
                          >
                            <Ionicons
                              name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                              size={14}
                              color={isSelected ? '#ea580c' : '#94a3b8'}
                            />
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '700',
                                color: isSelected ? '#c2410c' : '#64748b',
                              }}
                            >
                              {name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })()}

              <View style={styles.aiMetaRow}>
                <View style={styles.aiMetaItem}>
                  <Text style={styles.metaLabel}>Ưu tiên:</Text>
                  {(() => {
                    const prio = (ai?.priority || ai?.severity || 'LOW').toUpperCase();
                    const prioMap: Record<string, { label: string; color: string }> = {
                      LOW: { label: 'Thấp', color: '#16a34a' },
                      MEDIUM: { label: 'Trung bình', color: '#2563eb' },
                      HIGH: { label: 'Cao', color: '#dc2626' },
                      CRITICAL: { label: 'Khẩn cấp', color: '#be185d' },
                    };
                    const item = prioMap[prio] || { label: prio || 'Trung bình', color: '#2563eb' };
                    return (
                      <Text style={[styles.metaValue, { color: item.color }]}>
                        {item.label}
                      </Text>
                    );
                  })()}
                </View>
                <View style={styles.aiMetaItem}>
                  <Text style={styles.metaLabel}>Tin cậy:</Text>
                  <Text style={[styles.metaValue, { color: '#ea580c' }]}>
                    {Math.round(ai?.confidenceScore ?? 87)}%
                  </Text>
                </View>
              </View>

              {ai?.priorityReasoning ? (
                <View style={{ marginTop: 8, padding: 8, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
                  <Text style={[styles.metaLabel, { color: '#64748b' }]}>Lý do đánh giá ưu tiên:</Text>
                  <Text style={{ fontSize: 12, color: '#334155', marginTop: 2, lineHeight: 17 }}>
                    {ai.priorityReasoning}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Section 4: Địa điểm sự cố */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.orangeIndicator} />
              <Text style={styles.cardTitle}>ĐỊA ĐIỂM SỰ CỐ</Text>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.addressDisplayRow}>
                <Ionicons name="location" size={18} color="#f97316" />
                <Text style={styles.addressDisplayText}>
                  {draft.address || 'Chưa chọn vị trí'}
                </Text>
              </View>

              {editing ? (
                <TouchableOpacity
                  style={styles.reLocationBtn}
                  onPress={() => navigate('location')}
                >
                  <Ionicons name="navigate-outline" size={16} color="#ea580c" />
                  <Text style={styles.reLocationText}>Chỉnh lại vị trí</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Section 5: Mô tả sự cố */}
          <View style={styles.card}>
            <View style={[styles.cardHeader, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.orangeIndicator} />
                <Text style={styles.cardTitle}>MÔ TẢ SỰ CỐ</Text>
              </View>
              <View style={styles.editBadge}>
                <Ionicons name="pencil" size={11} color="#ea580c" />
                <Text style={styles.editBadgeText}>Có thể chỉnh sửa</Text>
              </View>
            </View>
            <View style={styles.cardBody}>
              <TextInput
                style={styles.descInput}
                multiline
                numberOfLines={4}
                value={
                  draft.userDescription !== undefined && draft.userDescription !== ''
                    ? draft.userDescription
                    : (ai?.description || '')
                }
                onChangeText={(text) =>
                  setDraft({ ...draft, userDescription: text })
                }
                placeholder="Nhập hoặc chỉnh sửa chi tiết sự cố..."
                placeholderTextColor="#94a3b8"
              />
              <Text style={styles.descHintText}>
                Mô tả được AI gợi ý từ hình ảnh. Bạn có thể nhấn trực tiếp vào ô trên để chỉnh sửa hoặc bổ sung thêm thông tin.
              </Text>
            </View>
          </View>

          {/* Disclaimer Box */}
          <View style={styles.disclaimerCard}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#64748b" />
            <Text style={styles.disclaimerText}>
              Bằng cách gửi báo cáo, bạn xác nhận thông tin cung cấp là trung thực và chính xác.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer CTA Submit */}
      <View style={styles.footerContainer}>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          disabled={submitting}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          {submitting ? (
            <View style={styles.btnContent}>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.submitBtnText}>ĐANG KIỂM TRA TRÙNG LẶP...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.submitBtnText}>XÁC NHẬN & GỬI BÁO CÁO</Text>
              <Ionicons name="paper-plane" size={18} color="#ffffff" />
            </>
          )}
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
  editToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  editToggleActive: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  editToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ea580c',
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
    gap: 14,
  },

  /* Card */
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
    gap: 12,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  userSub: {
    fontSize: 11,
    color: '#64748b',
  },
  verifiedBadge: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#16a34a',
  },
  infoList: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  photoGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  photoThumb: {
    width: 70,
    height: 70,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  rePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  rePhotoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ea580c',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  catStaticBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  catStaticText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  catPickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#ea580c',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  catPickerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ea580c',
  },
  catDropdownList: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  catDropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  catDropdownItemText: {
    fontSize: 13,
    color: '#0f172a',
  },
  aiMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  aiMetaItem: {
    flexDirection: 'row',
    gap: 4,
  },
  metaLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  metaValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  addressDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressDisplayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
  },
  reLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  reLocationText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ea580c',
  },
  descStaticText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  descInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#0f172a',
    textAlignVertical: 'top',
    minHeight: 85,
    lineHeight: 19,
  },
  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  editBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ea580c',
  },
  descHintText: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
    marginTop: 4,
  },
  disclaimerCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#64748b',
    flex: 1,
    lineHeight: 16,
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
  submitBtn: {
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
  submitBtnDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
