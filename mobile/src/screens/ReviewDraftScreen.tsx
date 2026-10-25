import React, { useState, useEffect } from 'react';
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
import { ReportDraft, CATEGORIES } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createTicket, checkDuplicates, DuplicateTicketItem } from '../api';
import { AuthUser } from './LoginScreen';

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

  useEffect(() => {
    if (!draft.userDescription && ai?.description) {
      setDraft({ ...draft, userDescription: ai.description });
    }
  }, [ai?.description]);
  const currentCatId = draft.userCategoryId || (ai?.categoryId ?? 'cat-001');
  const matchedCat = CATEGORIES.find((c) => c.categoryId === currentCatId);
  const currentCatName =
    matchedCat?.name ||
    ai?.categoryName ||
    ai?.categoryId ||
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

      const effectiveCatId =
        draft.userCategoryId || draft.aiAnalysis.categoryId || '';

      // 3. Gọi API check-duplicates trước khi tạo
      try {
        if (effectiveCatId) {
          console.log('🔍 Checking duplicates before submit...');
          const dupes = await checkDuplicates(
            {
              categoryId: effectiveCatId,
              latitude: draft.location.lat,
              longitude: draft.location.lng,
              location: draft.address,
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
        }
      } catch (dupErr) {
        console.warn('Check duplicates API warning:', dupErr);
      }

      // 4. Build request body theo đúng Swagger
      const effectiveSubCatId =
        draft.userSubCategoryId ||
        draft.aiAnalysis.subCategoryId ||
        (draft.aiAnalysis as any)?.subCategoryIds?.[0] ||
        '';

      if (!effectiveSubCatId) {
        throw new Error('Chưa có danh mục con (subCategory). Vui lòng thử phân tích lại ảnh.');
      }

      const effectivePriority =
        draft.aiAnalysis.priority ||
        (draft.aiAnalysis.severity === 'CRITICAL' ? 'HIGH' : draft.aiAnalysis.severity) ||
        'LOW';

      const finalCategoryId = effectiveCatId || effectiveSubCatId;

      const requestBody = {
        description:
          draft.userDescription ||
          draft.aiAnalysis.description ||
          '',
        imageUrl: draft.imageUrls[0],
        categoryId: finalCategoryId,
        subCategoryIds: effectiveSubCatId ? [effectiveSubCatId] : [],
        severity: (draft.aiAnalysis.severity || effectivePriority || 'LOW').toUpperCase(),
        dangerLevel: (draft.aiAnalysis.dangerLevel || 'CAUTION').toUpperCase(),
        priority: effectivePriority.toUpperCase(),
        priorityReasoning: draft.aiAnalysis.priorityReasoning || '',
        locationMethod: draft.locationMethod || 'AUTO_GPS',
        address: draft.address || '',
        latitude: draft.location.lat,
        longitude: draft.location.lng,
        confidenceScore: draft.aiAnalysis.confidenceScore || 0,
        isAnonymous: draft.isAnonymous ?? false,
      };

      console.log('🎫 CREATE TICKET BODY:', JSON.stringify(requestBody, null, 2));

      // 5. Gọi API Backend
      const result = await createTicket(requestBody, accessToken);

      console.log('✅ TICKET CREATED:', result);

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
          (draft.aiAnalysis.subCategoryName
            ? [{ name: draft.aiAnalysis.subCategoryName }]
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

      alert(
        error instanceof Error
          ? error.message
          : 'Không thể gửi báo cáo. Vui lòng thử lại.'
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
            </View>
          </View>

          {/* Section 2: Ảnh sự cố */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.orangeIndicator} />
              <Text style={styles.cardTitle}>
                ẢNH SỰ CỐ ({draft.imageUrls.length} ẢNH)
              </Text>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.photoGrid}>
                {draft.imageUrls.map((url, idx) => (
                  <View key={idx} style={styles.photoThumb}>
                    <Image source={{ uri: url }} style={styles.photoImg} />
                  </View>
                ))}
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
              <Text style={styles.fieldLabel}>Loại sự cố</Text>
              {editing ? (
                <View>
                  <TouchableOpacity
                    style={styles.catPickerBtn}
                    onPress={() => setShowCatPicker(!showCatPicker)}
                  >
                    <Text style={styles.catPickerText}>{currentCatName}</Text>
                    <Ionicons name="chevron-down" size={16} color="#f97316" />
                  </TouchableOpacity>

                  {showCatPicker ? (
                    <View style={styles.catDropdownList}>
                      {CATEGORIES.map((c) => (
                        <TouchableOpacity
                          key={c.categoryId}
                          style={styles.catDropdownItem}
                          onPress={() => {
                            setDraft({ ...draft, userCategoryId: c.categoryId });
                            setShowCatPicker(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.catDropdownItemText,
                              c.categoryId === currentCatId && { color: '#ea580c' },
                            ]}
                          >
                            {c.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={styles.catStaticBox}>
                  <Text style={styles.catStaticText}>{currentCatName}</Text>
                </View>
              )}

              {ai?.subCategoryName ? (
                <View style={{ marginTop: 6, marginBottom: 4 }}>
                  <Text style={styles.metaLabel}>Chi tiết sự cố:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#ea580c', marginTop: 2 }}>
                    {ai.subCategoryName}
                  </Text>
                </View>
              ) : null}

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
                💡 Mô tả được AI gợi ý từ hình ảnh. Bạn có thể nhấn trực tiếp vào ô trên để chỉnh sửa hoặc bổ sung thêm thông tin.
              </Text>
            </View>
          </View>

          {/* Disclaimer Box */}
          <View style={styles.disclaimerCard}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#64748b" />
            <Text style={styles.disclaimerText}>
              Bằng cách gửi báo cáo, bạn xác nhận thông tin cung cấp là trung thực. Hệ thống
              sẽ kiểm tra trùng lặp vị trí bằng PostGIS trước khi lưu vé.
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
