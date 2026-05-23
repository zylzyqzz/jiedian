'use client';
import { useEffect, useState } from 'react';

interface SubAgent { id: string; username: string; role: string; createdAt: string; }
interface Commission { id: string; amount: number; remark: string; createdAt: string; }
interface PriceConfig { id: string; subAgentId: string; productId: string; customPrice: number; product: { id: string; title: string; price: number } }
interface Product { id: string; title: string; price: number; agentPrice: number; status: boolean }

export default function AgentPage() {
  const userId = 'user-mock-uuid-agent-001';
  const [balance, setBalance] = useState(0);
  const [commissionBalance, setCommissionBalance] = useState(0);
  const [inviteCode, setInviteCode] = useState('');
  const [subAgents, setSubAgents] = useState<SubAgent[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [priceConfigs, setPriceConfigs] = useState<PriceConfig[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<SubAgent | null>(null);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [priceError, setPriceError] = useState('');
  const [copyHint, setCopyHint] = useState(false);
  const [activeTab, setActiveTab] = useState<'subs' | 'commissions'>('subs');

  const fetchData = async () => {
    const res = await fetch(`/api/agent?userId=${userId}`);
    const data = await res.json();
    if (data.balance !== undefined) {
      setBalance(data.balance);
      setCommissionBalance(data.commissionBalance);
      setInviteCode(data.inviteCode);
      setSubAgents(data.subAgents || []);
      setCommissions(data.commissions || []);
      setPriceConfigs(data.priceConfigs || []);
    }
    const pRes = await fetch('/api/products');
    const pData = await pRes.json();
    setProducts(Array.isArray(pData) ? pData : []);
  };

  useEffect(() => { fetchData(); }, []);

  const validatePrice = (price: number) => {
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;
    const minPrice = product.price * 0.75;
    if (price < minPrice) {
      setPriceError(`价格不能低于零售价75折（最低 ￥${minPrice.toFixed(2)}）`);
    } else {
      setPriceError('');
    }
  };

  const handleSetPrice = async () => {
    if (!selectedSub || !selectedProduct || !newPrice) return;
    const price = parseFloat(newPrice);
    const product = products.find(p => p.id === selectedProduct);
    if (!product || price < product.price * 0.75) return;

    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'AGENT_SET_PRICE',
        agentId: userId,
        subAgentId: selectedSub.id,
        productId: selectedProduct,
        newPrice: price,
      }),
    });
    setShowPriceModal(false);
    setNewPrice('');
    setSelectedProduct('');
    setPriceError('');
    fetchData();
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopyHint(true);
    setTimeout(() => setCopyHint(false), 1500);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans antialiased">
      <nav className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/5 bg-black/40 px-8 py-4 flex justify-between items-center">
        <div className="text-xl font-bold tracking-tighter bg-gradient-to-r from-white to-neutral-500 bg-clip-text text-transparent">NodeHub · 代理中心</div>
        <a href="/" className="text-xs text-neutral-400 hover:text-white transition">← 返回首页</a>
      </nav>

      <section className="max-w-5xl mx-auto px-6 pt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-5">
          <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">现金余额（拿货）</div>
          <div className="text-3xl font-mono font-bold text-white">￥{balance.toFixed(2)}</div>
        </div>
        <div className="bg-[#0A0A0A] border border-emerald-500/20 rounded-2xl p-5">
          <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">佣金余额（可提现）</div>
          <div className="text-3xl font-mono font-bold text-emerald-400">￥{commissionBalance.toFixed(2)}</div>
        </div>
        <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
          <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">我的邀请码</div>
          <div className="flex items-center gap-2">
            <code className="text-lg font-mono text-white tracking-wider select-all">{inviteCode || '---'}</code>
            <button onClick={copyInviteCode} className="text-[10px] text-blue-400 hover:underline whitespace-nowrap">
              {copyHint ? '已复制 ✓' : '复制'}
            </button>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pt-10">
        <div className="flex gap-1 mb-6 bg-[#0A0A0A] border border-white/5 rounded-xl p-1 w-fit">
          <button onClick={() => setActiveTab('subs')}
            className={`px-4 py-1.5 rounded-lg text-xs transition ${activeTab === 'subs' ? 'bg-white text-black font-semibold' : 'text-neutral-400 hover:text-white'}`}>
            子代理 ({subAgents.length})
          </button>
          <button onClick={() => setActiveTab('commissions')}
            className={`px-4 py-1.5 rounded-lg text-xs transition ${activeTab === 'commissions' ? 'bg-white text-black font-semibold' : 'text-neutral-400 hover:text-white'}`}>
            佣金流水 ({commissions.length})
          </button>
        </div>

        {activeTab === 'subs' && (
          <div className="space-y-2">
            {subAgents.length === 0 && <div className="text-xs text-neutral-500 py-8 text-center">暂无子代理，分享邀请码即可开始招募</div>}
            {subAgents.map(sub => {
              const subConfigs = priceConfigs.filter(c => c.subAgentId === sub.id);
              return (
                <div key={sub.id} className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-sm">{sub.username}</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">
                      身份：{sub.role === 'SUB_AGENT' ? '子代理' : sub.role} · 注册：{new Date(sub.createdAt).toLocaleDateString()}
                    </div>
                    {subConfigs.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {subConfigs.map(c => (
                          <span key={c.id} className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                            {c.product?.title || c.productId}: ￥{c.customPrice}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => { setSelectedSub(sub); setShowPriceModal(true); setPriceError(''); setNewPrice(''); }}
                    className="bg-white text-black hover:bg-neutral-200 transition px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap">
                    设置拿货价
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'commissions' && (
          <div className="space-y-1">
            {commissions.length === 0 && <div className="text-xs text-neutral-500 py-8 text-center">暂无佣金记录</div>}
            {commissions.map(c => (
              <div key={c.id} className="flex justify-between items-center bg-[#0A0A0A] border border-white/5 rounded-lg px-4 py-2.5">
                <div>
                  <div className="text-xs text-neutral-300">{c.remark}</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">{new Date(c.createdAt).toLocaleString()}</div>
                </div>
                <span className="text-sm font-mono text-emerald-400">+￥{c.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {showPriceModal && selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold">为 {selectedSub.username} 设置拿货价</h3>
            <select value={selectedProduct} onChange={e => { setSelectedProduct(e.target.value); validatePrice(parseFloat(newPrice || '0')); }}
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white">
              <option value="">选择商品</option>
              {products.filter(p => p.status).map(p => (
                <option key={p.id} value={p.id}>{p.title}（零售￥{p.price} / 代理￥{p.agentPrice}）</option>
              ))}
            </select>
            {selectedProduct && (
              <div className="text-[10px] text-neutral-500">
                75折红线：最低 <span className="text-amber-400 font-mono">￥{((products.find(p => p.id === selectedProduct)?.price || 0) * 0.75).toFixed(2)}</span>
              </div>
            )}
            <input type="number" placeholder="自定义价格" value={newPrice}
              onChange={e => { setNewPrice(e.target.value); validatePrice(parseFloat(e.target.value || '0')); }}
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" />
            {priceError && <div className="text-[11px] text-red-400 bg-red-500/5 p-2 rounded-lg border border-red-500/10">{priceError}</div>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowPriceModal(false)} className="flex-1 border border-white/10 py-2 rounded-xl text-xs text-neutral-400 hover:text-white transition">取消</button>
              <button onClick={handleSetPrice} disabled={!!priceError || !selectedProduct || !newPrice}
                className="flex-1 bg-white text-black py-2 rounded-xl text-xs font-semibold hover:bg-neutral-200 transition disabled:opacity-30">
                确认设置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
