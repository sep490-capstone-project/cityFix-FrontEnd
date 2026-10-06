const fs = require('fs');
let detailContent = fs.readFileSync('web/src/manager/ManagerTicketDetail.tsx', 'utf8');

// We need to inject useState to manage the updated state
// `const [isAssigned, setIsAssigned] = useState(false);`
detailContent = detailContent.replace("const [resNote, setResNote] = useState('');", "const [resNote, setResNote] = useState('');\n  const [managerActionDone, setManagerActionDone] = useState(false);");

const oldManagerBlock = `<div className="px-5 py-4 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-\\[0.15em\\] block mb-1.5">Phân công Staff cho bước xử lý</label>
                <select className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-\\[12px\\] text-gray-900 outline-none focus:border-orange-500/50">
                  <option value="">-- Chọn Staff --</option>
                  <option value="U010">Trần Minh Quân \\(Tổ kỹ thuật\\)</option>
                  <option value="U011">Lê Văn B \\(Tổ hiện trường\\)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-\\[10px\\] font-bold text-gray-500 uppercase tracking-\\[0.15em\\] block mb-1.5">Hạn xử lý \\(Timeline\\)</label>
                  <input type="datetime-local" defaultValue="2026-10-10T12:00" className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-\\[12px\\] text-gray-900 outline-none focus:border-orange-500/50" />
                </div>
                <div>
                  <label className="text-\\[10px\\] font-bold text-gray-500 uppercase tracking-\\[0.15em\\] block mb-1.5">Ghi chú điều phối</label>
                  <input type="text" placeholder="Yêu cầu xử lý gấp..." className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-\\[12px\\] text-gray-900 outline-none focus:border-orange-500/50" />
                </div>
              </div>
              <button className="bg-blue-600/10 text-blue-700 border border-blue-600/20 rounded-xl px-4 py-2 text-\\[12px\\] font-bold hover:bg-blue-600/20 transition-colors">
                Cập nhật thay đổi
              </button>
            </div>`;

// Wait, doing string replace with raw Regex on large JSX is flaky. I'll just replace the entire block.
detailContent = detailContent.replace(/<div className="px-5 py-4 space-y-4">.*?Cập nhật thay đổi\s*<\/button>\s*<\/div>/s, `<div className="px-5 py-4 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] block mb-1.5">Phân công Staff cho bước xử lý</label>
                <select disabled={managerActionDone} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-[12px] text-gray-900 outline-none focus:border-orange-500/50 disabled:opacity-50">
                  <option value="">-- Chọn Staff --</option>
                  <option value="U010">Trần Minh Quân (Tổ kỹ thuật)</option>
                  <option value="U011">Lê Văn B (Tổ hiện trường)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] block mb-1.5">Hạn xử lý (Timeline)</label>
                  <input type="datetime-local" defaultValue="2026-10-10T12:00" disabled={managerActionDone} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-[12px] text-gray-900 outline-none focus:border-orange-500/50 disabled:opacity-50" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] block mb-1.5">Ghi chú điều phối</label>
                  <input type="text" placeholder="Yêu cầu xử lý gấp..." disabled={managerActionDone} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-[12px] text-gray-900 outline-none focus:border-orange-500/50 disabled:opacity-50" />
                </div>
              </div>
              {!managerActionDone ? (
                <button onClick={() => { setManagerActionDone(true); alert('Đã cập nhật phân công và timeline thành công!'); }} className="bg-blue-600/10 text-blue-700 border border-blue-600/20 rounded-xl px-4 py-2 text-[12px] font-bold hover:bg-blue-600/20 transition-colors">
                  Cập nhật thay đổi
                </button>
              ) : (
                <button disabled className="bg-green-600/10 text-green-700 border border-green-600/20 rounded-xl px-4 py-2 text-[12px] font-bold">
                  Đã lưu thay đổi
                </button>
              )}
            </div>`);

fs.writeFileSync('web/src/manager/ManagerTicketDetail.tsx', detailContent, 'utf8');
