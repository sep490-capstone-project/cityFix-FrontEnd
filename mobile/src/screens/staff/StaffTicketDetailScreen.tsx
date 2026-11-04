import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ReportedTicket,
  mapBackendStatus,
  getTicketById,
  StaffTicketStep,
  StaffTicketStepEvidence,
  getStaffTicketSteps,
  updateStaffTicketStatus,
  createStaffRequest,
  checkStepReadiness,
} from '../../api';
import { AuthUser } from '../LoginScreen';
import EvidenceStampModal from './EvidenceStampModal';

interface Props {
  ticketId: string | null;
  ticketData?: ReportedTicket | null;
  authUser?: AuthUser | null;
  goBack: () => void;
  navigate: (s: string) => void;
}

interface StaffTicketView {
  id: string;
  category: string;
  address: string;
  submittedAt: string;
  locationMethod: 'AUTO_GPS' | 'MANUAL_PIN';
  agency: string;
  deadline: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: string;
  statusKey: 'processing' | 'received' | 'done' | 'rejected' | 'cancelled';
  description: string;
  imageUrl: string;
  imageUrls: string[];
  rawStatus?: string;
}

const STATUS_MAP = {
  processing: {
    label: 'Đang xử lý',
    color: '#ea580c',
    bg: 'rgba(249, 115, 22, 0.08)',
    border: 'rgba(249, 115, 22, 0.25)',
  },
  received: {
    label: 'Đã tiếp nhận',
    color: '#64748b',
    bg: '#f8fafc',
    border: '#e2e8f0',
  },
  done: {
    label: 'Hoàn thành',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
  },
  rejected: {
    label: 'Từ chối',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fca5a5',
  },
  cancelled: {
    label: 'Đã hủy',
    color: '#64748b',
    bg: '#f1f5f9',
    border: '#cbd5e1',
  },
};

const SEVERITY_MAP = {
  LOW: { label: 'Thấp', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  MEDIUM: {
    label: 'Trung bình',
    color: '#ea580c',
    bg: 'rgba(249, 115, 22, 0.08)',
    border: 'rgba(249, 115, 22, 0.25)',
  },
  HIGH: { label: 'Cao', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  CRITICAL: {
    label: 'Nghiêm trọng',
    color: '#991b1b',
    bg: '#fee2e2',
    border: '#f87171',
  },
};

function getTimeline(statusKey: string) {
  if (statusKey === 'cancelled') {
    return [
      {
        key: 'received',
        label: 'Đã tiếp nhận',
        desc: 'Hệ thống đã ghi nhận hồ sơ sự cố',
        done: true,
        active: false,
      },
      {
        key: 'cancelled',
        label: 'Đã hủy',
        desc: 'Hồ sơ xử lý đã bị hủy',
        done: true,
        active: true,
      },
    ];
  }
  if (statusKey === 'rejected') {
    return [
      {
        key: 'received',
        label: 'Đã tiếp nhận',
        desc: 'Hệ thống đã ghi nhận hồ sơ sự cố',
        done: true,
        active: false,
      },
      {
        key: 'rejected',
        label: 'Từ chối',
        desc: 'Sự cố không thuộc diện xử lý',
        done: true,
        active: true,
      },
    ];
  }
  const steps = [
    {
      key: 'received',
      label: 'Đã tiếp nhận',
      desc: 'Hồ sơ đã được phân công xử lý',
    },
    {
      key: 'processing',
      label: 'Đang xử lý hiện trường',
      desc: 'Nhân viên đang thực hiện các bước giải quyết & nộp bằng chứng',
    },
    {
      key: 'done',
      label: 'Hoàn thành',
      desc: 'Sự cố đã được khắc phục hoàn tất',
    },
  ];
  const activeIdx = statusKey === 'done' ? 2 : statusKey === 'processing' ? 1 : 0;
  return steps.map((s, i) => ({
    ...s,
    done: i <= activeIdx,
    active: i === activeIdx,
  }));
}

export default function StaffTicketDetailScreen({
  ticketId,
  ticketData: initialTicketData,
  authUser,
  goBack,
}: Props) {
  const [ticketData, setTicketData] = useState<ReportedTicket | null>(
    initialTicketData || null
  );
  const [loading, setLoading] = useState<boolean>(
    !initialTicketData && Boolean(ticketId) && !ticketId?.startsWith('CF-')
  );

  // Staff workflow states
  const [staffSteps, setStaffSteps] = useState<StaffTicketStep[]>(
    (initialTicketData?.steps as StaffTicketStep[]) || []
  );
  const [updatingStepId, setUpdatingStepId] = useState<string | null>(null);
  const [evidenceModalVisible, setEvidenceModalVisible] = useState(false);
  const [evidenceTargetStepId, setEvidenceTargetStepId] = useState<string>('');
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [requestStepId, setRequestStepId] = useState<string>('');
  const [requestTitle, setRequestTitle] = useState<string>('');
  const [requestContent, setRequestContent] = useState<string>('');
  const [submittingRequest, setSubmittingRequest] = useState<boolean>(false);

  // Image gallery states
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [ticketData?.id, ticketId]);

  useEffect(() => {
    if (initialTicketData) {
      setTicketData(initialTicketData);
      setLoading(false);
      return;
    }

    if (ticketId && !ticketId.startsWith('CF-')) {
      let isMounted = true;
      setLoading(true);
      getTicketById(ticketId)
        .then((fetched) => {
          if (isMounted && fetched) {
            setTicketData(fetched);
          }
        })
        .catch((err) => {
          console.warn('Lỗi tải chi tiết hồ sơ từ server:', err);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [ticketId, initialTicketData]);

  // Tải danh sách steps mới nhất cho vé
  useEffect(() => {
    const targetId = ticketData?.id || ticketId;
    if (!targetId || targetId.startsWith('CF-')) return;

    let mounted = true;
    getStaffTicketSteps(targetId)
      .then((fetchedSteps) => {
        if (mounted && Array.isArray(fetchedSteps) && fetchedSteps.length > 0) {
          setStaffSteps(fetchedSteps);
          setTicketData((prev) =>
            prev ? { ...prev, steps: fetchedSteps as any } : prev
          );
        }
      })
      .catch((e) => console.log('Fetch staff ticket steps note:', e?.message));

    return () => {
      mounted = false;
    };
  }, [ticketData?.id, ticketId]);

  const stInfo = mapBackendStatus(ticketData?.status);
  const resolvedImages: string[] = (
    (ticketData?.imageUrls &&
    Array.isArray(ticketData.imageUrls) &&
    ticketData.imageUrls.length > 0
      ? ticketData.imageUrls
      : null) ||
    (ticketData?.images &&
    Array.isArray(ticketData.images) &&
    ticketData.images.length > 0
      ? ticketData.images
      : null) ||
    (ticketData?.imageUrl ? [ticketData.imageUrl] : [])
  ).filter(Boolean);

  const ticket: StaffTicketView = {
    id: ticketData?.id || ticketId || '',
    category:
      ticketData?.categoryName ||
      ticketData?.subCategories?.[0]?.name ||
      ticketData?.description ||
      'Hồ sơ sự cố đô thị',
    address: ticketData?.address || 'Chưa xác định vị trí',
    submittedAt: ticketData?.createdAt
      ? new Date(ticketData.createdAt).toLocaleString('vi-VN')
      : 'Vừa xong',
    locationMethod:
      ticketData?.locationMethod === 'MANUAL_ENTRY' ? 'MANUAL_PIN' : 'AUTO_GPS',
    agency: ticketData?.departmentName || 'Đơn vị xử lý kỹ thuật',
    deadline: ticketData?.deadline
      ? new Date(ticketData.deadline).toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : 'Theo quy trình SLA',
    severity: ((
      ticketData?.priority ||
      ticketData?.severity ||
      'MEDIUM'
    ).toUpperCase() as any),
    status: stInfo.statusText,
    statusKey: stInfo.statusKey,
    description: ticketData?.description || 'Không có mô tả chi tiết.',
    imageUrl: resolvedImages[0] || '',
    imageUrls: resolvedImages,
    rawStatus: ticketData?.status,
  };

  // Lọc chỉ lấy các step thuộc về chủ tài khoản đang đăng nhập
  const myStaffSteps = staffSteps.filter((st) => {
    if (!authUser) return true;
    const anySt = st as any;

    const myId = (authUser.userId || '').trim().toLowerCase();
    const myEmail = (authUser.email || '').trim().toLowerCase();
    const myName = (authUser.fullName || '').trim().toLowerCase();

    const stepAssigneeId = String(
      st.assigneeId ||
        anySt.assignee?.userId ||
        anySt.assignee?.id ||
        anySt.staffId ||
        anySt.userId ||
        ''
    )
      .trim()
      .toLowerCase();

    const stepAssigneeEmail = String(
      anySt.assigneeEmail || anySt.assignee?.email || anySt.email || ''
    )
      .trim()
      .toLowerCase();

    const stepAssigneeName = String(
      st.assigneeName ||
        anySt.assignee?.fullName ||
        anySt.assignee?.name ||
        anySt.staffName ||
        anySt.staff?.fullName ||
        anySt.user?.fullName ||
        anySt.handlerName ||
        ''
    )
      .trim()
      .toLowerCase();

    if (myId && stepAssigneeId && myId === stepAssigneeId) return true;
    if (myEmail && stepAssigneeEmail && myEmail === stepAssigneeEmail) return true;
    if (myEmail && stepAssigneeId && myEmail === stepAssigneeId) return true;
    if (myName && stepAssigneeName && myName === stepAssigneeName) return true;

    return false;
  });

  const handleStaffStepStatusChange = async (
    stepInstanceId: string,
    targetStatus: string,
    stepLabel?: string
  ) => {
    const targetId = ticketData?.id || ticket.id;
    if (!targetId || !stepInstanceId) return;

    try {
      setUpdatingStepId(stepInstanceId);
      const note = `Cập nhật bước "${stepLabel || 'Xử lý hiện trường'}" sang ${targetStatus}`;
      const updated = await updateStaffTicketStatus(
        targetId,
        targetStatus,
        note,
        stepInstanceId
      );

      const nextSteps = staffSteps.map((st) => {
        const sId = st.id || st.ticketStepId || st.stepId;
        if (sId === stepInstanceId) {
          return { ...st, status: targetStatus };
        }
        return st;
      });
      setStaffSteps(nextSteps);

      const allDone =
        nextSteps.length > 0 &&
        nextSteps.every((s) => s.status === 'RESOLVED' || s.status === 'COMPLETED');

      setTicketData((prev) =>
        prev
          ? {
              ...prev,
              ...updated,
              steps: nextSteps as any,
              status: allDone
                ? 'RESOLVED'
                : prev.status === 'ASSIGNED' && targetStatus === 'IN_PROGRESS'
                ? 'IN_PROGRESS'
                : updated?.status || prev.status,
            }
          : prev
      );

      Alert.alert(
        'Đã cập nhật',
        `Trạng thái bước đã chuyển sang "${
          targetStatus === 'IN_PROGRESS'
            ? 'Đang xử lý'
            : targetStatus === 'RESOLVED'
            ? 'Đã giải quyết'
            : targetStatus
        }".`
      );
    } catch (err: any) {
      Alert.alert('Lỗi cập nhật bước', err?.message || 'Không thể đổi trạng thái bước.');
    } finally {
      setUpdatingStepId(null);
    }
  };

  const handleOpenEvidenceModal = (stepId?: string) => {
    if (stepId) {
      setEvidenceTargetStepId(stepId);
    } else if (myStaffSteps.length > 0) {
      const def =
        myStaffSteps.find(
          (s) =>
            s.status === 'IN_PROGRESS' ||
            s.status === 'ASSIGNED' ||
            s.status === 'PENDING'
        ) || myStaffSteps[0];
      setEvidenceTargetStepId(def.id || def.ticketStepId || def.stepId || '');
    } else if (staffSteps.length > 0) {
      const def =
        staffSteps.find(
          (s) =>
            s.status === 'IN_PROGRESS' ||
            s.status === 'ASSIGNED' ||
            s.status === 'PENDING'
        ) || staffSteps[0];
      setEvidenceTargetStepId(def.id || def.ticketStepId || def.stepId || '');
    }
    setEvidenceModalVisible(true);
  };

  const handleEvidenceUploaded = (
    stepId: string,
    uploadedEvidences: StaffTicketStepEvidence[]
  ) => {
    const nextSteps = staffSteps.map((st) => {
      const sId = st.id || st.ticketStepId || st.stepId;
      if (sId === stepId) {
        return {
          ...st,
          evidences:
            uploadedEvidences && uploadedEvidences.length > 0
              ? [...(st.evidences || []), ...uploadedEvidences]
              : st.evidences,
        };
      }
      return st;
    });
    setStaffSteps(nextSteps);
    setTicketData((prev) => (prev ? { ...prev, steps: nextSteps as any } : prev));
  };

  const handleOpenRequestModal = (stepId?: string, defaultTitle?: string) => {
    setRequestStepId(stepId || '');
    setRequestTitle(defaultTitle || '');
    setRequestContent('');
    setRequestModalVisible(true);
  };

  const handleSubmitStaffRequest = async () => {
    if (!requestTitle.trim()) {
      Alert.alert('Thiếu tiêu đề', 'Vui lòng nhập tiêu đề báo cáo / yêu cầu.');
      return;
    }
    if (!requestContent.trim()) {
      Alert.alert('Thiếu nội dung', 'Vui lòng nhập nội dung chi tiết gửi Quản lý.');
      return;
    }

    try {
      setSubmittingRequest(true);
      await createStaffRequest({
        ticketId: ticketData?.id || ticket.id,
        stepId: requestStepId || undefined,
        title: requestTitle.trim(),
        content: requestContent.trim(),
      });
      setRequestModalVisible(false);
      Alert.alert(
        'Đã gửi yêu cầu',
        'Yêu cầu của bạn đã được gửi tới Quản lý phụ trách thành công!'
      );
    } catch (err: any) {
      Alert.alert('Không thể gửi yêu cầu', err?.message || 'Đã xảy ra lỗi.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.notFoundContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={[styles.notFoundText, { marginTop: 16 }]}>
          Đang tải hồ sơ tiếp nhận...
        </Text>
      </View>
    );
  }

  if (!ticketId && !ticketData) {
    return (
      <View style={styles.notFoundContainer}>
        <StatusBar barStyle="dark-content" />
        <Ionicons name="briefcase-outline" size={48} color="#94a3b8" />
        <Text style={styles.notFoundText}>Không tìm thấy thông tin hồ sơ</Text>
        <TouchableOpacity style={styles.goBackBtn} onPress={goBack}>
          <Text style={styles.goBackBtnText}>← Quay lại danh sách</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const st = STATUS_MAP[ticket.statusKey] || STATUS_MAP.received;
  const sev = SEVERITY_MAP[ticket.severity] || SEVERITY_MAP.MEDIUM;
  const timeline = getTimeline(ticket.statusKey);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topAccentBar} />

      {/* Top Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitleText}>Chi tiết hồ sơ tiếp nhận</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {ticket.category || 'Thông tin hồ sơ'}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadgeHeader,
            { backgroundColor: st.bg, borderColor: st.border },
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: st.color }]} />
          <Text style={[styles.statusBadgeText, { color: st.color }]}>
            {ticket.status || st.label}
          </Text>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        <View style={styles.contentPadding}>
          {/* Hero Image Card / Gallery */}
          {ticket.imageUrls && ticket.imageUrls.length > 0 ? (
            <View style={styles.heroSection}>
              <TouchableOpacity
                style={styles.heroCard}
                activeOpacity={0.9}
                onPress={() =>
                  setFullscreenImage(
                    ticket.imageUrls?.[selectedImageIndex] || ticket.imageUrl
                  )
                }
              >
                <Image
                  source={{
                    uri: ticket.imageUrls[selectedImageIndex] || ticket.imageUrl,
                  }}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
                <View style={styles.imageOverlay} />

                {ticket.imageUrls.length > 1 && (
                  <View style={styles.imageCounterBadge}>
                    <Ionicons name="images-outline" size={13} color="#ffffff" />
                    <Text style={styles.imageCounterText}>
                      {selectedImageIndex + 1}/{ticket.imageUrls.length}
                    </Text>
                  </View>
                )}

                <View style={styles.expandHintBadge}>
                  <Ionicons name="scan-outline" size={14} color="#ffffff" />
                </View>

                <View
                  style={[
                    styles.severityBadge,
                    { backgroundColor: sev.bg, borderColor: sev.border },
                  ]}
                >
                  <Text style={[styles.severityText, { color: sev.color }]}>
                    ĐỘ ƯU TIÊN: {sev.label.toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>

              {ticket.imageUrls.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.thumbnailStrip}
                >
                  {ticket.imageUrls.map((url, idx) => {
                    const isSelected = idx === selectedImageIndex;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.thumbnailItem,
                          isSelected && styles.thumbnailItemActive,
                        ]}
                        onPress={() => setSelectedImageIndex(idx)}
                        activeOpacity={0.8}
                      >
                        <Image
                          source={{ uri: url }}
                          style={styles.thumbnailImg}
                          resizeMode="cover"
                        />
                        {isSelected && <View style={styles.thumbnailActiveBorder} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          ) : (
            <View style={styles.noImageCard}>
              <View style={styles.noImageIconBox}>
                <Ionicons name="image-outline" size={32} color="#94a3b8" />
              </View>
              <Text style={styles.noImageTitle}>Không có hình ảnh hiện trường ban đầu</Text>
              <Text style={styles.noImageSub}>
                Hồ sơ không đính kèm ảnh khi tiếp nhận
              </Text>
              <View style={styles.noImageMetaRow}>
                <View
                  style={[
                    styles.severityBadgeInline,
                    { backgroundColor: sev.bg, borderColor: sev.border },
                  ]}
                >
                  <Text style={[styles.severityText, { color: sev.color }]}>
                    ĐỘ ƯU TIÊN: {sev.label.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* General Information Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.orangeIndicator} />
              <Text style={styles.cardTitle}>THÔNG TIN CHUNG</Text>
            </View>
            <View style={styles.infoList}>
              {[
                { label: 'Loại sự cố', value: ticket.category },
                { label: 'Địa điểm', value: ticket.address },
                { label: 'Thời gian gửi', value: ticket.submittedAt },
                {
                  label: 'Tọa độ',
                  value:
                    ticketData?.latitude && ticketData?.longitude
                      ? `${Number(ticketData.latitude).toFixed(5)}, ${Number(
                          ticketData.longitude
                        ).toFixed(5)}`
                      : ticket.locationMethod === 'AUTO_GPS'
                      ? 'GPS Tự động'
                      : 'Ghim thủ công',
                },
                { label: 'Đơn vị phụ trách', value: ticket.agency },
                { label: 'Thời hạn SLA', value: ticket.deadline },
              ].map((row, idx) => (
                <View key={idx} style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{row.label}</Text>
                  <Text style={styles.infoValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Incident Description */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.orangeIndicator} />
              <Text style={styles.cardTitle}>MÔ TẢ SỰ CỐ</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.descriptionText}>{ticket.description}</Text>
            </View>
          </View>

          {/* KHỐI XỬ LÝ BƯỚC CỦA CHỦ TÀI KHOẢN STAFF */}
          <View style={styles.card}>
            <View style={[styles.cardHeader, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.orangeIndicator} />
                <Text style={styles.cardTitle}>
                  BƯỚC XỬ LÝ CỦA BẠN ({myStaffSteps.length})
                </Text>
              </View>
              {myStaffSteps.length > 0 ? (
                <View style={styles.staffProgressBadge}>
                  <Text style={styles.staffProgressBadgeText}>
                    {
                      myStaffSteps.filter(
                        (s) => s.status === 'RESOLVED' || s.status === 'COMPLETED'
                      ).length
                    }
                    /{myStaffSteps.length} xong
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={[styles.cardBody, { gap: 12 }]}>
              {/* Thanh nút thao tác nhanh cho Staff */}
              <View style={styles.staffTopActionRow}>
                <TouchableOpacity
                  style={styles.staffPrimaryBtn}
                  onPress={() => handleOpenEvidenceModal()}
                  activeOpacity={0.85}
                >
                  <Ionicons name="camera" size={16} color="#ffffff" />
                  <Text style={styles.staffPrimaryBtnText}>
                    CHỤP & NỘP BẰNG CHỨNG
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.staffSecondaryBtn}
                  onPress={() =>
                    handleOpenRequestModal(
                      undefined,
                      `Hỗ trợ xử lý hồ sơ #${String(ticket.id).slice(0, 8)}`
                    )
                  }
                  activeOpacity={0.85}
                >
                  <Ionicons name="paper-plane-outline" size={15} color="#ea580c" />
                  <Text style={styles.staffSecondaryBtnText}>Báo Quản lý</Text>
                </TouchableOpacity>
              </View>

              {myStaffSteps.length === 0 ? (
                <View style={styles.staffEmptyStepsBox}>
                  <Ionicons name="clipboard-outline" size={28} color="#94a3b8" />
                  <Text style={styles.staffEmptyStepsText}>
                    Hồ sơ chưa có bước quy trình nào được phân công cho tài khoản của bạn.
                  </Text>
                </View>
              ) : (
                myStaffSteps.map((stItem, idx) => {
                  const stepInstanceId =
                    stItem.id || stItem.ticketStepId || stItem.stepId || '';
                  const stepLabel =
                    stItem.stepName ||
                    stItem.name ||
                    stItem.title ||
                    stItem.notes ||
                    `Bước ${idx + 1}`;
                  const stepStatus = (stItem.status || 'PENDING').toUpperCase();
                  const isStepDone =
                    stepStatus === 'RESOLVED' || stepStatus === 'COMPLETED';
                  const isStepInProgress = stepStatus === 'IN_PROGRESS';
                  const readiness = checkStepReadiness(stItem, staffSteps);
                  const isUpdatingThis = updatingStepId === stepInstanceId;

                  return (
                    <View
                      key={stepInstanceId || idx}
                      style={[
                        styles.staffStepItemCard,
                        isStepDone && styles.staffStepItemDone,
                        isStepInProgress && styles.staffStepItemActive,
                      ]}
                    >
                      {/* Dòng tiêu đề bước */}
                      <View style={styles.staffStepHeaderRow}>
                        <View
                          style={[
                            styles.staffStepNumBox,
                            isStepDone
                              ? { backgroundColor: '#16a34a' }
                              : isStepInProgress
                              ? { backgroundColor: '#f97316' }
                              : { backgroundColor: '#cbd5e1' },
                          ]}
                        >
                          <Text style={styles.staffStepNumText}>{idx + 1}</Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.staffStepTitleText}>{stepLabel}</Text>
                          <Text style={styles.staffStepAssigneeText}>
                            👤 Người giải quyết: {readiness.assigneeName}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.staffStepStatusPill,
                            isStepDone
                              ? {
                                  backgroundColor: '#f0fdf4',
                                  borderColor: '#bbf7d0',
                                }
                              : isStepInProgress
                              ? {
                                  backgroundColor: 'rgba(249, 115, 22, 0.1)',
                                  borderColor: '#fed7aa',
                                }
                              : {
                                  backgroundColor: '#f8fafc',
                                  borderColor: '#e2e8f0',
                                },
                          ]}
                        >
                          <Text
                            style={[
                              styles.staffStepStatusPillText,
                              isStepDone
                                ? { color: '#16a34a' }
                                : isStepInProgress
                                ? { color: '#ea580c' }
                                : { color: '#64748b' },
                            ]}
                          >
                            {isStepDone
                              ? 'ĐÃ XONG'
                              : isStepInProgress
                              ? 'ĐANG XỬ LÝ'
                              : 'CHỜ XỬ LÝ'}
                          </Text>
                        </View>
                      </View>

                      {/* Huy hiệu sẵn sàng làm ngay hoặc chờ bước phụ thuộc */}
                      {!isStepDone ? (
                        <View
                          style={[
                            styles.staffReadinessBanner,
                            readiness.canDoNow
                              ? styles.staffReadinessOk
                              : styles.staffReadinessWait,
                          ]}
                        >
                          <Text
                            style={[
                              styles.staffReadinessText,
                              {
                                color: readiness.canDoNow ? '#15803d' : '#b45309',
                              },
                            ]}
                          >
                            {readiness.canDoNow
                              ? '⚡ Có thể thực hiện ngay tức thì'
                              : `⏳ Chờ hoàn tất: ${readiness.pendingDependencies
                                  .map((d) => d.name)
                                  .join(', ')}`}
                          </Text>
                        </View>
                      ) : null}

                      {/* Các nút thao tác giải quyết bước */}
                      <View style={styles.staffStepActionRow}>
                        {!isStepInProgress && !isStepDone ? (
                          <TouchableOpacity
                            style={styles.staffStepBtnStart}
                            disabled={isUpdatingThis}
                            onPress={() =>
                              handleStaffStepStatusChange(
                                stepInstanceId,
                                'IN_PROGRESS',
                                stepLabel
                              )
                            }
                          >
                            {isUpdatingThis ? (
                              <ActivityIndicator size="small" color="#ea580c" />
                            ) : (
                              <>
                                <Ionicons
                                  name="play-circle-outline"
                                  size={15}
                                  color="#ea580c"
                                />
                                <Text style={styles.staffStepBtnStartText}>
                                  Bắt đầu bước
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        ) : null}

                        {!isStepDone ? (
                          <TouchableOpacity
                            style={styles.staffStepBtnResolve}
                            disabled={isUpdatingThis}
                            onPress={() =>
                              handleStaffStepStatusChange(
                                stepInstanceId,
                                'RESOLVED',
                                stepLabel
                              )
                            }
                          >
                            {isUpdatingThis ? (
                              <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                              <>
                                <Ionicons
                                  name="checkmark-circle-outline"
                                  size={15}
                                  color="#ffffff"
                                />
                                <Text style={styles.staffStepBtnResolveText}>
                                  Hoàn thành bước
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        ) : null}

                        <TouchableOpacity
                          style={styles.staffStepBtnCamera}
                          onPress={() => handleOpenEvidenceModal(stepInstanceId)}
                        >
                          <Ionicons name="camera-outline" size={15} color="#ffffff" />
                          <Text style={styles.staffStepBtnCameraText}>
                            Chụp Evidence
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.staffStepBtnReport}
                          onPress={() =>
                            handleOpenRequestModal(
                              stepInstanceId,
                              `Yêu cầu hỗ trợ bước: ${stepLabel}`
                            )
                          }
                        >
                          <Ionicons
                            name="chatbubble-ellipses-outline"
                            size={14}
                            color="#475569"
                          />
                        </TouchableOpacity>
                      </View>

                      {/* Danh sách ảnh bằng chứng đã nộp của bước này */}
                      {stItem.evidences && stItem.evidences.length > 0 ? (
                        <View style={styles.staffStepEvidenceBox}>
                          <Text style={styles.staffStepEvidenceLabel}>
                            📎 Bằng chứng đã nộp ({stItem.evidences.length} ảnh — chạm để xem rõ Ngày giờ & Địa chỉ):
                          </Text>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 8, marginTop: 4 }}
                          >
                            {stItem.evidences.map((ev, evIdx) => (
                              <TouchableOpacity
                                key={ev.evidenceId || evIdx}
                                style={styles.staffEvidenceThumbWrap}
                                onPress={() => setFullscreenImage(ev.imageUrl)}
                                activeOpacity={0.85}
                              >
                                <Image
                                  source={{ uri: ev.imageUrl }}
                                  style={styles.staffEvidenceThumb}
                                  resizeMode="cover"
                                />
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      ) : null}
                    </View>
                  );
                })
              )}
            </View>
          </View>

          {/* Processing Timeline */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.orangeIndicator} />
              <Text style={styles.cardTitle}>TIẾN TRÌNH XỬ LÝ HỒ SƠ</Text>
            </View>
            <View style={styles.timelineBody}>
              {timeline.map((step, i) => (
                <View key={step.key} style={styles.timelineRow}>
                  <View style={styles.connectorCol}>
                    <View
                      style={[
                        styles.timelineCircle,
                        step.done
                          ? styles.timelineCircleDone
                          : styles.timelineCirclePending,
                      ]}
                    >
                      {step.done ? (
                        <Ionicons name="checkmark" size={14} color="#ffffff" />
                      ) : (
                        <View style={styles.pendingDot} />
                      )}
                    </View>
                    {i < timeline.length - 1 ? (
                      <View
                        style={[
                          styles.timelineLine,
                          step.done
                            ? styles.timelineLineDone
                            : styles.timelineLinePending,
                        ]}
                      />
                    ) : null}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text
                      style={[
                        styles.timelineStepLabel,
                        step.active
                          ? { color: '#ea580c' }
                          : step.done
                          ? { color: '#0f172a' }
                          : { color: '#94a3b8' },
                      ]}
                    >
                      {step.label}
                    </Text>
                    <Text
                      style={[
                        styles.timelineStepDesc,
                        step.done ? { color: '#64748b' } : { color: '#94a3b8' },
                      ]}
                    >
                      {step.desc}
                    </Text>
                    {step.active ? (
                      <View style={styles.activeTag}>
                        <View style={styles.activePulseDot} />
                        <Text style={styles.activeTagText}>Đang tiến hành</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* FULLSCREEN IMAGE MODAL */}
      <Modal
        visible={Boolean(fullscreenImage)}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenImage(null)}
      >
        <View style={styles.fullscreenModalBackdrop}>
          <TouchableOpacity
            style={styles.fullscreenCloseBtn}
            onPress={() => setFullscreenImage(null)}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
          {fullscreenImage && (
            <Image
              source={{ uri: fullscreenImage }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* MODAL CHỤP ẢNH BẰNG CHỨNG ĐÓNG DẤU NGÀY GIỜ & ĐỊA CHỈ (DÀNH CHO STAFF) */}
      <EvidenceStampModal
        visible={evidenceModalVisible}
        onClose={() => setEvidenceModalVisible(false)}
        ticketId={ticketData?.id || ticket.id}
        ticketAddress={ticketData?.address || ticket.address}
        ticketLat={ticketData?.latitude}
        ticketLng={ticketData?.longitude}
        staffName={authUser?.fullName}
        steps={myStaffSteps.length > 0 ? myStaffSteps : staffSteps}
        initialStepId={evidenceTargetStepId}
        onSuccess={handleEvidenceUploaded}
      />

      {/* MODAL GỬI YÊU CẦU / BÁO CÁO TỚI QUẢN LÝ */}
      <Modal
        visible={requestModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRequestModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.requestModalCard}>
            <View style={styles.requestModalHeader}>
              <View style={styles.requestModalHeaderLeft}>
                <Ionicons name="paper-plane" size={18} color="#ea580c" />
                <Text style={styles.requestModalTitle}>Báo cáo / Yêu cầu Quản lý</Text>
              </View>
              <TouchableOpacity
                onPress={() => setRequestModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 10, marginTop: 8 }}>
              <Text style={styles.modalFieldLabel}>Tiêu đề yêu cầu</Text>
              <TextInput
                style={[styles.feedbackInput, { minHeight: 44 }]}
                value={requestTitle}
                onChangeText={setRequestTitle}
                placeholder="Nhập tiêu đề báo cáo..."
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.modalFieldLabel}>Nội dung chi tiết</Text>
              <TextInput
                style={styles.feedbackInput}
                multiline
                numberOfLines={4}
                value={requestContent}
                onChangeText={setRequestContent}
                placeholder="Mô tả vướng mắc hoặc yêu cầu hỗ trợ tại hiện trường..."
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRequestModalVisible(false)}
                disabled={submittingRequest}
              >
                <Text style={styles.modalCancelBtnText}>HỦY</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSubmitStaffRequest}
                disabled={submittingRequest}
              >
                {submittingRequest ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>GỬI QUẢN LÝ</Text>
                )}
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
  notFoundContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  notFoundText: {
    fontSize: 15,
    color: '#64748b',
  },
  goBackBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  goBackBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ea580c',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
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
  headerTitleCol: {
    flex: 1,
  },
  headerTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  scrollArea: {
    flex: 1,
  },
  contentPadding: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  heroSection: {
    gap: 10,
  },
  heroCard: {
    height: 200,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
    backgroundColor: '#0f172a',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.2)',
  },
  imageCounterBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  imageCounterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  expandHintBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 8,
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailStrip: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  thumbnailItem: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  thumbnailItemActive: {
    borderColor: '#ea580c',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  thumbnailActiveBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(234, 88, 12, 0.2)',
  },
  noImageCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  noImageTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  noImageSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 16,
  },
  noImageMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  severityBadgeInline: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  fullscreenModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 25,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '80%',
  },
  severityBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  severityText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
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
  },
  infoList: {},
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    width: 110,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'right',
    flex: 1,
  },
  descriptionText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
  timelineBody: {
    padding: 16,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
  },
  connectorCol: {
    alignItems: 'center',
  },
  timelineCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineCircleDone: {
    backgroundColor: '#f97316',
  },
  timelineCirclePending: {
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 28,
    marginVertical: 4,
  },
  timelineLineDone: {
    backgroundColor: 'rgba(249, 115, 22, 0.3)',
  },
  timelineLinePending: {
    backgroundColor: '#e2e8f0',
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 20,
  },
  timelineStepLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  timelineStepDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  activePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f97316',
  },
  activeTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ea580c',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  requestModalCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  requestModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  requestModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  feedbackInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#0f172a',
    minHeight: 85,
    marginBottom: 10,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  modalSubmitBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  staffProgressBadge: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  staffProgressBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ea580c',
  },
  staffTopActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  staffPrimaryBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f97316',
    paddingVertical: 11,
    borderRadius: 12,
  },
  staffPrimaryBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.4,
  },
  staffSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingVertical: 11,
    borderRadius: 12,
  },
  staffSecondaryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
  },
  staffEmptyStepsBox: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  staffEmptyStepsText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  staffStepItemCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  staffStepItemActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
  },
  staffStepItemDone: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  staffStepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  staffStepNumBox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  staffStepNumText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  staffStepTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  staffStepAssigneeText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  staffStepStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  staffStepStatusPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  staffReadinessBanner: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  staffReadinessOk: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  staffReadinessWait: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  staffReadinessText: {
    fontSize: 10,
    fontWeight: '700',
  },
  staffStepActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  staffStepBtnStart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f97316',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  staffStepBtnStartText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
  },
  staffStepBtnResolve: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16a34a',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  staffStepBtnResolveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  staffStepBtnCamera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ea580c',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  staffStepBtnCameraText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  staffStepBtnReport: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 10,
  },
  staffStepEvidenceBox: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.25)',
    paddingTop: 8,
    marginTop: 2,
  },
  staffStepEvidenceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  staffEvidenceThumbWrap: {
    width: 86,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  staffEvidenceThumb: {
    width: '100%',
    height: '100%',
  },
});

