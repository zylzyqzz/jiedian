'use client';
import { useEffect, useState } from 'react';

interface Product {
  id: string; title: string; description: string; image: string;
  price: number; agentPrice: number; status: boolean; createdAt: string;
}

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', image: '', price: '', agentPrice: '' });
  const [loading, setLoading] = useState(false);

  const fetchProducts = async () => {
    const res = await fetch('/api/products?all=true');
    const data = await res.json();
    setProducts(data);
  };

  useEffect(() => { fetchProducts(); }, []);

  const resetForm = () => {
    setForm({ title: '', description: '', image: '', price: '', agentPrice: '' });
    setEditId(null);
    setShowForm(false);
  };

  const openEdit = (p: Product) => {
    setForm({ title: p.title, description: p.description, image: p.image, price: String(p.price), agentPrice: String(p.agentPrice) });
    setEditId(p.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    setLoading(true);
    if (editId) {
      await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editId, ...form, price: parseFloat(form.price), agentPrice: parseFloat(form.agentPrice) }),
      });
    } else {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ADMIN_CREATE', ...form, price: parseFloat(form.price), agentPrice: parseFloat(form.agentPrice) }),
      });
    }
    setLoading(false);
    resetForm();
    fetchProducts();
  };

  const toggleStatus = async (id: string, current: boolean) => {
    await fetch('/api/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: !current }),
    });
    fetchProducts();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('确认删除该商品？此操作不可逆。')) return;
    await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
    fetchProducts();
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans antialiased">
      <nav className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/5 bg-black/40 px-8 py-4 flex justify-between items-center">
        <div className="text-xl font-bold tracking-tighter bg-gradient-to-r from-white to-neutral-500 bg-clip-text text-transparent">NodeHub · 管理后台</div>
        <a href="/" className="text-xs text-neutral-400 hover:text-white transition mr-4">← 返回首页</a>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-white text-black hover:bg-neutral-200 transition px-4 py-2 rounded-xl text-xs font-semibold">
          + 新增商品
        </button>
      </nav>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold">{editId ? '编辑商品' : '新增商品'}</h2>
            <input className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" placeholder="商品名称" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })} />
            <textarea className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white h-20 placeholder:text-neutral-600" placeholder="商品介绍"
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <input className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" placeholder="图片URL" value={form.image}
              onChange={e => setForm({ ...form, image: e.target.value })} />
            <div className="flex gap-3">
              <input className="flex-1 bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" placeholder="零售价" type="number"
                value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
              <input className="flex-1 bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" placeholder="代理价" type="number"
                value={form.agentPrice} onChange={e => setForm({ ...form, agentPrice: e.target.value })} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={resetForm} className="flex-1 border border-white/10 py-2 rounded-xl text-xs text-neutral-400 hover:text-white transition">取消</button>
              <button onClick={handleSave} disabled={loading}
                className="flex-1 bg-white text-black py-2 rounded-xl text-xs font-semibold hover:bg-neutral-200 transition disabled:opacity-50">
                {loading ? '保存中...' : editId ? '更新商品' : '创建商品'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="text-xs text-neutral-500 mb-6">共 {products.length} 个商品</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p.id} className={`bg-[#0A0A0A] border rounded-2xl p-4 flex flex-col gap-3 transition ${p.status ? 'border-white/10' : 'border-red-500/20 opacity-50'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-sm">{p.title}</h3>
                  <p className="text-[10px] text-neutral-500 mt-1 line-clamp-2">{p.description}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${p.status ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                  {p.status ? '上架' : '下架'}
                </span>
              </div>
              <div className="flex gap-4 text-xs">
                <span className="text-neutral-400">零售 <span className="text-white font-mono">￥{p.price}</span></span>
                <span className="text-neutral-400">代理 <span className="text-emerald-400 font-mono">￥{p.agentPrice}</span></span>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => openEdit(p)} className="flex-1 border border-white/10 py-1.5 rounded-lg text-[10px] text-neutral-400 hover:text-white hover:border-white/20 transition">编辑</button>
                <button onClick={() => toggleStatus(p.id, p.status)} className="flex-1 border border-white/10 py-1.5 rounded-lg text-[10px] text-neutral-400 hover:text-white transition">
                  {p.status ? '下架' : '上架'}
                </button>
                <button onClick={() => deleteProduct(p.id)} className="flex-1 border border-red-500/20 py-1.5 rounded-lg text-[10px] text-red-400 hover:bg-red-500/10 transition">删除</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
