'use client';
import { useState, useRef } from 'react';
import { Product } from '@/types';

interface AdminProductsProps {
  token: string;
  products: Product[];
  onRefresh: () => void;
}

const api = (token: string) => ({
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
});

export default function AdminProducts({ token, products, onRefresh }: AdminProductsProps) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', image: '', price: '', agentPrice: '', category: 'LIVE' as 'LIVE' | 'NON_LIVE'
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setForm({ title: '', description: '', image: '', price: '', agentPrice: '', category: 'LIVE' });
    setEditId(null);
    setShowForm(false);
    setSaveError('');
    setImagePreview('');
  };

  const startEdit = (p: Product) => {
    setForm({ title: p.title, description: p.description, image: p.image, price: String(p.price), agentPrice: String(p.agentPrice), category: p.category });
    setEditId(p.id);
    setShowForm(true);
    setSaveError('');
    if (p.image) setImagePreview(p.image);
    else setImagePreview('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setSaveError('图片大小不能超过 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      setForm({ ...form, image: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview('');
    setForm({ ...form, image: '' });
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSave = async () => {
    setSaveLoading(true);
    setSaveError('');
    const priceNum = parseFloat(form.price);
    const agentNum = parseFloat(form.agentPrice);
    if (!form.title.trim()) { setSaveError('商品名称不能为空'); setSaveLoading(false); return; }
    if (isNaN(priceNum) || priceNum <= 0) { setSaveError('零售价必须为正数'); setSaveLoading(false); return; }
    if (isNaN(agentNum) || agentNum <= 0) { setSaveError('代理价必须为正数'); setSaveLoading(false); return; }
    try {
      const payload = { title: form.title, description: form.description, image: form.image, price: priceNum, agentPrice: agentNum, category: form.category };
      if (editId) {
        const res = await fetch('/api/products', { method: 'PUT', ...api(token), body: JSON.stringify({ id: editId, ...payload }) });
        const d = await res.json();
        if (!d.success) { setSaveError(d.error); setSaveLoading(false); return; }
      } else {
        const res = await fetch('/api/products', { method: 'POST', ...api(token), body: JSON.stringify({ action: 'ADMIN_CREATE', ...payload }) });
        const d = await res.json();
        if (!d.success) { setSaveError(d.error); setSaveLoading(false); return; }
      }
    } catch { setSaveError('网络错误'); setSaveLoading(false); return; }
    setSaveLoading(false);
    resetForm();
    onRefresh();
  };

  const toggleProduct = async (id: string, current: boolean) => {
    await fetch('/api/products', { method: 'PATCH', ...api(token), body: JSON.stringify({ id, status: !current }) });
    onRefresh();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('确认删除该商品？')) return;
    await fetch(`/api/products?id=${id}`, { method: 'DELETE', headers: api(token).headers });
    onRefresh();
  };

  const catLabel = (c: string) => c === 'LIVE' ? '直播专线' : '非直播专线';

  return (
    <div className="space-y-4">
      {!showForm && (
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-white text-black rounded-xl text-sm font-semibold hover:bg-neutral-100 transition-all">
          + 新增商品
        </button>
      )}

      {showForm && (
        <div className="bg-[#0a0b0d] border border-white/[0.06] rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white">{editId ? '编辑商品' : '新增商品'}</h3>

          <input className="w-full bg-black border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-blue-500/50 focus:outline-none"
            placeholder="商品名称" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />

          <div className="flex gap-2">
            {(['LIVE','NON_LIVE'] as const).map(c => (
              <button key={c} onClick={() => setForm({ ...form, category: c })}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  form.category === c ? 'bg-white text-black shadow-sm' : 'border border-white/[0.06] text-neutral-500 hover:text-white'
                }`}>{catLabel(c)}</button>
            ))}
          </div>

          <textarea className="w-full bg-black border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-blue-500/50 focus:outline-none resize-none"
            placeholder="产品描述" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />

          {/* 图片上传区 */}
          <div>
            <p className="text-xs text-neutral-500 mb-2">商品图片</p>
            <div className="flex items-start gap-4">
              {(imagePreview || form.image) && (
                <div className="relative shrink-0">
                  <img src={imagePreview || form.image} alt="预览" className="w-24 h-24 rounded-xl object-cover border border-white/[0.06]" />
                  <button onClick={removeImage}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center hover:bg-red-600 transition">×</button>
                </div>
              )}
              <div className="flex-1 space-y-2">
                <label className="block">
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <span className="inline-block px-4 py-2.5 border border-dashed border-white/[0.12] rounded-xl text-sm text-neutral-400 hover:border-blue-500/50 hover:text-blue-400 cursor-pointer transition-all">
                    📁 选择图片上传
                  </span>
                  <span className="text-xs text-neutral-600 ml-2">最大 2MB</span>
                </label>
                <input className="w-full bg-black border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-neutral-600 focus:border-blue-500/50 focus:outline-none"
                  placeholder="或粘贴图片URL" value={form.image && !form.image.startsWith('data:') ? form.image : ''}
                  onChange={e => { setForm({ ...form, image: e.target.value }); setImagePreview(''); }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-neutral-500 mb-1.5">零售价 (¥)</p>
              <input type="number" className="w-full bg-black border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-blue-500/50 focus:outline-none"
                placeholder="零售价" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1.5">代理价 (¥)</p>
              <input type="number" className="w-full bg-black border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-blue-500/50 focus:outline-none"
                placeholder="代理价" value={form.agentPrice} onChange={e => setForm({ ...form, agentPrice: e.target.value })} />
            </div>
          </div>

          {saveError && <div className="text-xs text-red-400 bg-red-500/5 p-3 rounded-xl border border-red-500/10">{saveError}</div>}

          <div className="flex gap-3 pt-2">
            <button onClick={resetForm} className="flex-1 border border-white/[0.08] py-2.5 rounded-xl text-sm text-neutral-400 hover:text-white hover:border-white/20 transition-all">取消</button>
            <button onClick={handleSave} disabled={saveLoading}
              className="flex-1 bg-white text-black py-2.5 rounded-xl text-sm font-semibold hover:bg-neutral-100 transition-all disabled:opacity-50 active:scale-[0.98]">
              {saveLoading ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {products.map(p => (
          <div key={p.id} className="bg-[#0a0b0d] border border-white/[0.05] rounded-xl px-5 py-4 flex items-center justify-between hover:border-white/[0.08] transition-all">
            <div className="flex items-center gap-4">
              {p.image && <img src={p.image} alt={p.title} className="w-12 h-12 rounded-lg object-cover border border-white/[0.04] shrink-0" />}
              <div>
                <div className="text-sm font-medium text-white flex items-center gap-2">
                  {p.title}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    p.category === 'LIVE' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}>{catLabel(p.category)}</span>
                </div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  零售 ¥{p.price} · 代理 ¥{p.agentPrice} · {p.status ? <span className="text-emerald-400">上架</span> : <span className="text-red-400">下架</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <button onClick={() => startEdit(p)} className="text-xs text-neutral-400 hover:text-white transition-colors">编辑</button>
              <button onClick={() => toggleProduct(p.id, p.status)} className="text-xs text-amber-400 hover:text-amber-300 transition-colors">{p.status ? '下架' : '上架'}</button>
              <button onClick={() => deleteProduct(p.id)} className="text-xs text-red-400 hover:text-red-300 transition-colors">删除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
