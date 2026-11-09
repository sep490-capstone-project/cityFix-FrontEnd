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

const OFF_TOPIC_REFUSAL_MESSAGE =
  '⚠️ **Câu hỏi của bạn nằm ngoài phạm vi hỗ trợ của hệ thống CityFix.**\n\n' +
  'Xin phép bạn vui lòng đặt lại câu hỏi liên quan đến:\n' +
  '• **Quy trình báo cáo & Upvote sự cố** trên ứng dụng\n' +
  '• **Cách theo dõi tiến độ xử lý, hủy vé & đánh giá sao**\n' +
  '• **Hướng dẫn tự xử lý an toàn các sự cố nhỏ** tại khu dân cư';

/**
 * LỚP 1: Bộ lọc chặn sớm trên Client (Client-side Guardrail)
 * Chặn mọi câu hỏi nằm ngoài phạm vi hệ thống CityFix (kể cả câu ngắn 1-3 từ)
 * giúp tiết kiệm 100% quota API Key và phản hồi đúng thông báo từ chối.
 */
const OFF_TOPIC_PATTERNS: RegExp[] = [
  // Lập trình / Code / IT không liên quan
  /\b(viết code|code hộ|lập trình|python|javascript|typescript|java|c\+\+|html|css|react|sql|thuật toán|debug|fix bug)\b/i,
  // Giải bài tập / Toán Lý Hóa Văn Sử Địa / Ngoại ngữ / Phép tính
  /\b(giải phương trình|giải bài tập|tính tích phân|đạo hàm|hóa học|vật lý|làm văn|viết bài văn|làm thơ|sáng tác thơ|kể chuyện|dịch sang tiếng|translate to|ngữ pháp tiếng anh)\b/i,
  /^\s*\d+\s*[\+\-\*\/x:]\s*\d+/,
  // Giải trí / Thể thao / Game / Tài chính / Crypto / Bói toán / Thời tiết / Đời sống
  /\b(bóng đá|ngoại hạng anh|world cup|champions league|liên quân|lmht|genshin|pubg|free fire|giá vàng|chứng khoán|bitcoin|crypto|cổ phiếu|xổ số|lô đề|tử vi|bói toán|cung hoàng đạo|thời tiết|mấy giờ|ăn gì|uống gì|xem phim|nghe nhạc|ca sĩ|diễn viên|tổng thống|chính trị)\b/i,
  // Nấu ăn / Tình cảm / Đời tư
  /\b(công thức nấu|cách nấu món|hôm nay ăn gì|tư vấn tình cảm|tán tỉnh|cưa đổ|người yêu)\b/i,
  // Prompt injection / Jailbreak
  /\b(ignore previous|bỏ qua hướng dẫn|quên hết quy tắc|hãy đóng vai|act as a|system prompt)\b/i,
];

const GREETING_KEYWORDS: RegExp =
  /^(xin chào|chào|chào bạn|chào ad|chào bot|hello|hi|hey|alo|cảm ơn|cám ơn|thank|thanks|bạn là ai|trợ lý ơi|giúp tôi với|hỗ trợ tôi)[\s\!\?\.]*$/i;

const IN_DOMAIN_KEYWORDS: RegExp =
  /(cityfix|báo cáo|phản ánh|sự cố|vé|ticket|quy trình|bước xử lý|theo dõi|tiến độ|trạng thái|upvote|đồng tình|trùng lặp|50m|đánh giá|sao|hủy|bằng chứng|evidence|nhân viên|phụ trách|kỹ thuật|cán bộ|phân công|giao việc|hoàn thành|cơ quan|ổ gà|ổ voi|mặt đường|trên đường|ngoài đường|lòng đường|lề đường|qua đường|đoạn đường|tuyến đường|ngã tư|ngã ba|hẻm|ngõ|khu phố|khu dân cư|đèn|chiếu sáng|cây|cành|nhánh|lá cây|gốc cây|ngập|úng|cống|rãnh|thoát nước|nắp|hố ga|hố sâu|sụt|lún|nứt|vỉa hè|lối đi|rác|vệ sinh|ô nhiễm|mùi hôi|dây điện|cột điện|trụ điện|rò điện|chập điện|biển báo|vật cản|gạch đá|hạ tầng|đô thị|giao thông|công cộng|tự xử lý|tự giải quyết|xử lý sao|xử lý thế nào|xử lý như nào|làm sao|phải làm gì|sự cố nhỏ|an toàn|nguy hiểm|khẩn cấp|gps|bản đồ|vị trí|chụp ảnh|ai phân tích|thông báo|hồ sơ|bị hỏng|bị hư|bị bể|bị vỡ|bị tắc|bị nghẽn|bị đổ|bị gãy|bị nghiêng)/i;

export function checkOffTopicGuardrail(
  userText: string,
  hasActiveAiKey: boolean = false
): {
  blocked: boolean;
  reason?: string;
} {
  const normalized = userText.trim().toLowerCase();
  if (!normalized) {
    return { blocked: false };
  }

  // 1. Nếu khớp trực tiếp với mẫu câu ngoài luồng rõ ràng (code, toán, thơ, bóng đá, ăn uống, thời tiết, phép tính...)
  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (pattern.test(normalized)) {
      return { blocked: true, reason: OFF_TOPIC_REFUSAL_MESSAGE };
    }
  }

  // 2. Nếu là câu chào hỏi xã giao ngắn gọn -> Cho phép
  if (GREETING_KEYWORDS.test(normalized)) {
    return { blocked: false };
  }

  // 3. Nếu ĐÃ CÓ Gemini API Key hoạt động -> Để chính mô hình AI Gemini phân tích ngữ cảnh tự nhiên và tự chặn nếu ngoài phạm vi!
  // Chỉ dùng regex IN_DOMAIN_KEYWORDS cứng khi chạy chế độ Offline / không có API Key.
  if (!hasActiveAiKey && !IN_DOMAIN_KEYWORDS.test(normalized)) {
    return { blocked: true, reason: OFF_TOPIC_REFUSAL_MESSAGE };
  }

  return { blocked: false };
}

/**
 * LỚP 2: System Prompt chuyên biệt kèm Rào chắn cứng (Strict Domain Guardrail) cho AI API
 */
export const CITYFIX_SYSTEM_PROMPT = `
Bạn là "Trợ lý ảo CityFix" trên ứng dụng di động dành cho Người dân.
QUY TẮC BẮT BUỘC:
1. Chỉ trả lời các câu hỏi về: (A) Quy trình 5 bước tạo báo cáo sự cố & Upvote vé trùng 50m trên CityFix; (B) Cách xem lại vé ở tab "Báo cáo" ("Báo cáo của tôi" & "Vé đã upvote"), tiến trình 3 bước, quy trình 4 bước của Nhân viên hiện trường (Nhận việc ASSIGNED -> Xử lý từng bước IN_PROGRESS -> Chụp ảnh bằng chứng đóng dấu GPS/Ngày giờ -> Hoàn thành COMPLETED), hủy vé (chỉ khi ở trạng thái INITIATED) và đánh giá 1-5 sao; (C) Tư vấn xử lý sự cố nhỏ tại chỗ không cần báo cáo (nhánh cây nhỏ không vướng điện, rác/lá cây nhỏ che mặt cống khi trời tạnh, đèn sân nhà riêng) vs sự cố nguy hiểm bắt buộc báo cáo CityFix (đèn đường công cộng hỏng/rò điện, cây lớn đổ/đè người -> gọi 114/115 ngay, ổ gà, mất nắp cống, ngập úng).
2. Nếu câu hỏi KHÔNG liên quan đến CityFix hoặc sự cố đô thị, BẮT BUỘC chỉ trả lời đúng câu sau:
"${OFF_TOPIC_REFUSAL_MESSAGE}"
Trả lời tiếng Việt ngắn gọn, gạch đầu dòng rõ ràng.
`.trim();

function detectSuggestedAction(userText: string, replyText: string): 'report' | 'my-reports' | null {
  const combined = `${userText} ${replyText}`.toLowerCase();
  if (
    combined.includes('theo dõi') ||
    combined.includes('báo cáo của tôi') ||
    combined.includes('xem ticket') ||
    combined.includes('xem vé') ||
    combined.includes('xem báo cáo') ||
    combined.includes('xem ở đâu') ||
    combined.includes('tiến độ') ||
    combined.includes('đánh giá') ||
    combined.includes('hủy vé')
  ) {
    return 'my-reports';
  }
  if (
    combined.includes('quy trình báo cáo') ||
    combined.includes('tạo báo cáo') ||
    combined.includes('bước 1') ||
    combined.includes('khẩn cấp') ||
    combined.includes('nguy hiểm')
  ) {
    return 'report';
  }
  return null;
}

/**
 * Bộ trả lời thông minh nội bộ (Built-in Knowledge Base)
 * Đảm bảo trả lời chuẩn xác ngay cả khi chưa gắn API Key hoặc mất kết nối mạng.
 */
function getBuiltInCityFixAnswer(userText: string): AssistantResponse {
  const lower = userText.trim().toLowerCase();

  // Nếu câu hỏi hoàn toàn không chứa từ khóa liên quan đến CityFix / sự cố đô thị -> Chặn ngoài phạm vi
  if (!GREETING_KEYWORDS.test(lower) && !IN_DOMAIN_KEYWORDS.test(lower)) {
    return {
      reply: OFF_TOPIC_REFUSAL_MESSAGE,
      isBlocked: true,
      suggestedAction: null,
    };
  }

  // 1. Chào hỏi / giới thiệu
  if (/^(xin chào|chào|hello|hi|bạn là ai|trợ lý|giúp tôi)/i.test(lower) && lower.length < 35) {
    return {
      reply:
        'Xin chào! Tôi là **Trợ lý ảo CityFix** dành cho Người dân 👋.\n\n' +
        'Tôi có thể giúp bạn giải đáp nhanh về:\n' +
        '• **Quy trình 5 bước báo cáo sự cố** trên bản đồ\n' +
        '• **Cách theo dõi tiến độ, xem ảnh bằng chứng & đánh giá sao**\n' +
        '• **Mẹo tự xử lý an toàn các sự cố nhỏ** tại khu phố mà không cần gửi báo cáo\n\n' +
        'Bạn đang thắc mắc về vấn đề nào?',
      suggestedAction: null,
    };
  }

  // Thu thập tất cả các ý trong câu hỏi của người dân (Hỗ trợ câu hỏi ghép nhiều tình huống + hỏi quy trình cùng lúc)
  const sections: string[] = [];
  let suggestedAction: 'report' | 'my-reports' | null = null;

  const hasTree = lower.includes('cây') || lower.includes('cành') || lower.includes('nhánh');
  const hasLightOrElectric =
    lower.includes('đèn') ||
    lower.includes('dây điện') ||
    lower.includes('cột điện') ||
    lower.includes('trụ điện') ||
    lower.includes('rò điện') ||
    lower.includes('chập điện') ||
    lower.includes('chiếu sáng');
  const hasTrash =
    lower.includes('rác') ||
    lower.includes('bịch') ||
    lower.includes('bao tải') ||
    lower.includes('vệ sinh') ||
    lower.includes('mùi hôi') ||
    lower.includes('bẩn');
  const hasDrainOrFlood =
    lower.includes('ngập') ||
    lower.includes('úng') ||
    lower.includes('cống') ||
    lower.includes('thoát nước') ||
    lower.includes('hố ga') ||
    lower.includes('nắp');
  const hasRoadOrPothole =
    lower.includes('ổ gà') ||
    lower.includes('ổ voi') ||
    lower.includes('mặt đường') ||
    lower.includes('sụt') ||
    lower.includes('lún') ||
    lower.includes('vỉa hè') ||
    lower.includes('vật cản') ||
    lower.includes('gạch đá');

  const hasSpecificIncident =
    hasTree || hasLightOrElectric || hasTrash || hasDrainOrFlood || hasRoadOrPothole;

  const hasLifeThreat =
    lower.includes('đè') ||
    lower.includes('bị thương') ||
    lower.includes('tai nạn') ||
    lower.includes('điện giật') ||
    lower.includes('bất tỉnh') ||
    lower.includes('chảy máu') ||
    lower.includes('mắc kẹt') ||
    lower.includes('cứu');

  if (hasLifeThreat) {
    sections.push(
      '🚨 **KHẨN CẤP — SỰ CỐ ĐE DỌA TÍNH MẠNG CON NGƯỜI:**\n\n' +
        '1. **Gọi cứu hộ khẩn cấp ngay lập tức:**\n' +
        '   • Gọi ngay **114** (Cứu nạn cứu hộ) và **115** (Cấp cứu y tế), đồng thời hô hoán người xung quanh cảnh báo giao thông từ xa.\n' +
        '2. **Đảm bảo an toàn hiện trường (Tuyệt đối lưu ý):**\n' +
        '   • Quan sát kỹ xem cây đổ có kéo đứt **dây điện** hoặc cành cây đang còn tiếp tục gãy hay không trước khi lại gần.\n' +
        '3. **Gửi báo cáo khẩn cấp trên CityFix:**\n' +
        '   • Bấm **"Tạo báo cáo mới"** kèm ảnh hiện trường & GPS để hệ thống bật cảnh báo đỏ **Nguy hiểm tính mạng (`CRITICAL / Life-Threatening`)** điều phối lực lượng ứng cứu ngay!'
    );
    suggestedAction = 'report';
  }

  // A. Tư vấn từng tình huống sự cố cụ thể nếu người dân nêu trong câu hỏi
  if (hasTree && !hasLifeThreat) {
    sections.push(
      '🌳 **Về nhánh cây / cành cây bị gãy:**\n' +
        '• **Trường hợp tự dọn được (Không cần báo cáo):** Nếu chỉ là nhánh cây nhỏ hoặc vừa (như cỡ cổ tay rơi chắn trước cổng/lề đường) và **không vướng dây điện**, bạn hãy quan sát kỹ xe cộ rồi chủ động kéo gọn vào sát lề hoặc thu dọn luôn để lối đi thông thoáng.\n' +
        '• **Trường hợp cần báo cáo CityFix:** Nếu là cây lớn gãy đổ, bật gốc, chắn ngang đường hoặc vướng vào dây điện thì tuyệt đối không tự kéo dọn mà phải gửi báo cáo ngay.'
    );
    suggestedAction = 'report';
  }

  if (hasLightOrElectric) {
    sections.push(
      '💡 **Về sự cố bóng đèn đường / điện chiếu sáng:**\n' +
        '• **Bóng đèn đường công cộng (đầu hẻm / trên tuyến phố) bị nhấp nháy, chập chờn hoặc tắt:** Đây là tài sản hạ tầng công cộng và tiềm ẩn nguy cơ rò điện trên cao — bạn **tuyệt đối không tự leo lên sửa**, mà **bắt buộc phải tạo báo cáo trên CityFix** (danh mục *Đèn đường*) để kỹ thuật viên chuyên trách đến xử lý.\n' +
        '• *(Chỉ khi là bóng đèn sân vườn/hiên nhà riêng bên trong cổng cá nhân thì hộ gia đình mới tự ngắt cầu dao thay thế)*.'
    );
    suggestedAction = 'report';
  }

  if (hasTrash) {
    sections.push(
      '🗑️ **Về rác thải / bịch rác trên đường:**\n' +
        '• **Tự xử lý nhanh (Không cần báo cáo):** Nếu chỉ là 1 bịch rác sinh hoạt nhỏ buộc kín, vỏ chai hoặc túi nilon ở sát mép đường/vỉa hè và đường vắng an toàn, bạn có thể nhặt bỏ vào thùng rác gần đó để tránh xe máy cán phải gây trượt ngã.\n' +
        '• **Cần tạo báo cáo trên CityFix:** Nếu bịch rác nằm giữa làn xe đông đúc nguy hiểm, bãi rác tự phát lớn, rác cồng kềnh hoặc chứa mảnh vỡ sắc nhọn/hóa chất.'
    );
    suggestedAction = 'report';
  }

  if (hasDrainOrFlood) {
    sections.push(
      '🌧️ **Về thoát nước & ngập úng:**\n' +
        '• **Tự xử lý tại chỗ:** Khi trời đã tạnh ráo, nếu chỉ có lá cây khô hoặc túi nilon nhỏ che mặt song chắn rác trước cửa nhà làm nước rút chậm, bạn có thể dùng chổi/kẹp gắp gọn vào thùng rác.\n' +
        '• **Cần tạo báo cáo ngay:** Nếu nắp cống/hố ga bị bể mất nắp, cống ngầm tắc nghẽn trào ngược hoặc ngập úng diện rộng.'
    );
    suggestedAction = 'report';
  }

  if (hasRoadOrPothole) {
    sections.push(
      '🛣️ **Về mặt đường & vỉa hè:**\n' +
        '• **Tự xử lý tại chỗ:** Nếu chỉ là vài viên gạch/đá vụn nhỏ nằm trên vỉa hè/mép đường và đường vắng an toàn, bạn có thể dọn gọn vào sát lề.\n' +
        '• **Cần tạo báo cáo trên CityFix:** Nếu là ổ gà, ổ voi, sụt lún mặt đường hoặc bong tróc vỉa hè diện rộng (không tự lấp đá rời vì xe cán qua dễ văng gây nguy hiểm).'
    );
    suggestedAction = 'report';
  }

  // B. Nếu người dân hỏi chung về "sự cố nhỏ tự xử lý" mà chưa nêu tên sự cố cụ thể
  if (
    !hasSpecificIncident &&
    (lower.includes('sự cố nhỏ') ||
      lower.includes('không cần báo cáo') ||
      lower.includes('tự xử lý') ||
      lower.includes('tự giải quyết') ||
      lower.includes('tự dọn') ||
      lower.includes('nhỏ lẻ'))
  ) {
    sections.push(
      '🛠️ **Hướng dẫn phân biệt Sự cố nhỏ tự xử lý vs. Sự cố cần báo cáo CityFix:**\n\n' +
        '1. **Các sự cố nhỏ bạn nên tự xử lý tại chỗ (Không cần tạo vé):**\n' +
        '   • Nhánh cây khô nhỏ rơi trước cổng/mép đường (không vướng dây điện).\n' +
        '   • Lá cây, túi nilon nhỏ che mặt song chắn rác trước nhà khi trời đã tạnh.\n' +
        '   • Rác vụn nhỏ hoặc vài viên đá nhỏ trên vỉa hè có thể dọn gọn vào lề an toàn.\n' +
        '   • Bóng đèn, ống nước nằm trong khuôn viên sân nhà cá nhân.\n\n' +
        '2. **Các sự cố BẮT BUỘC phải tạo báo cáo trên CityFix (Không tự xử lý):**\n' +
        '   • Trụ đèn đường đầu hẻm/ngoài phố bị nhấp nháy, tắt hoặc rò điện.\n' +
        '   • Cây lớn gãy đổ, cành cây to chắn đường hoặc vướng dây điện.\n' +
        '   • Ổ gà sâu, sụt lún mặt đường, nắp cống/hố ga bị bể, ngập úng diện rộng.'
    );
    suggestedAction = 'report';
  }

  // C. Quy trình / các bước xử lý của Nhân viên phụ trách (Staff Workflow)
  if (
    lower.includes('nhân viên') ||
    lower.includes('phụ trách') ||
    lower.includes('bước xử lý') ||
    lower.includes('quy trình xử lý') ||
    lower.includes('kỹ thuật') ||
    lower.includes('cán bộ')
  ) {
    sections.push(
      '👷 **Quy trình 4 bước xử lý của Nhân viên phụ trách trên CityFix:**\n' +
        '• **Bước 1 — Tiếp nhận phân công (`ASSIGNED`):** Sau khi Quản lý duyệt ticket, hệ thống giao nhiệm vụ cho nhân viên (hoặc nhóm nhân viên có Trưởng nhóm) kèm thời hạn SLA.\n' +
        '• **Bước 2 — Thực hiện tuần tự các bước quy trình (`IN_PROGRESS`):** Nhân viên bấm *"Bắt đầu xử lý"* và thực hiện lần lượt các bước chuyên môn được giao cho tài khoản của mình theo đúng thứ tự (*Khảo sát & khoanh vùng → Sửa chữa/khắc phục → Dọn dẹp hoàn trả mặt bằng*).\n' +
        '• **Bước 3 — Chụp ảnh bằng chứng có đóng dấu (Evidence Stamp):** Nhân viên chụp ảnh kết quả thực tế tại hiện trường kèm ghi chú; hệ thống tự động đóng dấu **Ngày giờ, Địa chỉ & Tọa độ GPS** lên ảnh.\n' +
        '• **Bước 4 — Hoàn tất Ticket (`COMPLETED`):** Khi tất cả các bước trong quy trình hoàn thành, ticket chuyển sang **Hoàn thành** để bạn xem ảnh bằng chứng & đánh giá 1–5 sao.'
    );
    if (!suggestedAction) suggestedAction = 'my-reports';
  }

  // D. Quy trình tạo báo cáo sự cố (5 bước)
  if (
    lower.includes('quy trình báo cáo') ||
    lower.includes('cách báo cáo') ||
    lower.includes('làm sao để báo cáo') ||
    lower.includes('báo cáo như nào') ||
    lower.includes('báo cáo thế nào') ||
    lower.includes('tạo như thế nào') ||
    lower.includes('tạo như nào') ||
    lower.includes('tạo sao') ||
    lower.includes('tạo báo cáo') ||
    lower.includes('tạo ticket') ||
    lower.includes('tạo vé') ||
    lower.includes('gửi báo cáo') ||
    lower.includes('gửi phản ánh') ||
    lower.includes('mấy bước') ||
    lower.includes('các bước') ||
    (!hasSpecificIncident && lower.includes('quy trình'))
  ) {
    sections.push(
      '📋 **Cách tạo báo cáo sự cố trên CityFix (5 bước):**\n' +
        '• **Bước 1 — Chọn vị trí:** Bấm nút dấu **`+`** ở giữa thanh menu dưới cùng để mở bản đồ và chọn 1 trong 3 cách: *Định vị GPS tự động*, *Chạm chọn trực tiếp trên bản đồ*, hoặc *Nhập địa chỉ thủ công*.\n' +
        '• **Bước 2 — Chụp ảnh hiện trường:** Chụp trực tiếp bằng Camera hoặc tải từ Thư viện (tối đa 5 ảnh rõ nét).\n' +
        '• **Bước 3 — AI phân tích tự động:** AI tự nhận diện danh mục sự cố (Đèn đường, Cây đổ, Ổ gà, Ngập úng...) và mức độ ưu tiên.\n' +
        '• **Bước 4 — Xác nhận & Kiểm tra trùng lặp (50m):** Kiểm tra thông tin, nhập mô tả bổ sung (hoặc bấm **Upvote** nếu đã có vé tương tự trong bán kính 50m).\n' +
        '• **Bước 5 — Hoàn tất:** Gửi báo cáo, nhận mã ticket và theo dõi tiến độ.'
    );
    suggestedAction = 'report';
  }

  // E. Theo dõi tiến độ / Xem ticket ở đâu / Trạng thái vé / Xem bằng chứng
  if (
    lower.includes('theo dõi') ||
    lower.includes('tiến độ') ||
    lower.includes('trạng thái') ||
    lower.includes('xem bằng chứng') ||
    lower.includes('kiểm tra') ||
    lower.includes('bao lâu') ||
    lower.includes('xem ticket') ||
    lower.includes('xem vé') ||
    lower.includes('xem báo cáo') ||
    lower.includes('xem phản ánh') ||
    lower.includes('xem ở đâu') ||
    lower.includes('tìm ticket') ||
    lower.includes('tìm vé') ||
    lower.includes('ticket ở đâu') ||
    lower.includes('vé ở đâu') ||
    lower.includes('báo cáo của tôi') ||
    lower.includes('vé của tôi') ||
    lower.includes('ticket của tôi') ||
    lower.includes('lịch sử') ||
    ((lower.includes('đã báo cáo') || lower.includes('đã gửi') || lower.includes('báo cáo xong')) &&
      (lower.includes('xem') || lower.includes('đâu') || lower.includes('ticket') || lower.includes('vé') || lower.includes('như nào') || lower.includes('thế nào') || lower.includes('sao')))
  ) {
    sections.push(
      '🔍 **Cách xem lại Ticket (Báo cáo) & Theo dõi tiến độ xử lý:**\n' +
        '• **Xem ở đâu?** Bấm vào tab **"Báo cáo"** ở thanh điều hướng dưới cùng màn hình (gồm 2 danh sách: **"Báo cáo của tôi"** và **"Vé đã upvote"**).\n' +
        '• **Xem chi tiết như thế nào?** Chạm vào ticket để xem tiến trình 3 giai đoạn (*Đã tiếp nhận → Đang xử lý → Hoàn thành*). Khi ticket **Hoàn thành**, bấm **"Xem bằng chứng xử lý"** để xem ảnh kết quả của nhân viên (có in chìm Ngày giờ & GPS) và đánh giá 1–5 sao.'
    );
    if (!suggestedAction) suggestedAction = 'my-reports';
  }

  // F. Upvote / trùng lặp 50m
  if (
    lower.includes('upvote') ||
    lower.includes('trùng lặp') ||
    lower.includes('50m') ||
    lower.includes('bình chọn') ||
    lower.includes('ủng hộ')
  ) {
    sections.push(
      '👍 **Cơ chế phát hiện trùng lặp 50m & Upvote:**\n' +
        '• Khi tạo báo cáo, hệ thống tự động quét trong **bán kính 50m** quanh vị trí đó.\n' +
        '• Nếu đã có người dân báo cáo cùng sự cố này, bạn chỉ cần chọn vé đó và bấm **"Upvote"** để tăng mức độ ưu tiên xử lý nhanh hơn và theo dõi trong mục **"Vé đã upvote"**.'
    );
    if (!suggestedAction) suggestedAction = 'my-reports';
  }

  // G. Hủy vé & Đánh giá sao
  if (
    lower.includes('hủy vé') ||
    lower.includes('hủy báo cáo') ||
    lower.includes('hủy ticket') ||
    lower.includes('đánh giá') ||
    lower.includes('mấy sao') ||
    lower.includes('chấm sao') ||
    lower.includes('5 sao') ||
    lower.includes('nhận xét')
  ) {
    sections.push(
      '⭐ **Quy định về Hủy vé & Đánh giá sao:**\n' +
        '• **Hủy vé:** Chỉ hủy được khi vé đang ở trạng thái mới gửi (**Đã tiếp nhận / INITIATED**). Khi đã phân công nhân sự (`ASSIGNED` / `IN_PROGRESS`), vé không thể tự hủy.\n' +
        '• **Đánh giá sao:** Ngay khi vé chuyển sang **Hoàn thành**, bạn có thể chấm từ **1 đến 5 sao**, gửi nhận xét và bật chế độ **Đánh giá ẩn danh** nếu muốn.'
    );
    if (!suggestedAction) suggestedAction = 'my-reports';
  }

  if (sections.length > 0) {
    return {
      reply: sections.join('\n\n---\n\n'),
      suggestedAction,
    };
  }

  // Mặc định cho các câu hỏi khác có chứa từ khóa đô thị / sự cố
  return {
    reply:
      '💡 **Gợi ý xử lý từ Trợ lý CityFix:**\n\n' +
      '• Nếu đây là **sự cố nhỏ tại chỗ** (như nhánh cây nhỏ rơi sát lề, lá cây che mặt cống thoát nước nhỏ khi trời tạnh, rác vụn nhỏ trên vỉa hè): Bạn hãy quan sát an toàn giao thông và có thể chủ động thu dọn gọn vào lề mà không cần tạo vé.\n' +
      '• Nếu đây là **sự cố hạ tầng công cộng hoặc tiềm ẩn nguy hiểm** (ổ gà mặt đường, đèn đường hỏng, cây/nhánh cây lớn cản trở giao thông, ngập úng, nắp cống bể): Bạn hãy bấm **"Tạo báo cáo mới"** kèm ảnh chụp và vị trí GPS để đội ngũ kỹ thuật CityFix tiếp nhận xử lý ngay nhé!',
    suggestedAction: 'report',
  };
}

let cachedWorkingModel: string | null = null;

/**
 * Gọi AI API (Hỗ trợ tự động nhận diện Google Gemini API Key hoặc OpenAI/Groq API Key từ .env)
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
  const hasActiveAiKey = Boolean(rawKey && rawKey !== 'your_api_key_here');

  // BƯỚC 1: Kiểm tra bộ lọc Off-Topic trên Client trước khi gọi API
  const guardrail = checkOffTopicGuardrail(userMessage, hasActiveAiKey);
  if (guardrail.blocked) {
    return {
      reply: guardrail.reason || OFF_TOPIC_REFUSAL_MESSAGE,
      isBlocked: true,
      suggestedAction: null,
    };
  }

  // Nếu chưa cấu hình API Key -> sử dụng Built-in Knowledge Base của CityFix
  if (!hasActiveAiKey) {
    const fallback = getBuiltInCityFixAnswer(userMessage);
    return {
      ...fallback,
      sourceLabel: '🟠 Nội bộ CityFix (Chưa gắn API Key)',
    };
  }

  let lastApiError = '';

  try {
    // Trường hợp 1: OpenAI / Groq / OpenRouter API Key (bắt đầu bằng sk- hoặc gsk_)
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
            { role: 'system', content: CITYFIX_SYSTEM_PROMPT },
            ...recentMessages,
            { role: 'user', content: userMessage },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const replyText = data?.choices?.[0]?.message?.content?.trim();
        if (replyText) {
          const isRefusal =
            replyText.includes('nằm ngoài phạm vi') ||
            replyText.includes('Trợ lý ảo chuyên trách của hệ thống CityFix');
          return {
            reply: replyText,
            isBlocked: isRefusal,
            suggestedAction: isRefusal ? null : detectSuggestedAction(userMessage, replyText),
            sourceLabel: '🟢 OpenAI/Groq AI (API Key đang hoạt động)',
          };
        }
      } else {
        lastApiError = `HTTP ${res.status}`;
      }
    } else {
      // Trường hợp 2: Google Gemini API Key (Dùng Promise.race timeout 4.5s thuần JS để không bao giờ treo giao diện)
      const filteredHistory = history.filter((m) => m.id !== 'welcome-msg').slice(-2);
      const historyTranscript = filteredHistory
        .map((m) => `${m.sender === 'user' ? 'Người dân' : 'Trợ lý CityFix'}: ${m.text}`)
        .join('\n\n');

      const fullPrompt = historyTranscript
        ? `${CITYFIX_SYSTEM_PROMPT}\n\n=== HỘI THOẠI GẦN ĐÂY ===\n${historyTranscript}\n\n=== CÂU HỎI MỚI ===\n${userMessage}`
        : `${CITYFIX_SYSTEM_PROMPT}\n\n=== CÂU HỎI CỦA NGƯỜI DÂN ===\n${userMessage}`;

      const callGeminiModel = async (modelName: string): Promise<string> => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': rawKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: fullPrompt }],
              },
            ],
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          let errMsg = `HTTP ${res.status}`;
          try {
            const parsed = JSON.parse(errText);
            if (parsed?.error?.message) {
              errMsg = `${res.status}: ${String(parsed.error.message)}`;
            }
          } catch {}
          lastApiError = errMsg.slice(0, 70);
          console.log(`⚠️ Gemini [${modelName}] error:`, errMsg);
          throw new Error(errMsg);
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

        // Bước A: Hỏi trực tiếp Google danh sách các model mà API Key mới này được phép gọi
        let availableFlashModels: string[] = [];
        try {
          const listRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
            method: 'GET',
            headers: {
              'X-goog-api-key': rawKey,
            },
          });
          if (listRes.ok) {
            const listData = await listRes.json();
            const allModels: any[] = listData?.models || [];
            availableFlashModels = allModels
              .filter(
                (m) =>
                  Array.isArray(m?.supportedGenerationMethods) &&
                  m.supportedGenerationMethods.includes('generateContent') &&
                  typeof m?.name === 'string' &&
                  m.name.includes('gemini') &&
                  !m.name.includes('tts') &&
                  !m.name.includes('image') &&
                  !m.name.includes('embedding') &&
                  !m.name.includes('veo')
              )
              .map((m) => String(m.name).replace(/^models\//, ''))
              // Ưu tiên các model flash đời mới nhất (gemini-3..., gemini-flash-latest...) lên đầu
              .sort((a, b) => {
                const score = (name: string) => {
                  if (name.includes('3.') && name.includes('flash')) return 100;
                  if (name === 'gemini-flash-latest') return 90;
                  if (name.includes('flash')) return 80;
                  if (name.includes('3.')) return 70;
                  return 50;
                };
                return score(b) - score(a) || b.localeCompare(a);
              });
            console.log('📋 Danh sách Gemini model khả dụng cho Key:', availableFlashModels.slice(0, 6));
          }
        } catch (e: any) {
          console.log('⚠️ Không lấy được danh sách model:', e?.message);
        }

        const candidates =
          availableFlashModels.length > 0
            ? availableFlashModels.slice(0, 5)
            : ['gemini-3.5-flash', 'gemini-3.0-flash', 'gemini-flash-latest'];

        for (const modelId of candidates) {
          try {
            const answer = await callGeminiModel(modelId);
            cachedWorkingModel = modelId;
            return answer;
          } catch (err: any) {
            const msg = String(err?.message || '');
            // Nếu Google gợi ý tên model thay thế ngay trong thông báo lỗi ("use gemini-...")
            const match = msg.match(/use\s+(gemini-[a-z0-9\.\-]+)/i);
            if (match?.[1] && match[1] !== modelId) {
              try {
                const recommended = match[1];
                const answer = await callGeminiModel(recommended);
                cachedWorkingModel = recommended;
                return answer;
              } catch {}
            }
          }
        }

        throw new Error(lastApiError || 'Không tìm thấy model khả dụng');
      };

      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Quá 15s (Mạng chậm)')), 15000)
        );

        const replyText = await Promise.race([discoverAndCallGemini(), timeoutPromise]);

        if (replyText) {
          console.log('✅ CityFix Gemini AI responded successfully');
          const isRefusal =
            replyText.includes('nằm ngoài phạm vi') ||
            replyText.includes('Trợ lý ảo chuyên trách của hệ thống CityFix');
          return {
            reply: replyText,
            isBlocked: isRefusal,
            suggestedAction: isRefusal ? null : detectSuggestedAction(userMessage, replyText),
            sourceLabel: '🟢 Gemini AI (API Key đang hoạt động)',
          };
        }
      } catch (endpointErr: any) {
        if (!lastApiError) {
          lastApiError = endpointErr?.message || 'Lỗi mạng';
        }
        console.log('⚠️ Gemini fallback:', lastApiError);
      }
    }
  } catch (err: any) {
    lastApiError = err?.message || 'Lỗi kết nối';
    console.log('CityFix AI API fallback to built-in knowledge base:', err?.message);
  }

  // Fallback an toàn về bộ tri thức chuẩn của CityFix nếu mạng lỗi hoặc key hết hạn mức
  const fallback = getBuiltInCityFixAnswer(userMessage);
  return {
    ...fallback,
    sourceLabel: `🟠 Bộ tri thức CityFix (API Key lỗi: ${lastApiError || 'Không phản hồi'})`,
  };
}

