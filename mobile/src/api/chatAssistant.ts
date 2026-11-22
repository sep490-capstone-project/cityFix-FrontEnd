import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.cityfix.cloud'
).replace(/\/+$/, '');

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isBlocked?: boolean;
  suggestedAction?: 'report' | 'my-reports' | null;
  sourceLabel?: string;
}

export interface AssistantResponse {
  reply: string;
  isBlocked?: boolean;
  suggestedAction?: 'report' | 'my-reports' | null;
  sourceLabel?: string;
}

export const QUICK_SUGGESTIONS: Array<{ id: string; label: string; prompt: string }> = [
  {
    id: 'report-flow',
    label: '📋 Quy trình báo cáo sự cố',
    prompt: 'Quy trình báo cáo sự cố trên ứng dụng CityFix gồm những bước nào?',
  },
  {
    id: 'track-flow',
    label: '🔍 Cách theo dõi tiến độ',
    prompt: 'Làm sao để theo dõi tiến độ xử lý báo cáo và xem bằng chứng khắc phục?',
  },
  {
    id: 'minor-fix',
    label: '🛠️ Sự cố nhỏ tự xử lý tại chỗ',
    prompt: 'Nếu gặp các sự cố nhỏ trước nhà thì tự xử lý thế nào mà không cần gửi báo cáo?',
  },
  {
    id: 'duplicate-upvote',
    label: '👍 Upvote vé trùng lặp 50m',
    prompt: 'Tính năng phát hiện sự cố trùng lặp trong bán kính 50m và Upvote hoạt động thế nào?',
  },
  {
    id: 'cancel-rate',
    label: '⭐ Hủy vé & Đánh giá sao',
    prompt: 'Khi nào tôi có thể hủy vé phản ánh và khi nào được đánh giá sao kết quả xử lý?',
  },
];

let cachedWorkingModel: string | null = null;
let cachedServerPrompt: string | null = null;
let lastPromptFetchTs = 0;
const PROMPT_CACHE_TTL_MS = 60 * 1000; // Làm mới mỗi 60 giây từ Backend

function detectSuggestedAction(
  userText: string,
  replyText: string
): 'report' | 'my-reports' | null {
  const combined = `${userText} ${replyText}`.toLowerCase();
  if (
    combined.includes('theo dõi') ||
    combined.includes('báo cáo của tôi') ||
    combined.includes('xem vé') ||
    combined.includes('tiến độ') ||
    combined.includes('đánh giá') ||
    combined.includes('hủy vé')
  ) {
    return 'my-reports';
  }
  if (
    combined.includes('quy trình báo cáo') ||
    combined.includes('tạo báo cáo') ||
    combined.includes('khẩn cấp')
  ) {
    return 'report';
  }
  return null;
}

/**
 * Lấy nội dung AI Prompt mới nhất do Admin quản lý qua GET /api/v1/ai-prompts/latest
 */
export async function getEffectiveSystemPrompt(): Promise<string> {
  const now = Date.now();
  if (cachedServerPrompt && now - lastPromptFetchTs < PROMPT_CACHE_TTL_MS) {
    return cachedServerPrompt;
  }

  try {
    const token = await AsyncStorage.getItem('accessToken');
    const res = await fetch(`${API_BASE_URL}/api/v1/ai-prompts/latest`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (res.ok) {
      const payload = await res.json();
      const serverContent = payload?.data?.content?.trim();
      if (serverContent) {
        cachedServerPrompt = serverContent;
        lastPromptFetchTs = now;
        return serverContent;
      }
    }
  } catch (err) {
    console.warn('⚠️ Không tải được AI Prompt từ Backend:', err);
  }

  return (
    cachedServerPrompt ||
    'Bạn là Trợ lý ảo CityFix hỗ trợ người dân báo cáo và theo dõi xử lý sự cố hạ tầng đô thị. Hãy trả lời ngắn gọn bằng tiếng Việt.'
  );
}

/**
 * Gửi câu hỏi của người dân kèm System Prompt lấy từ Admin Backend sang mô hình AI
 */
export async function askCityFixAssistant(
  history: ChatMessage[],
  userMessage: string
): Promise<AssistantResponse> {
  const rawKey = (
    process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
    process.env.EXPO_PUBLIC_OPENAI_API_KEY ||
    process.env.EXPO_PUBLIC_AI_API_KEY ||
    ''
  ).trim();

  if (!rawKey || rawKey === 'your_api_key_here') {
    return {
      reply: 'Hệ thống Trợ lý AI hiện chưa được cấu hình khóa kết nối (API Key). Vui lòng thử lại sau.',
      isBlocked: false,
      suggestedAction: null,
    };
  }

  const activeSystemPrompt = await getEffectiveSystemPrompt();

  try {
    // 1. OpenAI / Groq API Key
    if (rawKey.startsWith('sk-') || rawKey.startsWith('gsk_')) {
      const isGroq = rawKey.startsWith('gsk_');
      const endpoint = isGroq
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';
      const model = isGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';

      const recentMessages = history
        .filter((m) => m.id !== 'welcome-msg')
        .slice(-6)
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        }));

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${rawKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 600,
          messages: [
            { role: 'system', content: activeSystemPrompt },
            ...recentMessages,
            { role: 'user', content: userMessage },
          ],
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const replyText = data?.choices?.[0]?.message?.content?.trim();
      if (!replyText) {
        throw new Error('Không nhận được phản hồi từ AI');
      }

      const isRefusal = replyText.includes('nằm ngoài phạm vi');
      return {
        reply: replyText,
        isBlocked: isRefusal,
        suggestedAction: isRefusal ? null : detectSuggestedAction(userMessage, replyText),
        sourceLabel: '🟢 Trợ lý AI CityFix',
      };
    }

    // 2. Google Gemini API Key
    const filteredHistory = history.filter((m) => m.id !== 'welcome-msg').slice(-4);
    const historyTranscript = filteredHistory
      .map((m) => `${m.sender === 'user' ? 'Người dân' : 'Trợ lý CityFix'}: ${m.text}`)
      .join('\n\n');

    const fullPrompt = historyTranscript
      ? `${activeSystemPrompt}\n\n=== HỘI THOẠI GẦN ĐÂY ===\n${historyTranscript}\n\n=== CÂU HỎI MỚI ===\n${userMessage}`
      : `${activeSystemPrompt}\n\n=== CÂU HỎI CỦA NGƯỜI DÂN ===\n${userMessage}`;

    const callGeminiModel = async (modelName: string): Promise<string> => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': rawKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const rawParts: any[] = data?.candidates?.[0]?.content?.parts || [];
      const text = rawParts
        .filter((p) => !p?.thought && typeof p?.text === 'string')
        .map((p) => p.text)
        .join('\n')
        .trim();

      if (!text) {
        throw new Error('Empty response');
      }
      return text;
    };

    const discoverAndCallGemini = async (): Promise<string> => {
      if (cachedWorkingModel) {
        try {
          return await callGeminiModel(cachedWorkingModel);
        } catch {
          cachedWorkingModel = null;
        }
      }

      let candidates = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];
      try {
        const listRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
          method: 'GET',
          headers: { 'X-goog-api-key': rawKey },
        });
        if (listRes.ok) {
          const listData = await listRes.json();
          const flashModels = (listData?.models || [])
            .filter(
              (m: any) =>
                Array.isArray(m?.supportedGenerationMethods) &&
                m.supportedGenerationMethods.includes('generateContent') &&
                typeof m?.name === 'string' &&
                m.name.includes('gemini') &&
                m.name.includes('flash') &&
                !m.name.includes('tts') &&
                !m.name.includes('image')
            )
            .map((m: any) => String(m.name).replace(/^models\//, ''));
          if (flashModels.length > 0) {
            candidates = flashModels.slice(0, 5);
          }
        }
      } catch {
        // Sử dụng danh sách candidates mặc định
      }

      for (const modelId of candidates) {
        try {
          const answer = await callGeminiModel(modelId);
          cachedWorkingModel = modelId;
          return answer;
        } catch {
          // Thử model tiếp theo
        }
      }

      throw new Error('Không thể kết nối đến mô hình AI lúc này');
    };

    const replyText = await discoverAndCallGemini();
    const isRefusal = replyText.includes('nằm ngoài phạm vi');

    return {
      reply: replyText,
      isBlocked: isRefusal,
      suggestedAction: isRefusal ? null : detectSuggestedAction(userMessage, replyText),
      sourceLabel: '🟢 Trợ lý AI CityFix',
    };
  } catch (err: any) {
    console.warn('⚠️ Lỗi gọi AI Assistant:', err?.message);
    return {
      reply: 'Xin lỗi, dịch vụ Trợ lý AI hiện đang bận hoặc gián đoạn kết nối. Vui lòng thử lại sau giây lát.',
      isBlocked: false,
      suggestedAction: null,
    };
  }
}
