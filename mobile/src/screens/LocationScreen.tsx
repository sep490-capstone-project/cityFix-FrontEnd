import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Modal,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ReportDraft } from '../types';

type Mode = 'idle' | 'gps-loading' | 'gps-done' | 'manual-input' | 'manual-done';

interface Props {
  navigate: (s: string) => void;
  goBack: () => void;
  draft: ReportDraft;
  setDraft: (d: ReportDraft) => void;
}

const GPS_ADDRESS = '123 Nguyễn Văn Cừ, Phường 2, Quận 5, TP.HCM';

export default function LocationScreen({ navigate, goBack, draft, setDraft }: Props) {
  const [mode, setMode] = useState<Mode>(
    draft.locationMethod === 'AUTO_GPS'
      ? 'gps-done'
      : draft.locationMethod === 'MANUAL_ENTRY'
      ? 'manual-done'
      : 'idle'
  );
  const [locationConfirmed, setLocationConfirmed] = useState(draft.location !== null);
  const [manualText, setManualText] = useState(draft.address || '');
  const [manualError, setManualError] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  const hasLocation = mode === 'gps-done' || mode === 'manual-done';
  const canProceed = draft.location !== null;

  const handleUseGPS = () => {
    if (mode === 'gps-done') return;
    setLocationConfirmed(false);
    setMode('gps-loading');
    setTimeout(() => {
      setDraft({
        ...draft,
        location: { lat: 10.7769, lng: 106.7009 },
        address: GPS_ADDRESS,
        locationMethod: 'AUTO_GPS',
      });
      setMode('gps-done');
    }, 1800);
  };

  const handleOpenManual = () => {
    setLocationConfirmed(false);
    setManualText('');
    setManualError(false);
    setShowManualModal(true);
  };

  const handleConfirmManual = () => {
    const trimmed = manualText.trim();
    if (!trimmed) {
      setManualError(true);
      return;
    }
    setDraft({
      ...draft,
      location: { lat: 10.7751, lng: 106.6989 },
      address: trimmed,
      locationMethod: 'MANUAL_ENTRY',
    });
    setMode('manual-done');
    setShowManualModal(false);
  };

  const handleConfirmLocation = () => {
    setLocationConfirmed(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.topAccentBar} />

      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Tạo báo cáo (Bước 1/4)</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Step Indicator Header */}
      <View style={styles.stepHeader}>
        <View style={styles.stepTrack}>
          <View style={[styles.stepFill, { width: '25%' }]} />
        </View>
        <View style={styles.stepTextRow}>
          <Text style={styles.stepBadgeText}>BƯỚC 01</Text>
          <Text style={styles.stepTitleText}>VỊ TRÍ SỰ CỐ</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        <View style={styles.contentPadding}>
          {/* Map Preview Box */}
          <View style={styles.mapContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&h=600&fit=crop&auto=format' }}
              style={styles.mapImage}
            />
            <View style={styles.mapOverlay} />

            {/* Pin Indicator */}
            {hasLocation ? (
              <View style={styles.pinWrapper}>
                <View style={styles.pinOuter}>
                  <Ionicons name="location" size={32} color="#f97316" />
                </View>
              </View>
            ) : (
              <View style={styles.crosshairWrapper}>
                <Ionicons name="scan-outline" size={36} color="rgba(249, 115, 22, 0.6)" />
                <Text style={styles.crosshairText}>CHƯA CÓ VỊ TRÍ</Text>
              </View>
            )}

            {/* GPS Loading Indicator */}
            {mode === 'gps-loading' ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#f97316" />
                <Text style={styles.loadingText}>ĐANG ĐỊNH VỊ GPS...</Text>
              </View>
            ) : null}

            {/* Method Badge Tag */}
            {hasLocation ? (
              <View style={styles.methodBadge}>
                <Text style={styles.methodBadgeText}>
                  {mode === 'gps-done' ? 'GPS TỰ ĐỘNG' : 'NHẬP THỦ CÔNG'}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Address Strip */}
          {hasLocation ? (
            <View style={styles.addressBox}>
              <Ionicons name="location" size={18} color="#f97316" style={{ marginTop: 2 }} />
              <Text style={styles.addressText}>{draft.address}</Text>
              <TouchableOpacity
                style={styles.reselectBtn}
                onPress={() => {
                  setMode('idle');
                  setLocationConfirmed(false);
                  setDraft({ ...draft, location: null, address: '', locationMethod: null });
                }}
              >
                <Text style={styles.reselectText}>Chọn lại</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Action Buttons */}
          <View style={styles.actionsBox}>
            {/* GPS Action Button */}
            <TouchableOpacity
              style={[styles.gpsBtn, mode === 'gps-done' && styles.btnDisabled]}
              onPress={handleUseGPS}
              disabled={mode === 'gps-loading' || mode === 'gps-done'}
              activeOpacity={0.85}
            >
              <Ionicons name="navigate-outline" size={18} color="#ffffff" />
              <Text style={styles.gpsBtnText}>
                {mode === 'gps-loading'
                  ? 'ĐANG ĐỊNH VỊ...'
                  : mode === 'gps-done'
                  ? 'ĐÃ DÙNG VỊ TRÍ HIỆN TẠI'
                  : 'DÙNG VỊ TRÍ HIỆN TẠI'}
              </Text>
            </TouchableOpacity>

            {/* Manual Entry Action Button */}
            <TouchableOpacity
              style={[styles.manualBtn, mode === 'manual-done' && styles.btnDisabled]}
              onPress={handleOpenManual}
              disabled={mode === 'manual-done'}
              activeOpacity={0.85}
            >
              <Ionicons name="create-outline" size={18} color="#0f172a" />
              <Text style={styles.manualBtnText}>
                {mode === 'manual-done'
                  ? 'ĐÃ NHẬP VỊ TRÍ THỦ CÔNG'
                  : 'NHẬP VỊ TRÍ THỦ CÔNG'}
              </Text>
            </TouchableOpacity>

            {/* Confirm Location Secondary */}
            {hasLocation && !locationConfirmed ? (
              <TouchableOpacity
                style={styles.confirmLocationBtn}
                onPress={handleConfirmLocation}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#ea580c" />
                <Text style={styles.confirmLocationText}>XÁC NHẬN VỊ TRÍ NÀY</Text>
              </TouchableOpacity>
            ) : null}

            {locationConfirmed ? (
              <View style={styles.confirmedRow}>
                <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                <Text style={styles.confirmedText}>VỊ TRÍ ĐÃ ĐƯỢC XÁC NHẬN</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {/* Manual Input Modal Sheet */}
      <Modal
        visible={showManualModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowManualModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="location-outline" size={20} color="#f97316" />
              <Text style={styles.modalTitle}>Nhập địa chỉ thủ công</Text>
            </View>

            <TextInput
              style={[styles.modalInput, manualError && styles.modalInputError]}
              placeholder="Số nhà, tên đường, phường, quận..."
              placeholderTextColor="#9ca3af"
              value={manualText}
              onChangeText={(t) => {
                setManualText(t);
                setManualError(false);
              }}
              autoFocus
            />

            {manualError ? (
              <Text style={styles.errorHintText}>
                Vui lòng nhập địa chỉ trước khi xác nhận.
              </Text>
            ) : null}

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowManualModal(false)}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleConfirmManual}
              >
                <Text style={styles.modalSubmitText}>Xác nhận địa chỉ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom CTA Next */}
      <View style={styles.footerContainer}>
        <TouchableOpacity
          style={[styles.nextBtn, !canProceed && styles.nextBtnDisabled]}
          disabled={!canProceed}
          onPress={() => navigate('photo')}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>TIẾP THEO — ĐÍNH KÈM ẢNH</Text>
          <Ionicons name="arrow-forward" size={18} color="#ffffff" />
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
    gap: 14,
  },

  /* Map Box */
  mapContainer: {
    height: 220,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.15)',
  },
  pinWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinOuter: {
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  crosshairWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  crosshairText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1.5,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
    letterSpacing: 1,
  },
  methodBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  methodBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ea580c',
  },

  /* Address Box */
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  addressText: {
    fontSize: 13,
    color: '#0f172a',
    flex: 1,
    fontWeight: '600',
  },
  reselectBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reselectText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ea580c',
  },

  /* Actions Box */
  actionsBox: {
    gap: 10,
  },
  gpsBtn: {
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
    elevation: 4,
  },
  gpsBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  manualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  manualBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  btnDisabled: {
    backgroundColor: '#cbd5e1',
    borderColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
    borderRadius: 14,
    paddingVertical: 12,
    gap: 6,
  },
  confirmLocationText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ea580c',
  },
  confirmedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  confirmedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16a34a',
    letterSpacing: 1,
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
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  modalInputError: {
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  errorHintText: {
    fontSize: 11,
    color: '#dc2626',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  modalSubmitBtn: {
    flex: 2,
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSubmitText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});
