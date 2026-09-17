import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { AuthUser } from './LoginScreen';

interface Props {
  navigate: (screen: string) => void;
  authUser: AuthUser | null;
  onLogout: () => void;
  onUpdateUser: (updated: AuthUser) => void;
  openTicket?: (id: string) => void;
}

const MY_TICKETS = [
  {
    id: 'CF-2910',
    category: 'Đèn đường chiếu sáng không hoạt động',
    address: '128 Nguyễn Trãi, Phường 3, Quận 5',
    status: 'ĐANG XỬ LÝ',
    statusKey: 'processing',
    time: '20 phút trước',
  },
  {
    id: 'CF-2898',
    category: 'Nắp cống bị bể gây nguy hiểm',
    address: '45 Trần Hưng Đạo, Phường Phạm Ngũ Lão, Q.1',
    status: 'ĐÃ TIẾP NHẬN',
    statusKey: 'received',
    time: '2 giờ trước',
  },
  {
    id: 'CF-2750',
    category: 'Cây xanh che khuất biển báo giao thông',
    address: 'Hẻm 210 Lê Văn Sỹ, Phường 10, Q.3',
    status: 'HOÀN THÀNH',
    statusKey: 'done',
    time: '3 ngày trước',
  },
];

export default function ProfileScreen({
  navigate,
  authUser,
  onLogout,
  onUpdateUser,
  openTicket,
}: Props) {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editFullName, setEditFullName] = useState(authUser?.fullName ?? '');
  const [editEmail, setEditEmail] = useState(authUser?.email ?? '');
  const [editWard, setEditWard] = useState(authUser?.ward ?? '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const initials = (authUser?.fullName ?? '?')
    .split(' ')
    .map((w: string) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase();

  const totalTickets = MY_TICKETS.length;
  const processingCount = MY_TICKETS.filter((t) => t.statusKey === 'processing').length;
  const doneCount = MY_TICKETS.filter((t) => t.statusKey === 'done').length;

  const stats = [
    { value: String(totalTickets), label: 'Báo cáo đã gửi' },
    { value: String(processingCount), label: 'Đang xử lý' },
    { value: String(doneCount), label: 'Hoàn thành' },
  ];

  function startEdit() {
    setEditFullName(authUser?.fullName ?? '');
    setEditEmail(authUser?.email ?? '');
    setEditWard(authUser?.ward ?? '');
    setEditMode(true);
    setSaveSuccess(false);
  }

  function saveEdit() {
    if (!authUser) return;
    onUpdateUser({
      ...authUser,
      fullName: editFullName.trim(),
      email: editEmail.trim(),
      ward: editWard.trim(),
    });
    setEditMode(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
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
              <Text style={styles.userPhone}>{authUser?.phone ?? '—'}</Text>
              <Text style={styles.userWard}>{authUser?.ward ?? '—'}</Text>
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
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelBtnText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={saveEdit} style={styles.saveBtn}>
                    <Text style={styles.saveBtnText}>Lưu</Text>
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

              {/* Phone (Read Only) */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>SĐT</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.infoValue, { color: '#64748b' }]}>
                    {authUser?.phone ?? '—'}
                  </Text>
                  <View style={styles.readOnlyBadge}>
                    <Text style={styles.readOnlyBadgeText}>Cố định</Text>
                  </View>
                </View>
              </View>

              {/* Email */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                {editMode ? (
                  <TextInput
                    style={styles.infoInput}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    keyboardType="email-address"
                    placeholder="email@example.com"
                  />
                ) : (
                  <Text style={styles.infoValue}>
                    {authUser?.email || 'Chưa cập nhật'}
                  </Text>
                )}
              </View>

              {/* Ward / Area */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Khu vực</Text>
                {editMode ? (
                  <TextInput
                    style={styles.infoInput}
                    value={editWard}
                    onChangeText={setEditWard}
                    placeholder="Phường / Quận"
                  />
                ) : (
                  <Text style={styles.infoValue}>{authUser?.ward ?? '—'}</Text>
                )}
              </View>
            </View>
          </View>

          {/* My Recent Tickets */}
          <View style={{ marginTop: 16 }}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>VÉ CỦA TÔI</Text>
              <TouchableOpacity
                onPress={() => navigate('my-reports')}
                style={styles.seeAllBtn}
              >
                <Text style={styles.seeAllText}>Tất cả →</Text>
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8 }}>
              {MY_TICKETS.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.ticketCard}
                  onPress={() => openTicket?.(t.id)}
                  activeOpacity={0.75}
                >
                  <View style={styles.ticketLeft}>
                    <Text style={styles.ticketId}>{t.id}</Text>
                    <Text style={styles.ticketCategory} numberOfLines={1}>
                      {t.category}
                    </Text>
                    <Text style={styles.ticketTime}>{t.time}</Text>
                  </View>
                  <View style={styles.ticketRight}>
                    <View
                      style={[
                        styles.statusChip,
                        t.statusKey === 'processing'
                          ? styles.statusProcessing
                          : t.statusKey === 'done'
                          ? styles.statusDone
                          : styles.statusReceived,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusChipText,
                          t.statusKey === 'processing'
                            ? { color: '#ea580c' }
                            : t.statusKey === 'done'
                            ? { color: '#16a34a' }
                            : { color: '#64748b' },
                        ]}
                      >
                        {t.status}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                  </View>
                </TouchableOpacity>
              ))}
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
          { id: 'profile', label: 'Hồ sơ', icon: 'person-outline' },
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
                <Text style={styles.modalTitle}>Đăng xuất?</Text>
                <Text style={styles.modalSubText}>
                  Phiên làm việc và token sẽ bị xóa khỏi thiết bị. Bạn cần đăng nhập
                  lại để tiếp tục.
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.stayBtn}
                onPress={() => setShowLogoutDialog(false)}
              >
                <Text style={styles.stayBtnText}>Ở LẠI</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmLogoutBtn}
                onPress={() => {
                  setShowLogoutDialog(false);
                  onLogout();
                }}
              >
                <Text style={styles.confirmLogoutBtnText}>XÁC NHẬN ĐĂNG XUẤT</Text>
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
  readOnlyBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  readOnlyBadgeText: {
    fontSize: 8,
    color: '#94a3b8',
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
