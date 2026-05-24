'use client';
import { useState, useEffect, useCallback } from 'react';
import { Product, SubAgent, CommissionRecord, AgentPriceConfigItem } from '@/types';

interface AgentViewProps {
  token: string;
}

const api = (token: string) => ({
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
});

export default function AgentView({ token }: AgentViewProps) {
  const [balance, setBalance] = useState(0);
  const [commissionBalance, setCommissionBalance] = useState(0);
  const [inviteCode, setInviteCode] = useState('');
  const [subAgents, setSubAgents] = useState<SubAgent[]>([]);
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [priceConfigs, setPriceConfigs] = useState<AgentPriceConfigItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [teamStats, setTeamStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'subs' | 'commissions'>('subs');
  const [copyHint, setCopyHint] = useState(false);

  // 设价弹窗
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<SubAgent | null>(null);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [priceError, setPriceError] = useState('');

  // 提现弹窗
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMsg, setWithdrawMsg] = useState('');
  const [withdrawErr, setWithdrawErr] = useState('');

  const fetchAgent = useCallback(async () => {
    const res = await fetch('/api/agent', { headers: api(token).headers });
    const d = await res.json();
    if (d.success) {
      const data = d.data;
      setBalance(data.balance);
      setCommissionBalance(data.commissionBalance);
      setInviteCode(data.inviteCode);
      setSubAgents(data.subAgents);
      setCommissions(data.commissions);
      setPriceConfigs(data.priceConfigs);
      setTeamStats(data.teamStats);
    }
  }, [token]);

  const fetchProducts = useCallback(async () => {
    const res = await fetch('/api/products');
    const d = await res.json();
    if (d.success) setProducts(d.data);
  }, []);

  useEffect(() => {
    fetchAgent();
    fetchProducts();
  }, [fetchAgent, fetchProducts]);

  /* --- 设价 --- */
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
    if (!selectedSub || !selectedProduct || !newPrice || priceError) return;
    await fetch('/api/products', {
      method: 'POST',
      ...api(token),
      body: JSON.stringify({
        action: 'AGENT_SET_PRICE',
        agentId: '', // 后端从jwt获取
        subAgentId: selectedSub.id,
        productId: selectedProduct,
        newPrice: parseFloat(newPrice),
      }),
    });
    setShowPriceModal(false);
    setNewPrice('');
    setSelectedProduct('');
    setPriceError('');
    fetchAgent();
  };

  /* --- 提现 --- */
  const handleWithdraw = async () => {
    setWithdrawErr('');
    setWithdrawMsg('');
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 10) {
      setWithdrawErr('最低提现10元');
      return;
    }
    const res = await fetch('/api/agent', {
      method: 'POST',
      ...api(token),
      body: JSON.stringify({ action: 'WITHDRAW', amount, remark: '佣金提现' }),
    });
    const d = await res.json();
    if (!d.success) { setWithdrawErr(d.error); return; }
    setWithdrawMsg('提现申请已提交，等待管理员审核');
    setWithdrawAmount('');
    fetchAgent();
  };

  const copy = (text: string) => { navigator.clipboard.writeText(text); setCopyHint(true); setTimeout(() => setCopyHint(false), 2000); };

  const inviteUrl = `${window.location.origin}/?ref=${inviteCode}`;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* 头部卡片 */}
      <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-bold">代理控制台</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="bg-black border border-white/5 rounded-xl p-3">
            <div className="text-[10px] text-neutral-500">余额</div>
            <div className="text-lg font-mono font-bold mt-0.5">￥{balance.toFixed(2)}</div>
          </div>
          <div className="bg-black border border-white/5 rounded-xl p-3">
            <div className="text-[10px] text-neutral-500">佣金</div>
            <div className="text-lg font-mono font-bold text-emerald-400 mt-0.5">￥{commissionBalance.toFixed(2)}</div>
          </div>
          <div className="bg-black border border-white/5 rounded-xl p-3">
            <div className="text-[10px] text-neutral-500">子代理</div>
            <div className="text-lg font-bold mt-0.5">{teamStats?.subAgentCount || subAgents.length}</div>
          </div>
          <div className="bg-black border border-white/5 rounded-xl p-3">
            <div className="text-[10px] text-neutral-500">团队订单</div>
            <div className="text-lg font-bold mt-0.5">{teamStats?.teamOrders || 0}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <div className="flex-1 bg-blue-500/5 border border-blue-500/10 rounded-xl p-3 min-w-[200px]">
            <div className="text-[10px] text-blue-400 mb-1">邀请链接</div>
            <div className="flex gap-2">
              <code className="flex-1 bg-black rounded-lg px-2 py-1 text-[10px] text-blue-300 font-mono truncate">{inviteUrl}</code>
              <button onClick={() => copy(inviteUrl)} className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-[10px] hover:bg-blue-500/30">
                {copyHint ? '已复制' : '复制'}
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowWithdraw(true)}
            className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-emerald-500/20 transition"
          >
            佣金提现
          </button>
        </div>
      </div>

      {/* Tab */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab('subs')} className={`px-4 py-2 rounded-xl text-xs font-semibold ${activeTab === 'subs' ? 'bg-white text-black' : 'border border-white/10 text-neutral-400'}`}>
          子代理管理
        </button>
        <button onClick={() => setActiveTab('commissions')} className={`px-4 py-2 rounded-xl text-xs font-semibold ${activeTab === 'commissions' ? 'bg-white text-black' : 'border border-white/10 text-neutral-400'}`}>
          佣金记录
        </button>
      </div>

      {/* 子代理 */}
      {activeTab === 'subs' && (
        <div className="space-y-3">
          {subAgents.length === 0 && <div className="text-xs text-neutral-500 py-8 text-center">暂无子代理</div>}
          {subAgents.map(sub => {
            const configs = priceConfigs.filter(c => c.subAgentId === sub.id);
            return (
              <div key={sub.id} className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-semibold text-sm">{sub.username}</span>
                    <span className="text-[10px] text-neutral-500 ml-2">{sub.role === 'SUB_AGENT' ? '子代理' : '用户'}</span>
                    <div className="text-[10px] text-neutral-600 mt-0.5">注册于 {new Date(sub.createdAt).toLocaleDateString()}</div>
                  </div>
                  <button onClick={() => { setSelectedSub(sub); setShowPriceModal(true); setPriceError(''); setNewPrice(''); }}
                    className="bg-white text-black hover:bg-neutral-200 px-4 py-2 rounded-xl text-xs font-semibold">
                    设置拿货价
                  </button>
                </div>
                {configs.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <div className="text-[10px] text-neutral-500 mb-1">当前拿货价配置：</div>
                    {configs.map(c => (
                      <div key={c.id} className="flex justify-between text-[10px] bg-black rounded-lg px-3 py-1.5">
                        <span className="text-neutral-300">{c.product.title}</span>
                        <span className="font-mono text-emerald-400">拿货价 ￥{c.customPrice} / 零售 ￥{c.product.price}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 佣金记录 */}
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

      {/* 设价弹窗 */}
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
              <button onClick={() => setShowPriceModal(false)} className="flex-1 border border-white/10 py-2 rounded-xl text-xs text-neutral-400 hover:text-white">取消</button>
              <button onClick={handleSetPrice} disabled={!!priceError || !selectedProduct || !newPrice}
                className="flex-1 bg-white text-black py-2 rounded-xl text-xs font-semibold hover:bg-neutral-200 disabled:opacity-30">确认</button>
            </div>
          </div>
        </div>
      )}

      {/* 提现弹窗 */}
      {showWithdraw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold">佣金提现</h3>
            <div className="text-[10px] text-neutral-500">可提现佣金：<span className="text-emerald-400 font-mono">￥{commissionBalance.toFixed(2)}</span></div>
            <input type="number" placeholder="提现金额（最低10元）" value={withdrawAmount}
              onChange={e => setWithdrawAmount(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" />
            {withdrawErr && <div className="text-[11px] text-red-400">{withdrawErr}</div>}
            {withdrawMsg && <div className="text-[11px] text-emerald-400">{withdrawMsg}</div>}
            <div className="flex gap-3">
              <button onClick={() => { setShowWithdraw(false); setWithdrawErr(''); setWithdrawMsg(''); }} className="flex-1 border border-white/10 py-2 rounded-xl text-xs text-neutral-400">取消</button>
              <button onClick={handleWithdraw} className="flex-1 bg-white text-black py-2 rounded-xl text-xs font-semibold hover:bg-neutral-200">确认提现</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
