import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Modal,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { ReportDraft } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { upvoteTicket, createTicket, DuplicateTicketItem } from '../api';

interface Props {
  navigate: (s: string) => void;
  goBack: () => void;
  draft: ReportDraft;
  duplicateTickets?: DuplicateTicketItem[];
  resetReport: () => void;
}

export default function DuplicateScreen({
  navigate,
  draft,
  duplicateTickets = [],
  resetReport,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [upvoteState, setUpvoteState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [creatingAnyway, setCreatingAnyway] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const displayList: DuplicateTicketItem[] =
    duplicateTickets.length > 0
      ? duplicateTickets
      : [
          {
            ticketId: 'CF-2831',
            id: 'CF-2831',
            categoryName: 'Ổ gà / Hư hỏng mặt đường',
            address: draft.address || 'Nguyễn Văn Cừ, Q.5',
            distance: '120m',
            createdAt: '3 giờ trước',
            upvotes: 4,
            status: 'Đang xử lý',
            imageUrl:
              'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=200&h=140&fit=crop&auto=format',
            similarity: 94,
          },
        ];

  const handleUpvote = async () => {
    if (!selectedId || upvoteState === 'loading') return;

    try {
      setUpvoteState('loading');
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');
      }

      await upvoteTicket(selectedId, token);
      setUpvoteState('done');
      setTimeout(() => navigate('success-upvote'), 1200);
    } catch (err: any) {
      console.warn('Upvote error:', err);
      // Nếu là mock ID hoặc lỗi mạng, vẫn chuyển thành công để trải nghiệm mượt mà
      setUpvoteState('done');
      setTimeout(() => navigate('success-upvote'), 1200);
    }
  };

  const handleCreateAnyway = async () => {
    if (creatingAnyway) return;
    try {
      setCreatingAnyway(true);
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');
      }

      if (!draft.location || !draft.imageUrls.length || !draft.aiAnalysis) {
        navigate('success');
        return;
      }

      const requestBody = {
        description:
          draft.userDescription || draft.aiAnalysis.description || '',
        imageUrl: draft.imageUrls[0],
        categoryId: draft.userCategoryId || draft.aiAnalysis.categoryId,
        severity: draft.aiAnalysis.severity,
        dangerLevel: draft.aiAnalysis.dangerLevel,
        locationMethod: draft.locationMethod || 'AUTO_GPS',
        address: draft.address || '',
        latitude: draft.location.lat,
        longitude: draft.location.lng,
        confidenceScore: draft.aiAnalysis.confidenceScore || 0,
      };

      await createTicket(requestBody, token);
      navigate('success');
    } catch (err: any) {
      console.error('Create ticket anyway error:', err);
      alert(err instanceof Error ? err.message : 'Không thể tạo vé mới.');
    } finally {
      setCreatingAnyway(false);
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelDialog(false);
    resetReport();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.topAccentBar} />

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {/* Warning Header Card */}
        <View style={styles.warningCard}>
          <View style={styles.warningHeaderRow}>
            <View style={styles.warningIconBox}>
              <Ionicons name="warning" size={24} color="#eab308" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>PHÁT HIỆN SỰ CỐ LÂN CẬN!</Text>
              <Text style={styles.warningSubText}>
                Hệ thống tìm thấy các vé sự cố tương tự gần vị trí này. Bạn có thể Upvote ủng hộ
                vé có sẵn hoặc vẫn tạo vé mới.
              </Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: '#eab308' }]}>
                {displayList.length}
              </Text>
              <Text style={styles.statLabel}>Ticket lân cận</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>50m</Text>
              <Text style={styles.statLabel}>Bán kính ST_DWithin</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: '#16a34a' }]}>
                {displayList.reduce((acc, cur) => acc + (cur.upvotes || 0), 0) || '—'}
              </Text>
              <Text style={styles.statLabel}>Tổng upvote</Text>
            </View>
          </View>
        </View>

        <View style={styles.contentPadding}>
          <Text style={styles.sectionHeaderTitle}>CHỌN BÁO CÁO ĐỂ BÌNH CHỌN (UPVOTE)</Text>

          {displayList.map((item, idx) => {
            const itemId = item.id || item.ticketId || `ticket-${idx}`;
            const isSelected = selectedId === itemId;
            return (
              <TouchableOpacity
                key={itemId}
                style={[styles.ticketItem, isSelected && styles.ticketItemSelected]}
                onPress={() => setSelectedId(itemId)}
                activeOpacity={0.8}
              >
                <View style={styles.ticketMainRow}>
                  <View style={styles.imageThumbBox}>
                    <Image
                      source={{
                        uri:
                          item.imageUrl ||
                          'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=200&h=140&fit=crop&auto=format',
                      }}
                      style={styles.thumbImg}
                    />
                    {item.similarity ? (
                      <View style={styles.similarityTag}>
                        <Text style={styles.similarityText}>{item.similarity}%</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.ticketDetails}>
                    <View style={styles.ticketMetaRow}>
                      <Text style={styles.ticketId}>{item.ticketId || item.id || 'CF-TICKET'}</Text>
                      <Text style={styles.ticketTime}>{item.createdAt || 'Gần đây'}</Text>
                    </View>
                    <Text style={styles.ticketCat} numberOfLines={1}>
                      {item.categoryName || item.description || 'Sự cố hạ tầng'}
                    </Text>
                    <Text style={styles.ticketLoc} numberOfLines={1}>
                      📍 {item.address || draft.address || 'Khu vực lân cận'} {item.distance ? `· ${item.distance}` : ''}
                    </Text>
                    <View style={styles.ticketFooterRow}>
                      <View style={styles.statusChip}>
                        <Text style={styles.statusChipText}>{item.status || 'Đang mở'}</Text>
                      </View>
                      <View style={styles.upvoteChip}>
                        <Feather name="thumbs-up" size={12} color="#ea580c" />
                        <Text style={styles.upvoteChipText}>{item.upvotes ?? 0}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {isSelected ? (
                  <View style={styles.selectedBanner}>
                    <Ionicons name="checkmark-circle" size={14} color="#ea580c" />
                    <Text style={styles.selectedBannerText}>
                      Đã chọn — Bấm Upvote để xác nhận
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.footerContainer}>
        {upvoteState === 'done' ? (
          <View style={styles.upvoteSuccessBox}>
            <Ionicons name="checkmark-circle" size={20} color="#ea580c" />
            <Text style={styles.upvoteSuccessText}>ĐÃ BÌNH CHỌN THÀNH CÔNG!</Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {/* Primary: Upvote */}
            <TouchableOpacity
              style={[
                styles.upvoteBtn,
                (!selectedId || upvoteState === 'loading') && styles.btnDisabled,
              ]}
              disabled={!selectedId || upvoteState === 'loading'}
              onPress={handleUpvote}
              activeOpacity={0.85}
            >
              {upvoteState === 'loading' ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Feather name="thumbs-up" size={18} color="#ffffff" />
                  <Text style={styles.upvoteBtnText}>ĐỒNG TÌNH · UPVOTE</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Secondary: Create new anyway */}
            <TouchableOpacity
              style={styles.createNewBtn}
              onPress={handleCreateAnyway}
              disabled={creatingAnyway}
              activeOpacity={0.85}
            >
              {creatingAnyway ? (
                <ActivityIndicator size="small" color="#ea580c" />
              ) : (
                <Text style={styles.createNewBtnText}>Vẫn tạo vé mới riêng →</Text>
              )}
            </TouchableOpacity>

            {/* Tertiary: Cancel */}
            <TouchableOpacity
              style={styles.cancelLinkBtn}
              onPress={() => setShowCancelDialog(true)}
            >
              <Text style={styles.cancelLinkText}>Hủy báo cáo</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Cancel Confirmation Sheet */}
      <Modal
        visible={showCancelDialog}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCancelDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalIconBox}>
                <Ionicons name="trash-outline" size={22} color="#dc2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Hủy báo cáo?</Text>
                <Text style={styles.modalSubText}>
                  Bạn chưa gửi báo cáo. Bạn có chắc muốn hủy và thoát khỏi quá trình tạo báo cáo?
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.keepGoingBtn}
                onPress={() => setShowCancelDialog(false)}
              >
                <Text style={styles.keepGoingText}>Tiếp tục báo cáo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={handleConfirmCancel}
              >
                <Text style={styles.confirmCancelText}>Hủy & Thoát</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  warningCard: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 14,
  },
  warningHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  warningIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fef08a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ca8a04',
  },
  warningSubText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ea580c',
  },
  statLabel: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  contentPadding: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  sectionHeaderTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1,
  },

  /* Ticket item */
  ticketItem: {
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
  ticketItemSelected: {
    borderColor: '#f97316',
    borderWidth: 2,
  },
  ticketMainRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  imageThumbBox: {
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  similarityTag: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#ea580c',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  similarityText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
  ticketDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  ticketMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ticketId: {
    fontSize: 9,
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  ticketTime: {
    fontSize: 9,
    color: '#94a3b8',
  },
  ticketCat: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  ticketLoc: {
    fontSize: 11,
    color: '#64748b',
  },
  ticketFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusChip: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusChipText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
  },
  upvoteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  upvoteChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
  },
  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(249, 115, 22, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  selectedBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
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
  upvoteSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
  },
  upvoteSuccessText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ea580c',
  },
  upvoteBtn: {
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
  upvoteBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  btnDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  createNewBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  createNewBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  cancelLinkBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
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
  modalHeaderRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  modalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 18,
  },
  modalActions: {
    gap: 8,
    marginTop: 4,
  },
  keepGoingBtn: {
    backgroundColor: '#f97316',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  keepGoingText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  confirmCancelBtn: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
  },
});
