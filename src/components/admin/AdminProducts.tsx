'use client';
import { useState } from 'react';
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
  const [form, setForm] = useState({ title: '', description: '', image: '', price: '', agentPrice: '', category: 'LIVE' as 'LIVE' | 'NON_LIVE' });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');

  const resetForm = () => {
    setForm({ title: '', description: '', image: '', price: '', agentPrice: '', category: 'LIVE' });
    setEditId(null);
    setShowForm(false);
    setSaveError('');
  };

  const startEdit = (p: Product) => {
    setForm({ title: p.title, description: p.description, image: p.image, price: String(p.price), agentPrice: String(p.agentPrice), category: p.category });
    setEditId(p.id);
    setShowForm(true);
    setSaveError('');
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
      if (editId) {
        const res = await fetch('/api/products', {
          method: 'PUT',
          ...api(token),
          body: JSON.stringify({ id: editId, title: form.title, description: form.description, image: form.image, price: priceNum, agentPrice: agentNum, category: form.category }),
        });
        const d = await res.json();
        if (!d.success) { setSaveError(d.error); setSaveLoading(false); return; }
      } else {
        const res = await fetch('/api/products', {
          method: 'POST',
          ...api(token),
          body: JSON.stringify({ action: 'ADMIN_CREATE', title: form.title, description: form.description, image: form.image, price: priceNum, agentPrice: agentNum, category: form.category }),
        });
        const d = await res.json();
        if (!d.success) { setSaveError(d.error); setSaveLoading(false); return; }
      }
    } catch {
      setSaveError('网络错误，请重试');
      setSaveLoading(false);
      return;
    }

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

  const catLabel = (c: string) => c === 'LIVE' ? '📡 直播专线' : '🌐 非直播专线';

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="bg-white text-black px-4 py-2 rounded-xl text-xs font-semibold hover:bg-neutral-200 transition">+ 新增商品</button>
        )}
      </div>

      {showForm && (
        <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 space-y-3">
          <h3 className="text-sm font-bold">{editId ? '编辑商品' : '新增商品'}</h3>
          <input className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" placeholder="商品名称" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />

          {/* 分类选择 */}
          <div className="flex gap-2">
            {(['LIVE', 'NON_LIVE'] as const).map(c => (
              <button
                key={c}
                onClick={() => setForm({ ...form, category: c })}
                className={`flex-1 py-2 rounded-xl text-[10px] font-semibold transition ${
                  form.category === c
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'border border-white/10 text-neutral-400 hover:text-white'
                }`}
              >
                {catLabel(c)}
              </button>
            ))}
          </div>

          <input className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" placeholder="描述" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <input className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" placeholder="图片URL" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" placeholder="零售价" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            <input type="number" className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" placeholder="代理价" value={form.agentPrice} onChange={e => setForm({ ...form, agentPrice: e.target.value })} />
          </div>
          {saveError && <div className="text-[11px] text-red-400 bg-red-500/5 p-2 rounded-lg border border-red-500/10">{saveError}</div>}
          <div className="flex gap-3 pt-1">
            <button onClick={resetForm} className="flex-1 border border-white/10 py-2 rounded-xl text-xs text-neutral-400 hover:text-white">取消</button>
            <button onClick={handleSave} disabled={saveLoading} className="flex-1 bg-white text-black py-2 rounded-xl text-xs font-semibold hover:bg-neutral-200 disabled:opacity-50">
              {saveLoading ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {products.map(p => (
          <div key={p.id} className="bg-[#0A0A0A] border border-white/5 rounded-lg px-4 py-3 flex justify-between items-center">
            <div>
              <div className="text-sm text-white flex items-center gap-2">
                {p.title}
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                  p.category === 'LIVE'
                    ? 'bg-red-500/10 text-red-400'
                    : 'bg-blue-500/10 text-blue-400'
                }`}>
                  {catLabel(p.category)}
                </span>
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">
                零售￥{p.price} · 代理￥{p.agentPrice} · {p.status ? <span className="text-emerald-400">上架</span> : <span className="text-red-400">下架</span>}
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <button onClick={() => startEdit(p)} className="text-[10px] text-neutral-400 hover:text-white transition">编辑</button>
              <button onClick={() => toggleProduct(p.id, p.status)} className="text-[10px] text-amber-400 hover:text-amber-300 transition">{p.status ? '下架' : '上架'}</button>
              <button onClick={() => deleteProduct(p.id)} className="text-[10px] text-red-400 hover:text-red-300 transition">删除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
