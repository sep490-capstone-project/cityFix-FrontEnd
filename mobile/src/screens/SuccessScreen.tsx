import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  resetReport: () => void;
  isUpvote?: boolean;
}

export default function SuccessScreen({ resetReport, isUpvote = false }: Props) {
  const [ticketId] = useState(`CF-${2848 + Math.floor(Math.random() * 12)}`);
  const [countdown, setCountdown] = useState(8);
  const [subscribed, setSubscribed] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          setTimeout(resetReport, 300);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.topAccentBar} />

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        <View style={styles.contentPadding}>
          {/* Hero Celebration Box */}
          <View style={styles.heroBox}>
            <View style={styles.successIconBox}>
              <Ionicons
                name={isUpvote ? 'thumbs-up' : 'checkmark-circle'}
                size={40}
                color="#ffffff"
              />
            </View>

            <Text style={styles.heroTitle}>
              {isUpvote ? 'ĐÃ BÌNH CHỌN!' : 'BÁO CÁO ĐÃ ĐƯỢC GỬI!'}
            </Text>

            <Text style={styles.heroSubText}>
              {isUpvote
                ? 'Cảm ơn bạn đã upvote. Mức độ ưu tiên xử lý sự cố sẽ được tăng lên.'
                : 'Cảm ơn bạn đã góp phần xây dựng thành phố tốt đẹp hơn. Sự cố sẽ được tiếp nhận và xử lý sớm nhất.'}
            </Text>
          </View>

          {/* Ticket Receipt Card */}
          <View style={styles.ticketCard}>
            <View style={styles.ticketHeaderRow}>
              <View>
                <Text style={styles.ticketLabel}>MÃ VÉ SỰ CỐ</Text>
                <Text style={styles.ticketIdText}>{ticketId}</Text>
              </View>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusBadgeText}>ĐÃ KHỞI TẠO</Text>
              </View>
            </View>

            <View style={styles.dashedDivider} />

            <View style={styles.infoGrid}>
              <View style={styles.infoGridItem}>
                <Ionicons name="business-outline" size={14} color="#3b82f6" />
                <Text style={styles.gridLabel}>Cơ quan tiếp nhận</Text>
                <Text style={styles.gridValue}>Phòng Đô thị Q.5</Text>
              </View>

              <View style={styles.infoGridItem}>
                <Ionicons name="time-outline" size={14} color="#eab308" />
                <Text style={styles.gridLabel}>Thời hạn xử lý</Text>
                <Text style={styles.gridValue}>72 giờ</Text>
              </View>

              <View style={styles.infoGridItem}>
                <Ionicons name="construct-outline" size={14} color="#f97316" />
                <Text style={styles.gridLabel}>Loại sự cố</Text>
                <Text style={styles.gridValue}>Ổ gà mặt đường</Text>
              </View>

              <View style={styles.infoGridItem}>
                <Ionicons name="calendar-outline" size={14} color="#8b5cf6" />
                <Text style={styles.gridLabel}>Thời gian gửi</Text>
                <Text style={styles.gridValue}>
                  {new Date().toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          </View>

          {/* Notification Subscribe Switch */}
          <View style={styles.subscribeCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.subTitle}>Nhận thông báo cập nhật</Text>
              <Text style={styles.subText}>
                Theo dõi tiến trình xử lý vé {ticketId}
              </Text>
            </View>
            <Switch
              value={subscribed}
              onValueChange={setSubscribed}
              trackColor={{ false: '#cbd5e1', true: '#f97316' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>
      </ScrollView>

      {/* Actions Footer */}
      <View style={styles.footerContainer}>
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={resetReport}
          activeOpacity={0.85}
        >
          <Ionicons name="home" size={18} color="#ffffff" />
          <Text style={styles.homeBtnText}>
            VỀ TRANG CHỦ {countdown > 0 ? `(${countdown}s)` : ''}
          </Text>
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
  scrollArea: {
    flex: 1,
  },
  contentPadding: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 16,
  },

  /* Hero Celebration Box */
  heroBox: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  successIconBox: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 6,
  },
  heroSubText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },

  /* Ticket Receipt Card */
  ticketCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  ticketHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ticketLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  ticketIdText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ea580c',
    letterSpacing: 1,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#16a34a',
  },
  dashedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoGridItem: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  gridLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  gridValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },

  /* Subscribe Card */
  subscribeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
  },
  subTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  subText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
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
  homeBtn: {
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
  homeBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
});
