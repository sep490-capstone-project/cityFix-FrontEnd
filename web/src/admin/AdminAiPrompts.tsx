import React, { useState, useEffect, useRef } from 'react';
import { App as AntdApp } from 'antd';
import {
  AiPromptVersionItem,
  getLatestAiPrompt,
  getAiPromptHistory,
  uploadAiPromptFile,
} from '../services';

const DEFAULT_CITYFIX_PROMPT_TEMPLATE = `Bạn là "Trợ lý ảo CityFix" trên ứng dụng di động dành cho Người dân.

QUY TẮC BẮT BUỘC:
1. Chỉ trả lời các câu hỏi về:
   (A) Quy trình 5 bước tạo báo cáo sự cố & Upvote vé trùng lặp trong bán kính 50m trên ứng dụng CityFix:
       - Bước 1: Chọn vị trí (Định vị GPS tự động, chạm chọn trên bản đồ hoặc nhập địa chỉ thủ công).
       - Bước 2: Chụp ảnh hiện trường (Tối đa 5 ảnh rõ nét).
       - Bước 3: AI phân tích tự động (Nhận diện danh mục sự cố, danh mục con và mức độ ưu tiên).
       - Bước 4: Xem trước báo cáo & Kiểm tra trùng lặp 50m (Nếu có vé cùng danh mục con trong bán kính 50m thì gợi ý Đồng tình/Upvote).
       - Bước 5: Hoàn tất gửi báo cáo, nhận mã hồ sơ để theo dõi tiến độ.
   (B) Cách xem lại vé ở tab "Báo cáo" ("Báo cáo của tôi" & "Vé đã đồng tình"), tiến trình 3 giai đoạn (Đã tiếp nhận -> Đang xử lý -> Hoàn thành), quy trình 4 bước của Nhân viên hiện trường (Nhận việc ASSIGNED -> Xử lý từng bước IN_PROGRESS -> Chụp ảnh bằng chứng đóng dấu GPS/Ngày giờ -> Hoàn thành COMPLETED), hủy vé (chỉ khi ở trạng thái INITIATED) và đánh giá chất lượng 1-5 sao.
   (C) Tư vấn xử lý sự cố nhỏ tại chỗ không cần báo cáo (nhánh cây khô nhỏ không vướng điện, rác/lá cây nhỏ che mặt cống khi trời tạnh, bóng đèn sân nhà riêng) vs sự cố nguy hiểm bắt buộc báo cáo CityFix (đèn đường công cộng hỏng/rò điện, cây lớn đổ/đè người -> gọi 114/115 ngay và bấm nút SOS, ổ gà sâu, mất nắp cống, ngập úng diện rộng).

2. Nếu câu hỏi KHÔNG liên quan đến CityFix hoặc sự cố hạ tầng đô thị, BẮT BUỘC từ chối lịch sự bằng thông báo:
"⚠️ Câu hỏi của bạn nằm ngoài phạm vi hỗ trợ của hệ thống CityFix.
Xin phép bạn vui lòng đặt lại câu hỏi liên quan đến:
• Quy trình báo cáo & Upvote sự cố trên ứng dụng
• Cách theo dõi tiến độ xử lý, hủy vé & đánh giá sao
• Hướng dẫn tự xử lý an toàn các sự cố nhỏ tại khu dân cư"

3. Phong cách trả lời: Tiếng Việt, ngắn gọn, thân thiện, trình bày gạch đầu dòng rõ ràng, dễ đọc trên màn hình điện thoại.`;

function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function AdminAiPrompts() {
  const { message } = AntdApp.useApp();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [latestPrompt, setLatestPrompt] = useState<AiPromptVersionItem | null>(null);
  const [historyList, setHistoryList] = useState<AiPromptVersionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);

  // Chế độ cập nhật: 'editor' (soạn thảo trực tiếp -> tự đóng gói .txt) hoặc 'file' (tải file .txt từ máy)
  const [inputMode, setInputMode] = useState<'editor' | 'file'>('editor');
  const [editorContent, setEditorContent] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreview, setSelectedFilePreview] = useState<string>('');

  async function loadPromptData(fillEditor = false) {
    setLoading(true);
    try {
      const [latestRes, historyRes] = await Promise.allSettled([
        getLatestAiPrompt(),
        getAiPromptHistory(),
      ]);

      let resolvedLatest: AiPromptVersionItem | null = null;
      if (latestRes.status === 'fulfilled' && latestRes.value) {
        resolvedLatest = latestRes.value;
        setLatestPrompt(resolvedLatest);
      } else {
        setLatestPrompt(null);
      }

      if (historyRes.status === 'fulfilled' && Array.isArray(historyRes.value)) {
        setHistoryList(historyRes.value);
      } else {
        setHistoryList([]);
      }

      if (fillEditor) {
        if (resolvedLatest?.content) {
          setEditorContent(resolvedLatest.content);
        } else {
          setEditorContent(DEFAULT_CITYFIX_PROMPT_TEMPLATE);
        }
      }
    } catch (err: any) {
      console.warn('Lỗi tải dữ liệu AI Prompt:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPromptData(true);
  }, []);

  function handleSelectTxtFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.txt') && file.type !== 'text/plain') {
      message.warning('Vui lòng chọn tệp định dạng .txt (UTF-8)');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = typeof ev.target?.result === 'string' ? ev.target.result : '';
      setSelectedFilePreview(text);
    };
    reader.readAsText(file, 'utf-8');
  }

  async function handlePublishFromFile() {
    if (!selectedFile) {
      message.warning('Vui lòng chọn một tệp .txt trước khi tải lên.');
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadAiPromptFile(selectedFile);
      message.success('Đã tải lên tệp AI Prompt (.txt -> PDF Cloudinary) thành công!');
      setLatestPrompt(uploaded);
      if (uploaded.content) {
        setEditorContent(uploaded.content);
      } else if (selectedFilePreview) {
        setEditorContent(selectedFilePreview);
      }
      setSelectedFile(null);
      setSelectedFilePreview('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await loadPromptData(false);
    } catch (err: any) {
      message.error(err?.message || 'Tải lên tệp AI Prompt thất bại.');
    } finally {
      setUploading(false);
    }
  }

  async function handlePublishFromEditor() {
    const cleanText = editorContent.trim();
    if (!cleanText) {
      message.warning('Nội dung AI Prompt không được để trống.');
      return;
    }

    setUploading(true);
    try {
      // Tự động đóng gói nội dung UTF-8 thành đối tượng File .txt gửi lên POST /api/v1/ai-prompts
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const blob = new Blob([cleanText], { type: 'text/plain;charset=utf-8' });
      const generatedFile = new File([blob], `cityfix-ai-prompt-${timestamp}.txt`, {
        type: 'text/plain;charset=utf-8',
      });

      const uploaded = await uploadAiPromptFile(generatedFile);
      message.success('Đã xuất bản phiên bản AI Prompt mới và lưu trữ PDF trên Cloudinary!');
      setLatestPrompt(uploaded);
      if (uploaded.content) {
        setEditorContent(uploaded.content);
      }
      await loadPromptData(false);
    } catch (err: any) {
      message.error(err?.message || 'Xuất bản phiên bản AI Prompt thất bại.');
    } finally {
      setUploading(false);
    }
  }

  function handleDownloadCurrentTxt() {
    const contentToDownload = latestPrompt?.content || editorContent || DEFAULT_CITYFIX_PROMPT_TEMPLATE;
    const blob = new Blob([contentToDownload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cityfix-ai-prompt-${latestPrompt?.id ? latestPrompt.id.slice(0, 8) : 'latest'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto screen-enter">
      {/* Header Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-display text-xl lg:text-2xl font-extrabold text-gray-900">
              Quản lý AI Prompt
            </h1>
          </div>
          <p className="text-[12px] text-gray-500 mt-1">
            Quản lý tệp tri thức & chỉ dẫn hệ thống (System Prompt) cho Chatbot AI trên ứng dụng di động của Cư dân. Tệp .txt UTF-8 được tự động chuyển đổi sang PDF tiếng Việt và lưu trữ trên Cloudinary.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => loadPromptData(false)}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>↻</span>
            <span>Làm mới dữ liệu</span>
          </button>
          <button
            onClick={handleDownloadCurrentTxt}
            className="px-3.5 py-2 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>⬇</span>
            <span>Tải tệp .txt hiện tại</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Phiên bản đang áp dụng
          </p>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono-cf text-base font-extrabold text-gray-900">
              {latestPrompt?.id ? `#${latestPrompt.id.slice(0, 8).toUpperCase()}` : 'Chưa có trên Server'}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                latestPrompt
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {latestPrompt ? 'Đang kích hoạt' : 'Dùng mặc định Mobile'}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1.5">
            Cập nhật lúc: {latestPrompt ? formatDateTime(latestPrompt.createdAt) : '—'}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Tổng số phiên bản lịch sử
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-extrabold text-orange-600">
              {historyList.length}
            </span>
            <span className="text-xs font-medium text-gray-500">bản ghi Append-Only</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Mỗi lần tải lên đều được lưu vết PDF bất biến trên Cloudinary
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Bản lưu trữ PDF mới nhất (Cloudinary)
            </p>
            <p className="text-xs text-gray-600 mt-1.5 truncate">
              {latestPrompt?.fileUrl || 'Chưa có đường dẫn tệp PDF'}
            </p>
          </div>
          <div className="mt-3">
            {latestPrompt?.fileUrl ? (
              <a
                href={latestPrompt.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors"
              >
                <span>📄 Mở xem tệp PDF trên Cloudinary ↗</span>
              </a>
            ) : (
              <span className="text-[11px] text-gray-400 italic">
                Hãy xuất bản phiên bản đầu tiên để tạo PDF
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Active Prompt + Upload/Editor, Right = Version History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Active Prompt Content & Publish New Version */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Phiên bản đang hoạt động (GET /api/v1/ai-prompts/latest) */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h2 className="font-display text-sm font-extrabold text-gray-900">
                  Nội dung AI Prompt Mới Nhất Đang Áp Dụng 
                </h2>
              </div>
              {latestPrompt?.content && (
                <button
                  onClick={() => {
                    setEditorContent(latestPrompt.content || '');
                    setInputMode('editor');
                    message.info('Đã sao chép nội dung hiện tại xuống khung soạn thảo.');
                  }}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
                >
                  Nạp xuống khung sửa ↓
                </button>
              )}
            </div>

            <div className="p-5">
              {loading ? (
                <div className="py-10 text-center text-xs text-gray-400">
                  Đang tải phiên bản AI Prompt mới nhất...
                </div>
              ) : latestPrompt?.content ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-200">
                    <span>
                      ID: <strong className="font-mono-cf text-gray-800">{latestPrompt.id}</strong>
                    </span>
                    <span>
                      Độ dài: <strong className="text-gray-800">{latestPrompt.content.length} ký tự</strong>
                    </span>
                  </div>
                  <pre className="w-full max-h-72 overflow-y-auto p-4 rounded-xl bg-slate-900 text-slate-100 text-xs leading-relaxed font-mono whitespace-pre-wrap">
                    {latestPrompt.content}
                  </pre>
                </div>
              ) : (
                <div className="py-8 px-4 text-center bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-amber-800">
                    Chưa có tệp AI Prompt nào được tải lên máy chủ.
                  </p>
                  <p className="text-[11px] text-amber-700">
                    Bạn có thể tải tệp .txt lên hoặc chỉnh sửa mẫu Prompt mặc định bên dưới rồi bấm "Xuất bản phiên bản mới".
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 2. Tải lên / Xuất bản phiên bản mới (POST /api/v1/ai-prompts) */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-sm font-extrabold text-gray-900">
                  Xuất Bản Phiên Bản AI Prompt Mới 
                </h2>
                <p className="text-[11px] text-gray-500">
                  Hỗ trợ tải tệp .txt UTF-8 trực tiếp từ máy tính hoặc soạn thảo trên trình duyệt
                </p>
              </div>

              {/* Mode Switcher */}
              <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setInputMode('editor')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    inputMode === 'editor'
                      ? 'bg-white text-orange-600 shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  ✏️ Soạn thảo trực tiếp
                </button>
                <button
                  onClick={() => setInputMode('file')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    inputMode === 'file'
                      ? 'bg-white text-orange-600 shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📁 Tải lên tệp .txt
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {inputMode === 'editor' ? (
                <>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs font-bold text-gray-700">
                      Nội dung AI Prompt (UTF-8 tiếng Việt):
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditorContent(DEFAULT_CITYFIX_PROMPT_TEMPLATE);
                          message.info('Đã nạp mẫu Prompt chuẩn từ chatAssistant.ts');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-[11px] font-bold cursor-pointer"
                      >
                        Nạp mẫu chuẩn chatAssistant.ts
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={13}
                    value={editorContent}
                    onChange={(e) => setEditorContent(e.target.value)}
                    placeholder="Nhập nội dung System Prompt và quy tắc hướng dẫn cho Trợ lý ảo CityFix..."
                    className="w-full rounded-xl border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 p-3.5 text-xs font-mono leading-relaxed text-gray-800 outline-none resize-y"
                  />

                  <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                    <span className="text-[11px] text-gray-500">
                      Hệ thống sẽ tự động đóng gói thành tệp <code className="font-mono text-gray-700">.txt (UTF-8)</code> và gửi lên Backend để chuyển sang PDF Cloudinary.
                    </span>
                    <button
                      onClick={handlePublishFromEditor}
                      disabled={uploading || !editorContent.trim()}
                      className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer"
                    >
                      {uploading ? 'Đang chuyển đổi PDF & Tải lên...' : 'Lưu & Xuất bản phiên bản mới'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="border-2 border-dashed border-orange-200 bg-orange-50/40 rounded-2xl p-6 text-center space-y-3">
                    <div className="text-2xl">📄</div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">
                        Chọn tệp cấu hình AI Prompt định dạng <span className="text-orange-600">.txt (UTF-8)</span>
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Backend sẽ tự động chuyển đổi tệp .txt tiếng Việt sang PDF, tải lên Cloudinary và lưu lịch sử Append-Only.
                      </p>
                    </div>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,text/plain"
                        onChange={handleSelectTxtFile}
                        className="block w-full max-w-xs mx-auto text-xs text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-orange-600 file:text-white hover:file:bg-orange-700 file:cursor-pointer"
                      />
                    </div>
                  </div>

                  {selectedFile && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-200">
                        <span className="font-bold text-gray-800">
                          📎 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </span>
                        <button
                          onClick={() => {
                            setSelectedFile(null);
                            setSelectedFilePreview('');
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="text-red-600 font-bold hover:underline cursor-pointer"
                        >
                          Xóa tệp
                        </button>
                      </div>
                      <pre className="w-full max-h-52 overflow-y-auto p-3.5 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono whitespace-pre-wrap">
                        {selectedFilePreview || '(Tệp trống)'}
                      </pre>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={handlePublishFromFile}
                      disabled={uploading || !selectedFile}
                      className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer"
                    >
                      {uploading ? 'Đang tải tệp lên Cloudinary...' : 'Tải lên tệp .txt & Áp dụng ngay'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Append-Only Version History (GET /api/v1/ai-prompts) */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-slate-50/60">
              <div>
                <h2 className="font-display text-sm font-extrabold text-gray-900">
                  Lịch Sử Phiên Bản 
                </h2>
                <p className="text-[11px] text-gray-500">
                  Lưu trữ bất biến (Append-Only) sắp xếp theo thời gian mới nhất
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700">
                {historyList.length} phiên bản
              </span>
            </div>

            <div className="divide-y divide-gray-100 max-h-[700px] overflow-y-auto">
              {loading ? (
                <div className="py-12 text-center text-xs text-gray-400">
                  Đang tải lịch sử phiên bản...
                </div>
              ) : historyList.length === 0 ? (
                <div className="py-12 px-5 text-center space-y-1">
                  <p className="text-xs font-bold text-gray-600">Chưa có lịch sử phiên bản</p>
                  <p className="text-[11px] text-gray-400">
                    Các tệp AI Prompt sau khi tải lên sẽ xuất hiện tại đây kèm link PDF Cloudinary.
                  </p>
                </div>
              ) : (
                historyList.map((item, idx) => {
                  const isLatest =
                    idx === 0 || (latestPrompt?.id && item.id === latestPrompt.id);
                  return (
                    <div
                      key={item.id || idx}
                      className={`p-4 transition-colors ${
                        isLatest ? 'bg-orange-50/40' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono-cf text-xs font-extrabold text-gray-900">
                              #{item.id ? item.id.slice(0, 8).toUpperCase() : `VER-${historyList.length - idx}`}
                            </span>
                            {isLatest ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Đang áp dụng (Latest)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                                Bản lưu cũ
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500">
                            🕒 {formatDateTime(item.createdAt)}
                          </p>
                          <p className="font-mono text-[10px] text-gray-400 truncate">
                            UUID: {item.id}
                          </p>
                        </div>

                        {item.fileUrl ? (
                          <a
                            href={item.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-white hover:bg-orange-50 text-orange-600 border border-orange-200 text-xs font-bold transition-colors"
                          >
                            📄 Xem PDF ↗
                          </a>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
