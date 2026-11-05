import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Modal,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { AuthUser } from '../LoginScreen';
import {
  getMyReportedTickets,
  ReportedTicket,
  mapBackendStatus,
  updateProfile,
  getProfile,
  ApiError,
} from '../../api';

interface Props {
  navigate: (screen: string) => void;
  authUser: AuthUser | null;
  onLogout: () => void;
  onUpdateUser: (updated: AuthUser) => void;
  openTicket?: (id: string, ticketObj?: ReportedTicket) => void;
}


export default function ProfileScreen({
  navigate,
  authUser,
  onLogout,
  onUpdateUser,
  openTicket,
}: Props) {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editFullName, setEditFullName] = useState(authUser?.fullName ?? '');
  const [editPhone, setEditPhone] = useState(authUser?.phone ?? '');
  const [editEmail, setEditEmail] = useState(authUser?.email ?? '');
  const [editWard, setEditWard] = useState(authUser?.ward ?? '');
  const [editAddress, setEditAddress] = useState(authUser?.address ?? '');
  const [editProvince, setEditProvince] = useState(authUser?.province ?? '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [realTickets, setRealTickets] = useState<ReportedTicket[]>([]);
  const [totalReportsCount, setTotalReportsCount] = useState<number>(0);

  useEffect(() => {
    getProfile()
      .then((profile) => {
        if (profile && authUser) {
          onUpdateUser({
            ...authUser,
            fullName: profile.fullName || authUser.fullName,
            phone: profile.phoneNumber || authUser.phone,
            address: profile.address ?? authUser.address,
            province: profile.province ?? authUser.province,
            ward: profile.ward ?? authUser.ward,
          });
        }
      })
      .catch((e) => console.log('Profile fetch note:', e?.message));

    getMyReportedTickets(null, 0, 10)
      .then((res) => {
        if (res && Array.isArray(res.content)) {
          setRealTickets(res.content);
          setTotalReportsCount(res.totalElements ?? res.content.length);
        }
      })
      .catch((e) => console.log('Profile tickets fetch note:', e?.message));
  }, []);

  const initials = (authUser?.fullName?.trim() || '?')
    .split(/\s+/)
    .map((w: string) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase();

  const totalTickets = totalReportsCount || realTickets.length;
  const processingCount = realTickets.filter(
    (t) => mapBackendStatus(t.status).statusKey === 'processing'
  ).length;
  const doneCount = realTickets.filter(
    (t) => mapBackendStatus(t.status).statusKey === 'done'
  ).length;

  const stats = [
    { value: String(totalTickets), label: 'Báo cáo đã gửi' },
    { value: String(processingCount), label: 'Đang xử lý' },
    { value: String(doneCount), label: 'Hoàn thành' },
  ];

  function startEdit() {
    setEditPhone(authUser?.phone ?? '');
    setEditFullName(authUser?.fullName ?? '');
    setEditEmail(authUser?.email ?? '');
    setEditWard(authUser?.ward ?? '');
    setEditAddress(authUser?.address ?? '');
    setEditProvince(authUser?.province ?? '');
    setEditMode(true);
    setSaveSuccess(false);
  }

  async function saveEdit() {
    if (!authUser || saving) return;

    const trimmedFullName = editFullName.trim();
    if (!trimmedFullName) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ và tên.');
      return;
  
    }

    const cleanPhone = (editPhone || authUser.phone || '').replace(/[\s-]/g, '');
    const phoneRegex = /^\d{10,11}$/;
    if (!phoneRegex.test(cleanPhone)) {
      Alert.alert(
        'Số điện thoại không hợp lệ',
        'Vui lòng nhập số điện thoại gồm 10 đến 11 chữ số.'
      );
      return;
    }


    setSaving(true);
    try {
      const updatedProfile = await updateProfile({
        fullName: trimmedFullName,
        phoneNumber: cleanPhone,
        address: editAddress.trim(),
        province: editProvince.trim(),
        ward: editWard.trim(),
      });

      const updatedUser: AuthUser = {
        ...authUser,
        fullName: updatedProfile.fullName || trimmedFullName,
        phone: updatedProfile.phoneNumber || cleanPhone,
        address: updatedProfile.address ?? editAddress.trim(),
        province: updatedProfile.province ?? editProvince.trim(),
        ward: updatedProfile.ward ?? editWard.trim(),
      };

      onUpdateUser(updatedUser);
      setEditMode(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err?.message || 'Không thể cập nhật thông tin. Vui lòng thử lại.';
      Alert.alert('Cập nhật thất bại', msg);
    } finally {
      setSaving(false);
    }
  }



  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topAccentBar} />

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {/* Profile Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroMain}>
            <View style={styles.avatarBox}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>

            <View style={styles.heroInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {authUser?.fullName ?? 'Chưa cập nhật'}
              </Text>
              <Text style={styles.userPhone}>{authUser?.phone || '—'}</Text>
              <Text style={styles.userWard}>
                {[authUser?.ward, authUser?.province].filter(Boolean).join(', ') || '—'}
              </Text>
            </View>
          </View>

          {/* Stats Bar */}
          <View style={styles.statsGrid}>
            {stats.map((s, idx) => (
              <View key={idx} style={styles.statBox}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.contentPadding}>
          {/* Account Info Section */}
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderTitle}>THÔNG TIN TÀI KHOẢN</Text>
              {!editMode ? (
                <TouchableOpacity onPress={startEdit} style={styles.editBtn}>
                  <Feather name="edit-2" size={12} color="#ea580c" />
                  <Text style={styles.editBtnText}>Chỉnh sửa</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.editActionRow}>
                  <TouchableOpacity
                    onPress={() => setEditMode(false)}
                    disabled={saving}
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelBtnText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={saveEdit}
                    style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.saveBtnText}>Lưu</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {saveSuccess ? (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                <Text style={styles.successText}>Cập nhật thành công!</Text>
              </View>
            ) : null}

            <View style={styles.infoList}>
              {/* Full Name */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Họ và tên</Text>
                {editMode ? (
                  <TextInput
                    style={styles.infoInput}
                    value={editFullName}
                    onChangeText={setEditFullName}
                  />
                ) : (
                  <Text style={styles.infoValue}>{authUser?.fullName ?? '—'}</Text>
                )}
              </View>

              {/* Email (Read-only) */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                {editMode ? (
                  <View style={styles.disabledInputWrapper}>
                    <Text style={styles.disabledInputText}>{authUser?.email || '—'}</Text>
                    <View style={styles.readOnlyBadge}>
                      <Text style={styles.readOnlyBadgeText}>Cố định</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.infoValue}>{authUser?.email || '—'}</Text>
                )}
              </View>

              {/* Phone (Editable) */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>SĐT</Text>
                {editMode ? (
                  <TextInput
                    style={styles.infoInput}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    keyboardType="phone-pad"
                    placeholder="0912345678"
                  />
                ) : (
                  <Text style={styles.infoValue}>
                    {authUser?.phone || '—'}
                  </Text>
                )}
              </View>

              {/* Ward / Area */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phường/Xã</Text>
                {editMode ? (
                  <TextInput
                    style={styles.infoInput}
                    value={editWard}
                    onChangeText={setEditWard}
                    placeholder="Phường / Xã"
                  />
                ) : (
                  <Text style={styles.infoValue}>{authUser?.ward || '—'}</Text>
                )}
              </View>

              {/* Address */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Địa chỉ</Text>
                {editMode ? (
                  <TextInput
                    style={styles.infoInput}
                    value={editAddress}
                    onChangeText={setEditAddress}
                    placeholder="Số nhà, đường"
                  />
                ) : (
                  <Text style={styles.infoValue}>{authUser?.address || '—'}</Text>
                )}
              </View>

              {/* Province */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tỉnh/TP</Text>
                {editMode ? (
                  <TextInput
                    style={styles.infoInput}
                    value={editProvince}
                    onChangeText={setEditProvince}
                    placeholder="Tỉnh / Thành phố"
                  />
                ) : (
                  <Text style={styles.infoValue}>{authUser?.province || '—'}</Text>
                )}
              </View>
            </View>
          </View>

          {/* My Recent Tickets */}
          <View style={{ marginTop: 16 }}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>HỒ SƠ BÁO CÁO CỦA TÔI</Text>
              <TouchableOpacity
                onPress={() => navigate('my-reports')}
                style={styles.seeAllBtn}
              >
                <Text style={styles.seeAllText}>Tất cả →</Text>
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8 }}>
              {realTickets.length > 0 ? (
                realTickets.slice(0, 3).map((t) => {
                  const st = mapBackendStatus(t.status);
                  const catName = t.categoryName || t.subCategories?.[0]?.name || t.description || 'Sự cố';
                  const timeStr = t.createdAt ? new Date(t.createdAt).toLocaleDateString('vi-VN') : '';
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={styles.ticketCard}
                      onPress={() => openTicket?.(t.id, t)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.ticketLeft}>
                        <Text style={styles.ticketCategory} numberOfLines={1}>
                          {catName}
                        </Text>
                        <Text style={styles.ticketTime}>{timeStr}</Text>
                      </View>
                      <View style={styles.ticketRight}>
                        <View
                          style={[
                            styles.statusChip,
                            { backgroundColor: st.bgColor, borderColor: st.borderColor },
                          ]}
                        >
                          <Text style={[styles.statusChipText, { color: st.color }]}>
                            {st.statusText}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.emptyReportsCard}>
                  <Ionicons name="document-text-outline" size={32} color="#94a3b8" />
                  <Text style={styles.emptyReportsTitle}>Chưa có hồ sơ báo cáo nào</Text>
                  <Text style={styles.emptyReportsSub}>
                    Các phản ánh sự cố đô thị bạn đã gửi sẽ xuất hiện tại đây.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyCreateBtn}
                    onPress={() => navigate('location')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.emptyCreateBtnText}>+ Tạo báo cáo mới</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Settings Group */}
          <View style={[styles.sectionCard, { marginTop: 16 }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderTitle}>CÀI ĐẶT</Text>
            </View>
            <View style={styles.settingsList}>
              {[
                { label: 'Thông báo đẩy', icon: 'notifications-outline' },
                { label: 'Ngôn ngữ', icon: 'globe-outline' },
                { label: 'Điều khoản sử dụng', icon: 'document-text-outline' },
              ].map((item, idx) => (
                <TouchableOpacity key={idx} style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <Ionicons name={item.icon as any} size={18} color="#64748b" />
                    <Text style={styles.settingText}>{item.label}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Logout Action Button */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => setShowLogoutDialog(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={18} color="#dc2626" />
            <Text style={styles.logoutBtnText}>ĐĂNG XUẤT</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomTabBar}>
        {[
          { id: 'home', label: 'Trang chủ', icon: 'home-outline' },
          { id: 'my-reports', label: 'Báo cáo', icon: 'document-text-outline' },
          { id: 'profile', label: 'Tài khoản', icon: 'person-outline' },
        ].map((tab) => {
          const active = tab.id === 'profile';
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => navigate(tab.id)}
            >
              {active ? <View style={styles.tabActiveBar} /> : null}
              <Ionicons
                name={tab.icon as any}
                size={20}
                color={active ? '#f97316' : '#94a3b8'}
              />
              <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Logout Confirmation Bottom Modal */}
      <Modal
        visible={showLogoutDialog}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLogoutDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalIconBox}>
                <Ionicons name="log-out-outline" size={22} color="#dc2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Xác nhận đăng xuất</Text>
                <Text style={styles.modalSubText}>
                  Bạn có chắc chắn muốn đăng xuất khỏi tài khoản CityFix? Bạn sẽ cần
                  đăng nhập lại để tiếp tục gửi và theo dõi báo cáo phản ánh.
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.stayBtn}
                onPress={() => setShowLogoutDialog(false)}
              >
                <Text style={styles.stayBtnText}>Ở lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmLogoutBtn}
                onPress={() => {
                  setShowLogoutDialog(false);
                  onLogout();
                }}
              >
                <Text style={styles.confirmLogoutBtnText}>Đăng xuất</Text>
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
  contentPadding: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  /* Hero Section */
  heroCard: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 16,
  },
  heroMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  heroInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  userPhone: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  userWard: {
    fontSize: 12,
    color: '#94a3b8',
  },

  /* Stats Grid */
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ea580c',
  },
  statLabel: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },

  /* Section Card */
  sectionCard: {
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardHeaderTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1.2,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  editBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ea580c',
  },
  editActionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  cancelBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  saveBtn: {
    backgroundColor: '#f97316',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    borderBottomWidth: 1,
    borderBottomColor: '#bbf7d0',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  successText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16a34a',
  },
  infoList: {},
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    width: 70,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'right',
    flex: 1,
  },
  infoInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 13,
    color: '#0f172a',
    textAlign: 'right',
  },
  disabledInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  disabledInputText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  readOnlyBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  readOnlyBadgeText: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '600',
  },

  /* My Recent Tickets Header */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 1.2,
  },
  seeAllBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  seeAllText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ea580c',
  },

  /* Ticket Card */
  emptyReportsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    gap: 6,
  },
  emptyReportsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  emptyReportsSub: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyCreateBtn: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fdba74',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  emptyCreateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ea580c',
  },
  ticketCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  ticketLeft: {
    flex: 1,
    paddingRight: 8,
  },
  ticketId: {
    fontSize: 9,
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  ticketCategory: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  ticketTime: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 2,
  },
  ticketRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusProcessing: {
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    borderColor: 'rgba(249, 115, 22, 0.25)',
  },
  statusDone: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  statusReceived: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  statusChipText: {
    fontSize: 9,
    fontWeight: '800',
  },

  /* Settings List */
  settingsList: {},
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingText: {
    fontSize: 13,
    color: '#334155',
  },

  /* Logout Button */
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginTop: 20,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
    letterSpacing: 0.8,
  },

  /* Bottom Navigation */
  bottomTabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    paddingTop: 8,
    paddingBottom: 20,
  },
  tabItem: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    position: 'relative',
  },
  tabActiveBar: {
    position: 'absolute',
    top: -8,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#f97316',
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabLabelActive: {
    color: '#ea580c',
    fontWeight: '700',
  },

  /* Modal Logout Sheet */
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
    paddingTop: 12,
    paddingBottom: 32,
    gap: 16,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 8,
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
  stayBtn: {
    backgroundColor: '#f97316',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  stayBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  confirmLogoutBtn: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmLogoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
  },
});
