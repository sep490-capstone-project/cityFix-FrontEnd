import { useState } from 'react';
import { CATEGORIES, DEPARTMENTS, ROUTING_RULES, Category, Department, RoutingRule, DeptLevel } from '../data';

type Tab = 'categories' | 'departments' | 'routing';

export default function Settings() {
  const [tab, setTab] = useState<Tab>('categories');

  return (
    <div className="p-6 screen-enter">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit mb-5">
        {([
          { key: 'categories',  label: 'Danh mục sự cố' },
          { key: 'departments', label: 'Cơ quan' },
          { key: 'routing',     label: 'Quy tắc định tuyến' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition-all active:scale-[0.97]
              ${tab === t.key ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'categories'  && <CategoryMgmt />}
      {tab === 'departments' && <DepartmentMgmt />}
      {tab === 'routing'     && <RoutingMgmt />}
    </div>
  );
}

// ── Category Management ───────────────────────────────────────────────────────
function CategoryMgmt() {
  const [cats, setCats] = useState<Category[]>(CATEGORIES);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [sel, setSel] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', description: '', isActive: true });

  function openCreate() { setForm({ name: '', description: '', isActive: true }); setSel(null); setModal('create'); }
  function openEdit(c: Category) { setForm({ name: c.name, description: c.description, isActive: c.isActive }); setSel(c); setModal('edit'); }
  function save() {
    if (modal === 'create') {
      setCats(c => [...c, { categoryId: `CAT${Date.now()}`, ...form }]);
    } else if (sel) {
      setCats(c => c.map(x => x.categoryId === sel.categoryId ? { ...x, ...form } : x));
    }
    setModal(null);
  }
  function toggle(c: Category) { setCats(cs => cs.map(x => x.categoryId === c.categoryId ? { ...x, isActive: !x.isActive } : x)); }
  function del(c: Category) { setCats(cs => cs.filter(x => x.categoryId !== c.categoryId)); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-gray-400">{cats.length} danh mục</p>
        <CTA onClick={openCreate} label="+ Thêm danh mục" />
      </div>
      <Table headers={['ID', 'Tên danh mục', 'Mô tả', 'Trạng thái', 'Hành động']}>
        {cats.map(c => (
          <tr key={c.categoryId} className="hover:bg-orange-50/50 transition-colors">
            <td className="px-4 py-3 font-mono-cf text-[10px] text-gray-400">{c.categoryId}</td>
            <td className="px-4 py-3 text-[13px] text-gray-800 font-semibold">{c.name}</td>
            <td className="px-4 py-3 text-[12px] text-gray-500 max-w-[200px] truncate">{c.description}</td>
            <td className="px-4 py-3">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border inline-flex items-center gap-1
                ${c.isActive ? 'text-green-400 bg-green-500/12 border-green-500/20' : 'text-gray-500 bg-zinc-700/30 border-gray-300'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${c.isActive ? 'bg-green-400' : 'bg-zinc-500'}`} />
                {c.isActive ? 'Hoạt động' : 'Tắt'}
              </span>
            </td>
            <td className="px-4 py-3">
              <div className="flex gap-1.5">
                <SmBtn onClick={() => openEdit(c)}>Sửa</SmBtn>
                <SmBtn onClick={() => toggle(c)} warn>{c.isActive ? 'Tắt' : 'Bật'}</SmBtn>
                <SmBtn onClick={() => del(c)} danger>Xóa</SmBtn>
              </div>
            </td>
          </tr>
        ))}
      </Table>
      {modal && (
        <Modal title={modal === 'create' ? 'Thêm danh mục' : 'Sửa danh mục'} onClose={() => setModal(null)} onSave={save}>
          <FormField label="Tên"><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} /></FormField>
          <FormField label="Mô tả"><input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inp} /></FormField>
          <FormField label="Trạng thái">
            <select value={form.isActive ? 'active' : 'inactive'} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'active' }))} className={inp}>
              <option value="active">Hoạt động</option><option value="inactive">Tắt</option>
            </select>
          </FormField>
        </Modal>
      )}
    </div>
  );
}

// ── Department Management ─────────────────────────────────────────────────────
function DepartmentMgmt() {
  const [depts, setDepts] = useState<Department[]>(DEPARTMENTS);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [sel, setSel] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: '', level: 'CITY' as DeptLevel, contactEmail: '', phoneNumber: '' });

  function openCreate() { setForm({ name: '', level: 'CITY', contactEmail: '', phoneNumber: '' }); setSel(null); setModal('create'); }
  function openEdit(d: Department) { setForm({ name: d.name, level: d.level, contactEmail: d.contactEmail, phoneNumber: d.phoneNumber }); setSel(d); setModal('edit'); }
  function save() {
    if (modal === 'create') setDepts(d => [...d, { departmentId: `D${Date.now()}`, ...form }]);
    else if (sel) setDepts(d => d.map(x => x.departmentId === sel.departmentId ? { ...x, ...form } : x));
    setModal(null);
  }
  function del(d: Department) { setDepts(ds => ds.filter(x => x.departmentId !== d.departmentId)); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-gray-400">{depts.length} cơ quan</p>
        <CTA onClick={openCreate} label="+ Thêm cơ quan" />
      </div>
      <Table headers={['ID', 'Tên cơ quan', 'Cấp', 'Email liên hệ', 'SĐT', 'Hành động']}>
        {depts.map(d => (
          <tr key={d.departmentId} className="hover:bg-orange-50/50 transition-colors">
            <td className="px-4 py-3 font-mono-cf text-[10px] text-gray-400">{d.departmentId}</td>
            <td className="px-4 py-3 text-[13px] text-gray-800 font-semibold max-w-[200px] truncate">{d.name}</td>
            <td className="px-4 py-3">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border
                ${d.level === 'CITY' ? 'text-orange-400 bg-orange-500/12 border-orange-500/20' : 'text-blue-400 bg-blue-500/12 border-blue-500/20'}`}>
                {d.level}
              </span>
            </td>
            <td className="px-4 py-3 font-mono-cf text-[11px] text-gray-500">{d.contactEmail}</td>
            <td className="px-4 py-3 font-mono-cf text-[11px] text-gray-500">{d.phoneNumber}</td>
            <td className="px-4 py-3">
              <div className="flex gap-1.5">
                <SmBtn onClick={() => openEdit(d)}>Sửa</SmBtn>
                <SmBtn onClick={() => del(d)} danger>Xóa</SmBtn>
              </div>
            </td>
          </tr>
        ))}
      </Table>
      {modal && (
        <Modal title={modal === 'create' ? 'Thêm cơ quan' : 'Sửa cơ quan'} onClose={() => setModal(null)} onSave={save}>
          <FormField label="Tên cơ quan"><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} /></FormField>
          <FormField label="Cấp">
            <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value as DeptLevel }))} className={inp}>
              <option value="CITY">CITY</option><option value="WARD">WARD</option>
            </select>
          </FormField>
          <FormField label="Email liên hệ"><input value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} className={inp} /></FormField>
          <FormField label="Số điện thoại"><input value={form.phoneNumber} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))} className={inp} /></FormField>
        </Modal>
      )}
    </div>
  );
}

// ── Routing Rule Management ───────────────────────────────────────────────────
function RoutingMgmt() {
  const [rules, setRules] = useState<RoutingRule[]>(ROUTING_RULES);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [sel, setSel] = useState<RoutingRule | null>(null);
  const [form, setForm] = useState({ categoryId: 'CAT001', province: 'TP.HCM', ward: '', departmentId: 'D001' });

  function openCreate() { setForm({ categoryId: 'CAT001', province: 'TP.HCM', ward: '', departmentId: 'D001' }); setSel(null); setModal('create'); }
  function openEdit(r: RoutingRule) { setForm({ categoryId: r.categoryId, province: r.province, ward: r.ward, departmentId: r.departmentId }); setSel(r); setModal('edit'); }
  function save() {
    if (modal === 'create') setRules(r => [...r, { ruleId: `RR${Date.now()}`, ...form }]);
    else if (sel) setRules(r => r.map(x => x.ruleId === sel.ruleId ? { ...x, ...form } : x));
    setModal(null);
  }
  function del(r: RoutingRule) { setRules(rs => rs.filter(x => x.ruleId !== r.ruleId)); }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 bg-gray-50 border border-orange-500/20 rounded-xl px-4 py-3">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        <p className="text-[12px] text-orange-400/80">Logic định tuyến: <strong>Danh mục + Tỉnh/TP + Phường</strong> → Quy tắc → Cơ quan</p>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-gray-400">{rules.length} quy tắc</p>
        <CTA onClick={openCreate} label="+ Thêm quy tắc" />
      </div>
      <Table headers={['ID', 'Danh mục', 'Tỉnh/TP', 'Phường', 'Cơ quan', 'Hành động']}>
        {rules.map(r => {
          const cat = CATEGORIES.find(c => c.categoryId === r.categoryId);
          const dept = DEPARTMENTS.find(d => d.departmentId === r.departmentId);
          return (
            <tr key={r.ruleId} className="hover:bg-orange-50/50 transition-colors">
              <td className="px-4 py-3 font-mono-cf text-[10px] text-gray-400">{r.ruleId}</td>
              <td className="px-4 py-3 text-[12px] text-gray-700 max-w-[150px] truncate">{cat?.name}</td>
              <td className="px-4 py-3 text-[12px] text-gray-600">{r.province}</td>
              <td className="px-4 py-3 text-[12px] text-gray-600 max-w-[120px] truncate">{r.ward}</td>
              <td className="px-4 py-3 text-[12px] text-gray-600 max-w-[170px] truncate">{dept?.name}</td>
              <td className="px-4 py-3">
                <div className="flex gap-1.5">
                  <SmBtn onClick={() => openEdit(r)}>Sửa</SmBtn>
                  <SmBtn onClick={() => del(r)} danger>Xóa</SmBtn>
                </div>
              </td>
            </tr>
          );
        })}
      </Table>
      {modal && (
        <Modal title={modal === 'create' ? 'Thêm quy tắc' : 'Sửa quy tắc'} onClose={() => setModal(null)} onSave={save}>
          <FormField label="Danh mục">
            <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))} className={inp}>
              {CATEGORIES.map(c => <option key={c.categoryId} value={c.categoryId}>{c.name}</option>)}
            </select>
          </FormField>
          <FormField label="Tỉnh/TP"><input value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))} className={inp} /></FormField>
          <FormField label="Phường/Xã"><input value={form.ward} onChange={e => setForm(f => ({ ...f, ward: e.target.value }))} className={inp} placeholder="VD: P.6, Q.3" /></FormField>
          <FormField label="Cơ quan">
            <select value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))} className={inp}>
              {DEPARTMENTS.map(d => <option key={d.departmentId} value={d.departmentId}>{d.name}</option>)}
            </select>
          </FormField>
        </Modal>
      )}
    </div>
  );
}

// ── Shared Components ─────────────────────────────────────────────────────────
const inp = "w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-[12px] text-gray-900 outline-none focus:border-orange-500/50 transition-colors";

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden card-depth">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200">
              {headers.map(h => <th key={h} className="px-4 py-2.5 text-[9px] font-bold text-gray-400 uppercase tracking-[0.18em] whitespace-nowrap">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function Modal({ title, onClose, onSave, children }: { title: string; onClose: () => void; onSave: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-gray-100/85 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md overflow-hidden card-depth screen-enter">
        <div className="relative px-5 pt-4 pb-3 border-b border-gray-200 flex items-center justify-between">
          <div className="absolute top-0 left-0 right-0 h-[2px] hazard-stripe-thin" />
          <p className="font-display text-[15px] font-bold text-gray-900 uppercase tracking-wide mt-1">{title}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">{children}</div>
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-[12px] font-semibold hover:text-gray-800 transition-colors">Hủy</button>
          <button onClick={onSave} className="flex-1 relative rounded-xl overflow-hidden py-2.5 active:scale-[0.97] transition-transform">
            <div className="absolute inset-0 bg-gradient-to-r from-[#c2410c] to-[#f97316]" />
            <span className="relative text-white font-bold uppercase tracking-wide text-[12px]">Lưu</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">{label}</label>
      {children}
    </div>
  );
}

function CTA({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="relative rounded-xl overflow-hidden px-4 py-2 active:scale-[0.97] transition-transform">
      <div className="absolute inset-0 bg-gradient-to-r from-[#c2410c] to-[#f97316]" />
      <div className="absolute inset-0 opacity-[0.06]" style={{ background: 'repeating-linear-gradient(-45deg,white,white 8px,transparent 8px,transparent 16px)' }} />
      <span className="relative text-white font-bold uppercase tracking-wide text-[12px]">{label}</span>
    </button>
  );
}

function SmBtn({ onClick, children, danger, warn }: { onClick: () => void; children: React.ReactNode; danger?: boolean; warn?: boolean }) {
  return (
    <button onClick={onClick}
      className={`px-2.5 py-1 rounded-lg border text-[10px] font-semibold transition-all active:scale-[0.97]
        ${danger ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' :
          warn ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10' :
          'border-gray-300 text-gray-600 hover:text-gray-800 hover:border-gray-400'}`}>
      {children}
    </button>
  );
}
