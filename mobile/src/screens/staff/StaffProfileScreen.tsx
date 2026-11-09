import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  FlatList,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  StatusBar,
  Modal,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { AuthUser } from '../LoginScreen';
import {
  getStaffAssignedTickets,
  ReportedTicket,
  mapBackendStatus,
  updateProfile,
  getProfile,
  ApiError,
} from '../../api';
import { Alert, ActivityIndicator, RefreshControl } from 'react-native';
import {
  VN_PROVINCES_2025,
  Province2025,
  getWardsForProvince2025,
  findProvince2025ByName,
  removeVietnameseTones,
} from '../../constants/vnProvinces2025';

interface Props {
  navigate: (screen: string, params?: any) => void;
  authUser: AuthUser | null;
  onLogout: () => void;
  onUpdateUser: (updated: AuthUser) => void;
  openTicket?: (id: string, ticketObj?: ReportedTicket) => void;
}

export default function StaffProfileScreen({
  navigate,
  authUser,
  onLogout,
  onUpdateUser,
  openTicket,
}: Props) {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editFullName, setEditFullName] = useState(authUser?.fullName ?? '');
  const [editPhone, setEditPhone] = useState(authUser?.phone ?? '');
  const [editEmail, setEditEmail] = useState(authUser?.email ?? '');
  const [editWard, setEditWard] = useState(authUser?.ward ?? '');
  const [editAddress, setEditAddress] = useState(authUser?.address ?? '');
  const [editProvince, setEditProvince] = useState(authUser?.province ?? '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [assignedTickets, setAssignedTickets] = useState<ReportedTicket[]>([]);
  const [totalAssignedCount, setTotalAssignedCount] = useState<number>(0);

  // Picker modal state for 2025 Merged Provinces & Wards
  const [pickerMode, setPickerMode] = useState<'province' | 'ward' | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [availableWards, setAvailableWards] = useState<string[]>([]);
  const [loadingWards, setLoadingWards] = useState(false);

  const selectedProvinceObj = useMemo<Province2025 | undefined>(
    () => findProvince2025ByName(editProvince),
    [editProvince],
  );

  useEffect(() => {
    let active = true;
    if (!selectedProvinceObj) {
      setAvailableWards([]);
      return;
    }
    setAvailableWards(selectedProvinceObj.defaultWards);
    setLoadingWards(true);
    getWardsForProvince2025(selectedProvinceObj)
      .then((wards) => {
        if (active) setAvailableWards(wards);
      })
      .finally(() => {
        if (active) setLoadingWards(false);
      });
    return () => {
      active = false;
    };
  }, [selectedProvinceObj]);

  const filteredProvinces = useMemo(() => {
    const q = removeVietnameseTones(pickerSearch.trim());
    if (!q) return VN_PROVINCES_2025;
    return VN_PROVINCES_2025.filter(
      (p) =>
        removeVietnameseTones(p.name).includes(q) ||
        (p.mergedFrom && removeVietnameseTones(p.mergedFrom).includes(q)),
    );
  }, [pickerSearch]);

  const filteredWards = useMemo(() => {
    const q = removeVietnameseTones(pickerSearch.trim());
    if (!q) return availableWards;
    return availableWards.filter((w) => removeVietnameseTones(w).includes(q));
  }, [availableWards, pickerSearch]);

  const handleSelectProvince = (prov: Province2025, autoOpenWard = false) => {
    Keyboard.dismiss();
    const isDifferent = prov.name !== editProvince;
    setEditProvince(prov.name);
    if (isDifferent) {
      setEditWard('');
    }
    setPickerSearch('');
    if (autoOpenWard) {
      setPickerMode('ward');
    } else {
      setPickerMode(null);
    }
  };

  const handleSelectWard = (w: string) => {
    Keyboard.dismiss();
    setEditWard(w);
    setPickerSearch('');
    setPickerMode(null);
  };

  const loadStaffProfileData = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [profileRes, ticketsRes] = await Promise.allSettled([
        getProfile(),
        getStaffAssignedTickets(null, 'all', 0, 50),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value) {
        const p = profileRes.value;
        if (authUser) {
          onUpdateUser({
            ...authUser,
            fullName: p.fullName || authUser.fullName,
            phone: p.phoneNumber || authUser.phone,
            address: p.address ?? authUser.address,
            province: p.province ?? authUser.province,
            ward: p.ward ?? authUser.ward,
          });
        }
        setEditFullName(p.fullName || authUser?.fullName || '');
        setEditPhone(p.phoneNumber || authUser?.phone || '');
        setEditAddress(p.address ?? authUser?.address ?? '');
        setEditProvince(p.province ?? authUser?.province ?? '');
        setEditWard(p.ward ?? authUser?.ward ?? '');
      }

      if (ticketsRes.status === 'fulfilled' && ticketsRes.value && Array.isArray(ticketsRes.value.content)) {
        setAssignedTickets(ticketsRes.value.content);
        setTotalAssignedCount(ticketsRes.value.totalElements ?? ticketsRes.value.content.length);
      }
    } catch (e: any) {
      console.log('StaffProfile data load note:', e?.message);
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, [authUser, onUpdateUser]);

  useEffect(() => {
    loadStaffProfileData(false);
  }, []);

  const initials = (authUser?.fullName?.trim() || 'NV')
    .split(/\s+/)
    .map((w: string) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase();

  const totalTickets = totalAssignedCount || assignedTickets.length;
  const processingCount = assignedTickets.filter(
    (t) => mapBackendStatus(t.status).statusKey === 'processing'
  ).length;
  const doneCount = assignedTickets.filter(
    (t) => mapBackendStatus(t.status).statusKey === 'done'
  ).length;

  const stats = [
    { value: String(totalTickets), label: 'Hồ sơ tiếp nhận', filterKey: 'all' as const },
    { value: String(processingCount), label: 'Đang xử lý', filterKey: 'processing' as const },
    { value: String(doneCount), label: 'Đã hoàn thành', filterKey: 'done' as const },
  ];

  function startEdit() {
    setEditFullName(authUser?.fullName ?? '');
    setEditPhone(authUser?.phone ?? '');
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
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ và tên nhân viên.');
      return;
    }

    const cleanPhone = (editPhone || authUser.phone || '').replace(/[\s-]/g, '');
    const phoneRegex = /^\d{10,11}$/;
    if (cleanPhone && !phoneRegex.test(cleanPhone)) {
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
          : err?.message || 'Không thể cập nhật thông tin nhân viên vào hệ thống. Vui lòng thử lại.';
      Alert.alert('Cập nhật thất bại', msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topAccentBar} />

      <ScrollView
        style={styles.scrollArea}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadStaffProfileData(true)}
            colors={['#ea580c']}
            tintColor="#ea580c"
          />
        }
      >
        {/* Profile Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroMain}>
            <View style={styles.avatarBox}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>

            <View style={styles.heroInfo}>
              <View style={styles.roleBadge}>
                <Ionicons name="shield-checkmark" size={11} color="#ea580c" />
                <Text style={styles.roleBadgeText}>ĐỘI NGŨ KỸ THUẬT ĐÔ THỊ</Text>
              </View>
              <Text style={styles.userName} numberOfLines={1}>
                {authUser?.fullName ?? 'Đội ngũ Kỹ thuật Đô thị'}
              </Text>
              <Text style={styles.userPhone}>{authUser?.email || authUser?.phone || '—'}</Text>
            </View>
          </View>

          {/* Stats Bar */}
          <View style={styles.statsGrid}>
            {stats.map((s, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.statBox}
                onPress={() => navigate('staff-tickets', { filter: s.filterKey })}
                activeOpacity={0.75}
              >
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.contentPadding}>
          {/* Account Info Section */}
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderTitle}>THÔNG TIN NHÂN VIÊN</Text>
              {!editMode ? (
                <TouchableOpacity onPress={startEdit} style={styles.editBtn}>
                  <Feather name="edit-2" size={12} color="#ea580c" />
                  <Text style={styles.editBtnText}>Chỉnh sửa</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.editActionRow}>
                  <TouchableOpacity
                    onPress={() => setEditMode(false)}
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
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Họ tên</Text>
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

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Vai trò</Text>
                <Text style={[styles.infoValue, { color: '#ea580c' }]}>
                  Đội ngũ Kỹ thuật Đô thị
                </Text>
              </View>

              {/* Email (Cố định tài khoản) */}
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
                  <Text style={styles.infoValue}>{authUser?.email || 'Chưa cập nhật'}</Text>
                )}
              </View>

              {/* SĐT (Có thể sửa) */}
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
                  <Text style={styles.infoValue}>{authUser?.phone || '—'}</Text>
                )}
              </View>

              {/* Tỉnh / Thành phố */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tỉnh/TP</Text>
                {editMode ? (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => {
                      Keyboard.dismiss();
                      setPickerSearch('');
                      setPickerMode('province');
                    }}
                    style={styles.selectorBtn}
                  >
                    <Text
                      style={[
                        styles.selectorBtnText,
                        !editProvince && styles.selectorPlaceholderText,
                      ]}
                      numberOfLines={1}
                    >
                      {editProvince || 'Chọn Tỉnh / Thành phố'}
                    </Text>
                    <Ionicons name="chevron-down" size={15} color="#ea580c" />
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.infoValue}>{authUser?.province || 'TP. Hồ Chí Minh'}</Text>
                )}
              </View>

              {/* Phường / Xã */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phường/Xã</Text>
                {editMode ? (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => {
                      Keyboard.dismiss();
                      setPickerSearch('');
                      if (!editProvince.trim()) {
                        setPickerMode('province');
                        return;
                      }
                      setPickerMode('ward');
                    }}
                    style={styles.selectorBtn}
                  >
                    <Text
                      style={[
                        styles.selectorBtnText,
                        !editWard && styles.selectorPlaceholderText,
                      ]}
                      numberOfLines={1}
                    >
                      {editWard ||
                        (editProvince
                          ? `Chọn Phường/Xã (${editProvince})`
                          : 'Chọn Tỉnh/TP trước')}
                    </Text>
                    <Ionicons name="chevron-down" size={15} color="#ea580c" />
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.infoValue}>{authUser?.ward || '—'}</Text>
                )}
              </View>

              {/* Địa chỉ chi tiết */}
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
            </View>
          </View>

          {/* Recent Assigned Tickets */}
          <View style={{ marginTop: 16 }}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>HỒ SƠ PHÂN CÔNG GẦN ĐÂY</Text>
              <TouchableOpacity
                onPress={() => navigate('my-reports')}
                style={styles.seeAllBtn}
              >
                <Text style={styles.seeAllText}>Tất cả →</Text>
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8 }}>
              {assignedTickets.length > 0 ? (
                assignedTickets.slice(0, 4).map((t) => {
                  const st = mapBackendStatus(t.status);
                  const catName =
                    t.categoryName ||
                    t.subCategories?.[0]?.name ||
                    t.description ||
                    'Sự cố';
                  const timeStr = t.createdAt
                    ? new Date(t.createdAt).toLocaleDateString('vi-VN')
                    : '';
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
                            {
                              backgroundColor: st.bgColor,
                              borderColor: st.borderColor,
                            },
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
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyBoxText}>
                    Chưa có hồ sơ nào được phân công
                  </Text>
                </View>
              )}
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

      {/* Staff Bottom Navigation */}
      <View style={styles.bottomTabBar}>
        {[
          { id: 'home', label: 'Trang chủ', icon: 'home-outline' },
          { id: 'my-reports', label: 'Hồ sơ tiếp nhận', icon: 'briefcase-outline' },
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
                  Bạn có chắc chắn muốn đăng xuất? Bạn sẽ cần đăng nhập lại để
                  tiếp tục tiếp nhận và cập nhật tiến độ hồ sơ.
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

      {/* MODAL CHỌN TỈNH / THÀNH PHỐ & PHƯỜNG / XÃ SAU SÁP NHẬP */}
      <Modal
        visible={pickerMode !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerMode(null)}
      >
        <View style={styles.pickerBackdrop}>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setPickerMode(null)}
          />
          <View style={styles.pickerSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.pickerHeader}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.pickerTitle}>
                  {pickerMode === 'province'
                    ? 'Chọn Tỉnh / Thành phố'
                    : `Chọn Phường / Xã (${editProvince})`}
                </Text>
                <Text style={styles.pickerSubtitle}>
                  {pickerMode === 'province'
                    ? 'Danh sách 34 Tỉnh / Thành phố sau sáp nhập'
                    : `Danh sách Phường / Xã mới trực thuộc ${editProvince}`}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.pickerCloseBtn}
                onPress={() => setPickerMode(null)}
              >
                <Ionicons name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerStepTabs}>
              <TouchableOpacity
                style={[
                  styles.pickerStepTab,
                  pickerMode === 'province' && styles.pickerStepTabActive,
                ]}
                onPress={() => {
                  setPickerSearch('');
                  setPickerMode('province');
                }}
              >
                <Text
                  style={[
                    styles.pickerStepTabText,
                    pickerMode === 'province' && styles.pickerStepTabTextActive,
                  ]}
                  numberOfLines={1}
                >
                  1. {editProvince || 'Tỉnh / Thành phố'}
                </Text>
              </TouchableOpacity>
              <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
              <TouchableOpacity
                style={[
                  styles.pickerStepTab,
                  pickerMode === 'ward' && styles.pickerStepTabActive,
                  !editProvince && { opacity: 0.5 },
                ]}
                disabled={!editProvince}
                onPress={() => {
                  if (!editProvince) return;
                  setPickerSearch('');
                  setPickerMode('ward');
                }}
              >
                <Text
                  style={[
                    styles.pickerStepTabText,
                    pickerMode === 'ward' && styles.pickerStepTabTextActive,
                  ]}
                  numberOfLines={1}
                >
                  2. {editWard || 'Phường / Xã'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerSearchBox}>
              <Ionicons name="search-outline" size={16} color="#64748b" />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder={
                  pickerMode === 'province'
                    ? 'Tìm Tỉnh / Thành phố...'
                    : `Tìm Phường / Xã thuộc ${editProvince}...`
                }
                placeholderTextColor="#94a3b8"
                value={pickerSearch}
                onChangeText={setPickerSearch}
                autoCorrect={false}
              />
              {pickerSearch.length > 0 ? (
                <TouchableOpacity onPress={() => setPickerSearch('')}>
                  <Ionicons name="close-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              ) : null}
            </View>

            {pickerMode === 'province' ? (
              <FlatList
                data={filteredProvinces}
                keyExtractor={(item) => String(item.code)}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20, gap: 7 }}
                renderItem={({ item }) => {
                  const isSelected =
                    selectedProvinceObj?.code === item.code ||
                    editProvince.trim().toLowerCase() === item.name.toLowerCase();
                  return (
                    <TouchableOpacity
                      style={[
                        styles.pickerOptionItem,
                        isSelected && styles.pickerOptionItemActive,
                      ]}
                      onPress={() => handleSelectProvince(item, true)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.pickerOptionTitle,
                            isSelected && styles.pickerOptionTitleActive,
                          ]}
                        >
                          {item.name}
                        </Text>
                        {item.mergedFrom ? (
                          <Text style={styles.pickerOptionSub}>{item.mergedFrom}</Text>
                        ) : null}
                      </View>
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'chevron-forward'}
                        size={18}
                        color={isSelected ? '#ea580c' : '#cbd5e1'}
                      />
                    </TouchableOpacity>
                  );
                }}
              />
            ) : (
              <FlatList
                data={filteredWards}
                keyExtractor={(item, idx) => `${item}-${idx}`}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20, gap: 7 }}
                ListHeaderComponent={
                  loadingWards ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
                      <ActivityIndicator size="small" color="#ea580c" />
                      <Text style={{ fontSize: 12, color: '#ea580c' }}>
                        Đang đồng bộ danh sách Phường/Xã...
                      </Text>
                    </View>
                  ) : undefined
                }
                renderItem={({ item }) => {
                  const isSelected = editWard.trim().toLowerCase() === item.toLowerCase();
                  return (
                    <TouchableOpacity
                      style={[
                        styles.pickerOptionItem,
                        isSelected && styles.pickerOptionItemActive,
                      ]}
                      onPress={() => handleSelectWard(item)}
                    >
                      <Text
                        style={[
                          styles.pickerOptionTitle,
                          { flex: 1 },
                          isSelected && styles.pickerOptionTitleActive,
                        ]}
                      >
                        {item}
                      </Text>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                      ) : null}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
                    <Text style={{ fontSize: 12.5, color: '#64748b' }}>
                      Không tìm thấy "{pickerSearch.trim()}".
                    </Text>
                    {pickerSearch.trim().length >= 2 ? (
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#ea580c',
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 10,
                        }}
                        onPress={() => handleSelectWard(pickerSearch.trim())}
                      >
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                          Sử dụng "{pickerSearch.trim()}"
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                }
              />
            )}
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
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ea580c',
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
    width: 80,
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
  ticketCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
  },
  ticketLeft: {
    flex: 1,
    paddingRight: 8,
  },
  ticketCategory: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  ticketTime: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 2,
  },
  ticketRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 9,
    fontWeight: '800',
  },
  emptyBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  emptyBoxText: {
    fontSize: 12,
    color: '#64748b',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 18,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#dc2626',
    letterSpacing: 0.5,
  },
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  tabActiveBar: {
    position: 'absolute',
    top: 0,
    width: 32,
    height: 2,
    backgroundColor: '#f97316',
    borderRadius: 1,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 3,
  },
  tabLabelActive: {
    color: '#f97316',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 16,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  stayBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  stayBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  confirmLogoutBtn: {
    flex: 1.5,
    backgroundColor: '#dc2626',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  confirmLogoutBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  disabledInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  disabledInputText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    flex: 1,
  },
  readOnlyBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  readOnlyBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
  },
  selectorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fdba74',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
  },
  selectorBtnText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'right',
  },
  selectorPlaceholderText: {
    color: '#94a3b8',
    fontWeight: '500',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: '55%',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 18,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  pickerSubtitle: {
    fontSize: 11.5,
    color: '#64748b',
  },
  pickerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerStepTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
    gap: 6,
  },
  pickerStepTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  pickerStepTabActive: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  pickerStepTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  pickerStepTabTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  pickerSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
    gap: 8,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    paddingVertical: 0,
  },
  pickerOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  pickerOptionItemActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
  },
  pickerOptionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  pickerOptionTitleActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  pickerOptionSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
});

