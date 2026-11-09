import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ChatMessage,
  QUICK_SUGGESTIONS,
  askCityFixAssistant,
} from '../../api/chatAssistant';

interface Props {
  visible: boolean;
  onClose: () => void;
  navigate: (screen: string) => void;
  userName?: string;
}

function getNowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function ResidentChatModal({
  visible,
  onClose,
  navigate,
  userName,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text:
        `Xin chào ${userName || 'bạn'}! 👋 Tôi là **Trợ lý AI CityFix** dành cho Người dân.\n\n` +
        'Bạn có thể hỏi tôi về:\n' +
        '• **Quy trình 5 bước tạo báo cáo** sự cố trên bản đồ\n' +
        '• **Cách theo dõi tiến độ**, xem ảnh bằng chứng & đánh giá sao\n' +
        '• **Cách tự xử lý an toàn các sự cố nhỏ** mà không cần gửi báo cáo\n\n' +
        '*(Lưu ý: Tôi chỉ trả lời các câu hỏi liên quan đến hệ thống CityFix và sự cố đô thị)*',
      timestamp: getNowTime(),
      suggestedAction: null,
    },
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const scrollViewRef = useRef<any>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 120);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const cleanText = (textToSend ?? inputText).trim();
    if (!cleanText || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: cleanText,
      timestamp: getNowTime(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!textToSend) {
      setInputText('');
    }
    setLoading(true);
    scrollToBottom();

    try {
      const res = await askCityFixAssistant(nextHistory, cleanText);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: res.reply,
        timestamp: getNowTime(),
        isBlocked: res.isBlocked,
        suggestedAction: res.suggestedAction,
        sourceLabel: res.sourceLabel,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: 'Xin lỗi, kết nối tạm thời gián đoạn. Vui lòng thử lại sau giây lát.',
          timestamp: getNowTime(),
        },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const handleQuickNavigate = (targetScreen: string) => {
    onClose();
    navigate(targetScreen);
  };

  const handleResetChat = () => {
    setLoading(false);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text:
          `Đã làm mới cuộc trò chuyện! Bạn cần tìm hiểu về **quy trình báo cáo**, **theo dõi vé**, hay **cách tự xử lý sự cố nhỏ** trên CityFix?`,
        timestamp: getNowTime(),
        suggestedAction: null,
      },
    ]);
  };

  // Render text có in đậm cơ bản (**text**)
  const renderFormattedText = (rawText: string, isUser: boolean) => {
    const parts = rawText.split(/(\*\*.*?\*\*)/g);
    return (
      <Text style={[styles.msgText, isUser ? styles.msgTextUser : styles.msgTextBot]}>
        {parts.map((part, idx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <Text
                key={idx}
                style={{
                  fontWeight: '800',
                  color: isUser ? '#ffffff' : '#0f172a',
                }}
              >
                {part.slice(2, -2)}
              </Text>
            );
          }
          return <Text key={idx}>{part}</Text>;
        })}
      </Text>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.chatContainer}>
          <View style={styles.topAccentBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.botAvatarHeader}>
                <Ionicons name="sparkles" size={18} color="#ffffff" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.headerTitle}>Trợ lý AI CityFix</Text>
                </View>
                <Text style={styles.headerSub} numberOfLines={1}>
                  Hướng dẫn báo cáo, theo dõi & xử lý sự cố nhỏ
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={handleResetChat}
                activeOpacity={0.75}
              >
                <Ionicons name="refresh-outline" size={18} color="#64748b" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={onClose}
                activeOpacity={0.75}
              >
                <Ionicons name="close" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Suggestion Chips */}
          <View style={styles.suggestionsBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsScroll}
            >
              {QUICK_SUGGESTIONS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.suggestionChip}
                  onPress={() => handleSendMessage(item.prompt)}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.suggestionChipText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Chat Messages Area */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesScroll}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
          >
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageRow,
                    isUser ? styles.messageRowUser : styles.messageRowBot,
                  ]}
                >
                  {!isUser && (
                    <View
                      style={[
                        styles.botAvatarSmall,
                        msg.isBlocked && { backgroundColor: '#ef4444' },
                      ]}
                    >
                      <Ionicons
                        name={msg.isBlocked ? 'shield-outline' : 'sparkles'}
                        size={13}
                        color="#ffffff"
                      />
                    </View>
                  )}

                  <View
                    style={[
                      styles.messageBubble,
                      isUser
                        ? styles.bubbleUser
                        : msg.isBlocked
                        ? styles.bubbleBlocked
                        : styles.bubbleBot,
                    ]}
                  >
                    {/* Nhãn cảnh báo nếu câu hỏi ngoài luồng bị chặn */}
                    {msg.isBlocked && (
                      <View style={styles.blockedTagRow}>
                        <Ionicons name="ban-outline" size={13} color="#dc2626" />
                        <Text style={styles.blockedTagText}>
                          CÂU HỎI NGOÀI PHẠM VI HỆ THỐNG CITYFIX
                        </Text>
                      </View>
                    )}

                    {renderFormattedText(msg.text, isUser)}

                    {/* Nút điều hướng nhanh (CTA) ngay dưới câu trả lời của Bot */}
                    {!isUser && msg.suggestedAction === 'report' && (
                      <TouchableOpacity
                        style={styles.inlineActionBtn}
                        onPress={() => handleQuickNavigate('location')}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="add-circle-outline" size={15} color="#ffffff" />
                        <Text style={styles.inlineActionBtnText}>
                          MỞ BẢN ĐỒ TẠO BÁO CÁO NGAY
                        </Text>
                      </TouchableOpacity>
                    )}

                    {!isUser && msg.suggestedAction === 'my-reports' && (
                      <TouchableOpacity
                        style={styles.inlineActionBtnSecondary}
                        onPress={() => handleQuickNavigate('my-reports')}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="document-text-outline" size={15} color="#ea580c" />
                        <Text style={styles.inlineActionBtnSecondaryText}>
                          XEM DANH SÁCH BÁO CÁO CỦA TÔI
                        </Text>
                      </TouchableOpacity>
                    )}

                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: isUser ? 'flex-end' : 'space-between',
                        marginTop: 6,
                        gap: 8,
                      }}
                    >
                      {!isUser && msg.sourceLabel ? (
                        <Text
                          style={{
                            fontSize: 10.5,
                            fontWeight: '600',
                            color: msg.sourceLabel.startsWith('🟢') ? '#16a34a' : '#d97706',
                            flex: 1,
                          }}
                        >
                          {msg.sourceLabel}
                        </Text>
                      ) : null}
                      <Text
                        style={[
                          styles.msgTime,
                          { marginTop: 0 },
                          isUser ? { color: 'rgba(255,255,255,0.75)' } : { color: '#94a3b8' },
                        ]}
                      >
                        {msg.timestamp}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}

            {loading && (
              <View style={[styles.messageRow, styles.messageRowBot]}>
                <View style={styles.botAvatarSmall}>
                  <Ionicons name="sparkles" size={13} color="#ffffff" />
                </View>
                <View style={styles.typingBubble}>
                  <ActivityIndicator size="small" color="#f97316" />
                  <Text style={styles.typingText}>Trợ lý CityFix đang trả lời...</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input Box */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              placeholder="Hỏi về cách báo cáo, theo dõi vé hoặc xử lý sự cố nhỏ..."
              placeholderTextColor="#94a3b8"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={400}
              onSubmitEditing={() => handleSendMessage()}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!inputText.trim() || loading) && styles.sendBtnDisabled,
              ]}
              onPress={() => handleSendMessage()}
              disabled={!inputText.trim() || loading}
              activeOpacity={0.85}
            >
              <Ionicons name="send" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  chatContainer: {
    height: '88%',
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  topAccentBar: {
    height: 4,
    backgroundColor: '#f97316',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  botAvatarHeader: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  guardrailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  guardrailBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#16a34a',
  },
  headerSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionsBar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 10,
  },
  suggestionsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  suggestionChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowBot: {
    justifyContent: 'flex-start',
  },
  botAvatarSmall: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: '#f97316',
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderBottomLeftRadius: 4,
  },
  bubbleBlocked: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderBottomLeftRadius: 4,
  },
  blockedTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
  },
  blockedTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#dc2626',
    letterSpacing: 0.4,
  },
  msgText: {
    fontSize: 13,
    lineHeight: 20,
  },
  msgTextUser: {
    color: '#ffffff',
  },
  msgTextBot: {
    color: '#1e293b',
  },
  msgTime: {
    fontSize: 9,
    marginTop: 5,
    textAlign: 'right',
  },
  inlineActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f97316',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  inlineActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.4,
  },
  inlineActionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fdba74',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  inlineActionBtnSecondaryText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
    letterSpacing: 0.4,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  typingText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    maxHeight: 90,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
});
