'use client';
import { useEffect, useState, useCallback } from 'react';

/* ========== 类型 ========== */
interface User {
  id: string; username: string; role: string;
  balance: number; commissionBalance: number; inviteCode: string;
}
interface Product {
  id: string; title: string; description: string; image: string;
  price: number; agentPrice: number; status: boolean;
}
interface SubAgent { id: string; username: string; role: string; createdAt: string; }
interface Commission { id: string; amount: number; remark: string; createdAt: string; }
interface PriceConfig { id: string; subAgentId: string; productId: string; customPrice: number; product: { id: string; title: string; price: number } }
interface PaymentCfg { id: string; platform: string; merchantId: string; apiKey: string; secretKey: string; notifyUrl: string; status: boolean; }
interface OrderItem { id: string; orderNo: string; amount: number; status: string; productTitle: string; createdAt: string; }
interface TxItem { id: string; type: string; walletType: string; amount: number; remark: string; createdAt: string; }
type View = 'auth' | 'home' | 'agent' | 'admin' | 'profile';

const statusLabel: Record<string, string> = { PENDING: '待支付', PAID: '已支付', COMPLETED: '已完成' };
const txLabel: Record<string, string> = { RECHARGE: '充值', PURCHASE: '消费', AGENT_REWARD: '招商奖励', DISTRIBUTE_REBATE: '分销返佣', WITHDRAW: '提现' };
const walletLabel: Record<string, string> = { BALANCE: '余额', COMMISSION: '佣金' };

export default function App() {
  /* ----- 全局状态 ----- */
  const [view, setView] = useState<View>('auth');
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [payModal, setPayModal] = useState(false);
  const [payOrderNo, setPayOrderNo] = useState('');

  /* ===== AUTH ===== */
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginRole, setLoginRole] = useState<'USER' | 'AGENT' | 'ADMIN'>('USER');
  const [formUser, setFormUser] = useState('');
  const [formPass, setFormPass] = useState('');
  const [formSec, setFormSec] = useState('');
  const [formRef, setFormRef] = useState('');
  const [authErr, setAuthErr] = useState('');

  // 从 URL 读取 ref 推荐码
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const r = p.get('ref');
    if (r) setFormRef(r);
  }, []);

  const handleAuth = async () => {
    setAuthErr('');
    if (authMode === 'register') {
      const body: any = { action: 'REGISTER', username: formUser, password: formPass, securityCode: formSec };
      if (formRef) body.refCode = formRef;
      const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json();
      if (!d.success) { setAuthErr(d.error); return; }
      setUser(d.user); setView('home'); return;
    }
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'LOGIN', username: formUser, password: formPass, loginRole }) });
    const d = await res.json();
    if (!d.success) { setAuthErr(d.error); return; }
    setUser(d.user);
    if (d.user.role === 'ADMIN') setView('admin');
    else if (d.user.role === 'AGENT' || d.user.role === 'SUB_AGENT') setView('agent');
    else setView('home');
  };

  /* ===== PRODUCTS ===== */
  const fetchProducts = async () => { const r = await fetch('/api/products'); setProducts(await r.json()); };
  useEffect(() => { fetchProducts(); }, []);

  const handleBuy = async (productId: string) => {
    if (!user) return;
    const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, productId, paymentMethod: 'BALANCE' }) });
    const d = await res.json();
    if (!d.success) { alert(d.error); return; }
    setPayOrderNo(d.orderNo); setPayModal(true);
  };

  const handleUpgrade = async () => {
    if (!user) return;
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'RECHARGE', userId: user.id, amount: 3000 }) });
    const d = await res.json();
    if (d.success) { setUser({ ...user, role: 'AGENT', balance: user.balance + 3000 }); setView('agent'); }
    else alert(d.error);
  };

  /* ===== PROFILE ===== */
  const [profile, setProfile] = useState<{ orders: OrderItem[]; transactions: TxItem[]; refLink: string; subAgentCount: number } | null>(null);
  const [profileTab, setProfileTab] = useState<'orders' | 'tx' | 'agent'>('orders');
  const fetchProfile = useCallback(async () => {
    if (!user) return;
    const r = await fetch(`/api/me?userId=${user.id}`);
    const d = await r.json();
    if (d.user) {
      setUser(prev => prev ? { ...prev, balance: d.user.balance, commissionBalance: d.user.commissionBalance } : prev);
      setProfile({ orders: d.orders || [], transactions: d.transactions || [], refLink: d.refLink || '', subAgentCount: d.subAgentCount || 0 });
    }
  }, [user?.id]);
  useEffect(() => { if (view === 'profile') fetchProfile(); }, [view]);

  /* ===== AGENT ===== */
  const [subAgents, setSubAgents] = useState<SubAgent[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [priceConfigs, setPriceConfigs] = useState<PriceConfig[]>([]);
  const [agentTab, setAgentTab] = useState<'subs' | 'commissions'>('subs');
  const [priceModal, setPriceModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<SubAgent | null>(null);
  const [selProduct, setSelProduct] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [priceErr, setPriceErr] = useState('');

  const fetchAgentData = async () => {
    if (!user) return;
    const res = await fetch(`/api/agent?userId=${user.id}`);
    const d = await res.json();
    if (d.balance !== undefined) {
      setUser(prev => prev ? { ...prev, balance: d.balance, commissionBalance: d.commissionBalance } : prev);
      setSubAgents(d.subAgents || []); setCommissions(d.commissions || []); setPriceConfigs(d.priceConfigs || []);
    }
  };
  useEffect(() => { if (view === 'agent') fetchAgentData(); }, [view]);
  const validatePrice = (v: number) => {
    const p = products.find(x => x.id === selProduct);
    setPriceErr(p && v < p.price * 0.75 ? `不能低于75折（最低 ￥${(p.price * 0.75).toFixed(2)}）` : '');
  };
  const handleSetPrice = async () => {
    if (!user || !selectedSub || !selProduct || !newPrice) return;
    const np = parseFloat(newPrice); const p = products.find(x => x.id === selProduct);
    if (!p || np < p.price * 0.75) return;
    await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'AGENT_SET_PRICE', agentId: user.id, subAgentId: selectedSub.id, productId: selProduct, newPrice: np }) });
    setPriceModal(false); setNewPrice(''); setSelProduct(''); setPriceErr(''); fetchAgentData();
  };

  /* ===== ADMIN ===== */
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [aForm, setAForm] = useState({ title: '', description: '', image: '', price: '', agentPrice: '' });
  const [paymentCfgs, setPaymentCfgs] = useState<PaymentCfg[]>([]);
  const [payForm, setPayForm] = useState({ platform: '', merchantId: '', apiKey: '', secretKey: '', notifyUrl: '' });
  const [showPayForm, setShowPayForm] = useState(false);
  const fetchAdmin = async () => {
    const [pr, pa] = await Promise.all([fetch('/api/products?all=true').then(r => r.json()), fetch('/api/payment').then(r => r.json())]);
    setAdminProducts(pr); setPaymentCfgs(pa);
  };
  useEffect(() => { if (view === 'admin') fetchAdmin(); }, [view]);
  const resetAForm = () => { setAForm({ title: '', description: '', image: '', price: '', agentPrice: '' }); setEditId(null); setShowForm(false); };
  const openEdit = (p: Product) => { setAForm({ title: p.title, description: p.description, image: p.image, price: String(p.price), agentPrice: String(p.agentPrice) }); setEditId(p.id); setShowForm(true); };
  const saveProduct = async () => {
    if (editId) await fetch('/api/products', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editId, ...aForm, price: parseFloat(aForm.price), agentPrice: parseFloat(aForm.agentPrice) }) });
    else await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'ADMIN_CREATE', ...aForm, price: parseFloat(aForm.price), agentPrice: parseFloat(aForm.agentPrice) }) });
    resetAForm(); fetchAdmin(); fetchProducts();
  };
  const toggleProduct = async (id: string, cur: boolean) => { await fetch('/api/products', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: !cur }) }); fetchAdmin(); fetchProducts(); };
  const deleteProduct = async (id: string) => { if (!confirm('确认删除？')) return; await fetch(`/api/products?id=${id}`, { method: 'DELETE' }); fetchAdmin(); fetchProducts(); };
  const savePayment = async () => {
    await fetch('/api/payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'CREATE', ...payForm }) });
    setPayForm({ platform: '', merchantId: '', apiKey: '', secretKey: '', notifyUrl: '' }); setShowPayForm(false); fetchAdmin();
  };
  const togglePayment = async (id: string) => { await fetch('/api/payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'TOGGLE', id }) }); fetchAdmin(); };
  const deletePayment = async (id: string) => { await fetch('/api/payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'DELETE', id }) }); fetchAdmin(); };

  /* ===== 修改密码弹窗 ===== */
  const [pwdModal, setPwdModal] = useState(false);
  const [pwdOld, setPwdOld] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdErr, setPwdErr] = useState('');
  const [pwdOk, setPwdOk] = useState('');
  const handleChangePwd = async () => {
    setPwdErr(''); setPwdOk('');
    if (!user) return;
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'CHANGE_PASSWORD', userId: user.id, oldPassword: pwdOld, newPassword: pwdNew }) });
    const d = await res.json();
    if (!d.success) { setPwdErr(d.error); return; }
    setPwdOk('密码修改成功'); setPwdOld(''); setPwdNew('');
  };

  /* ===== 复制 ===== */
  const copy = (text: string) => { navigator.clipboard.writeText(text); };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans antialiased selection:bg-blue-600">
      {/* ===== NAV ===== */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/5 bg-black/40 px-6 py-3 flex justify-between items-center">
        <button onClick={() => user ? setView('home') : setView('auth')} className="text-xl font-bold tracking-tighter bg-gradient-to-r from-white to-neutral-500 bg-clip-text text-transparent">NodeHub</button>
        <div className="flex items-center gap-3 text-xs">
          {user ? (
            <>
              <button onClick={() => setView('profile')} className="text-neutral-400 hover:text-white transition">个人中心</button>
              {user.role === 'AGENT' && <button onClick={() => setView('agent')} className="text-emerald-400 hover:text-emerald-300 transition">代理后台</button>}
              {user.role === 'ADMIN' && <button onClick={() => setView('admin')} className="text-red-400 hover:text-red-300 transition">管理后台</button>}
              <span className={`px-2 py-0.5 rounded-full border text-[10px] ${user.role === 'ADMIN' ? 'bg-red-500/10 text-red-400 border-red-500/20' : user.role === 'AGENT' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : user.role === 'SUB_AGENT' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                {user.role === 'ADMIN' ? '管理员' : user.role === 'AGENT' ? '一级代理' : user.role === 'SUB_AGENT' ? '子代理' : '用户'}
              </span>
              <span className="text-neutral-500">|</span>
              <span className="text-neutral-500 font-mono">￥{user.balance.toFixed(2)}</span>
              <button onClick={() => { setUser(null); setView('auth'); }} className="text-neutral-500 hover:text-white">退出</button>
            </>
          ) : <span className="text-neutral-500">2026 节点聚合分销系统</span>}
        </div>
      </nav>

      {/* ========== AUTH VIEW ========== */}
      {view === 'auth' && (
        <div className="min-h-[90vh] flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-md rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-center mb-1">{authMode === 'login' ? '欢迎回来' : '创建账号'}</h2>
            <p className="text-[11px] text-neutral-500 text-center mb-6">{authMode === 'login' ? '选择身份入口，安全登录' : '仅需账号密码 + 安全码，无需手机验证'}</p>

            {authMode === 'login' && (
              <div className="grid grid-cols-3 gap-2 mb-5">
                {[
                  { key: 'USER' as const, icon: '👤', label: '个人用户', desc: '购买节点服务' },
                  { key: 'AGENT' as const, icon: '💎', label: '代理登录', desc: '充3000元升级后可用' },
                  { key: 'ADMIN' as const, icon: '⚙️', label: '管理后台', desc: '仅限预设管理员' },
                ].map(r => (
                  <button key={r.key} onClick={() => setLoginRole(r.key)}
                    className={`py-3 rounded-xl text-center transition border ${loginRole === r.key ? 'bg-white text-black border-white' : 'border-white/10 text-neutral-400 hover:border-white/30'}`}>
                    <div className="text-lg mb-0.5">{r.icon}</div>
                    <div className="text-[11px] font-semibold">{r.label}</div>
                    <div className="text-[9px] opacity-50 mt-0.5">{r.desc}</div>
                  </button>
                ))}
              </div>
            )}
            {authMode === 'login' && loginRole === 'ADMIN' && (
              <div className="text-[10px] text-amber-400 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10 mb-3 text-center">管理员账号需预设，不开放注册</div>
            )}

            <input className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 mb-3" placeholder="用户名"
              value={formUser} onChange={e => setFormUser(e.target.value)} />
            <input className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 mb-3" placeholder="密码" type="password"
              value={formPass} onChange={e => setFormPass(e.target.value)} />
            {authMode === 'register' && (
              <>
                <input className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 mb-3" placeholder="安全码（找回账号凭证）"
                  value={formSec} onChange={e => setFormSec(e.target.value)} />
                {formRef && <div className="text-[10px] text-emerald-400 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10 mb-3">推荐人邀请码：{formRef}</div>}
              </>
            )}

            {authErr && <div className="text-[11px] text-red-400 bg-red-500/5 p-2 rounded-lg border border-red-500/10 mb-3">{authErr}</div>}

            <button onClick={handleAuth} className="w-full bg-white text-black hover:bg-neutral-200 transition py-2.5 rounded-xl text-sm font-semibold tracking-wide mb-4">
              {authMode === 'login' ? `以 ${loginRole === 'USER' ? '用户' : loginRole === 'AGENT' ? '代理' : '管理员'} 身份登录` : '立即注册'}
            </button>
            {loginRole !== 'ADMIN' && (
              <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthErr(''); }} className="w-full text-[11px] text-neutral-500 hover:text-white transition">
                {authMode === 'login' ? '没有账号？去注册 →' : '已有账号？去登录 →'}
              </button>
            )}
            {loginRole === 'ADMIN' && <div className="text-[11px] text-neutral-600 text-center">管理员账号由系统预设，联系上级开通</div>}
          </div>
        </div>
      )}

      {/* ========== USER HOME VIEW ========== */}
      {view === 'home' && user && (
        <>
          <header className="max-w-4xl mx-auto text-center pt-20 pb-12 px-4">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-4 bg-gradient-to-b from-white to-[#888] bg-clip-text text-transparent">全球高质量节点服务</h1>
            <p className="text-neutral-400 text-sm font-light tracking-widest uppercase">稳定 · 高速 · 低延迟 · 多地区部署</p>
          </header>
          <main className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {products.map((p: any) => (
              <div key={p.id} className="group bg-[#0A0A0A] border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-blue-500/40 transition">
                <div>
                  <img src={p.image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500'} className="w-full h-36 object-cover rounded-xl mb-4 opacity-80 group-hover:opacity-100 transition" alt="" />
                  <h3 className="text-lg font-bold tracking-tight text-neutral-100">{p.title}</h3>
                  <p className="text-xs text-neutral-400 font-light mt-2 line-clamp-3">{p.description}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/5">
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-xl font-mono text-white">￥{p.price}</span>
                    <span className="text-xs text-neutral-500">零售价</span>
                  </div>
                  <button onClick={() => handleBuy(p.id)} className="w-full bg-white text-black hover:bg-neutral-200 transition py-2 rounded-xl text-xs font-semibold">立即购买</button>
                </div>
              </div>
            ))}
          </main>
          <section className="max-w-4xl mx-auto my-20 px-4">
            <div className="bg-gradient-to-r from-neutral-900 via-neutral-950 to-black border border-white/10 p-8 rounded-2xl text-center">
              <h2 className="text-xl font-bold mb-2">开通大代理商权限</h2>
              <p className="text-xs text-neutral-400 max-w-lg mx-auto mb-6">一次性充值 3000 元自动升级一级代理，极低内部拿货价。发展子代理享受 25% 招商分润！</p>
              <button onClick={handleUpgrade} className="bg-blue-600 hover:bg-blue-500 transition text-white px-6 py-3 rounded-xl text-sm font-medium">一次性充值 3000 RMB 晋升代理</button>
            </div>
          </section>
        </>
      )}

      {/* ========== AGENT VIEW ========== */}
      {view === 'agent' && user && (
        <>
          <section className="max-w-5xl mx-auto px-6 pt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-5"><div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">现金余额（拿货）</div><div className="text-3xl font-mono font-bold text-white">￥{user.balance.toFixed(2)}</div></div>
            <div className="bg-[#0A0A0A] border border-emerald-500/20 rounded-2xl p-5"><div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">佣金余额（可提现）</div><div className="text-3xl font-mono font-bold text-emerald-400">￥{user.commissionBalance.toFixed(2)}</div></div>
            <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-5 flex flex-col justify-between"><div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">邀请码</div><code className="text-lg font-mono tracking-wider select-all">{user.inviteCode}</code></div>
          </section>
          <main className="max-w-6xl mx-auto px-6 pt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {products.map((p: any) => (
              <div key={p.id} className="group bg-[#0A0A0A] border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-emerald-500/40 transition">
                <div><img src={p.image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500'} className="w-full h-36 object-cover rounded-xl mb-4 opacity-80 group-hover:opacity-100 transition" alt="" /><h3 className="text-lg font-bold text-neutral-100">{p.title}</h3><p className="text-xs text-neutral-400 font-light mt-2 line-clamp-3">{p.description}</p></div>
                <div className="mt-6 pt-4 border-t border-white/5"><div className="flex items-baseline gap-2 mb-4"><span className="text-xl font-mono text-emerald-400">￥{p.agentPrice}</span><span className="text-xs text-neutral-500 line-through">￥{p.price}</span><span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">代理价</span></div><button onClick={() => handleBuy(p.id)} className="w-full bg-white text-black hover:bg-neutral-200 transition py-2 rounded-xl text-xs font-semibold">从余额一键拿货</button></div>
              </div>
            ))}
          </main>
          <section className="max-w-5xl mx-auto px-6 pt-10 pb-16">
            <div className="flex gap-1 mb-4 bg-[#0A0A0A] border border-white/5 rounded-xl p-1 w-fit">
              <button onClick={() => setAgentTab('subs')} className={`px-4 py-1.5 rounded-lg text-xs transition ${agentTab === 'subs' ? 'bg-white text-black font-semibold' : 'text-neutral-400'}`}>子代理 ({subAgents.length})</button>
              <button onClick={() => setAgentTab('commissions')} className={`px-4 py-1.5 rounded-lg text-xs transition ${agentTab === 'commissions' ? 'bg-white text-black font-semibold' : 'text-neutral-400'}`}>佣金流水 ({commissions.length})</button>
            </div>
            {agentTab === 'subs' && (subAgents.length === 0 ? <div className="text-xs text-neutral-500 py-8 text-center">暂无子代理，在个人中心复制你的邀请链接分享给他人</div> : subAgents.map(s => {
              const cfgs = priceConfigs.filter(c => c.subAgentId === s.id);
              return (<div key={s.id} className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2"><div><div className="font-semibold text-sm">{s.username}</div><div className="text-[10px] text-neutral-500">注册：{new Date(s.createdAt).toLocaleDateString()}</div>{cfgs.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{cfgs.map(c => <span key={c.id} className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">{c.product?.title}: ￥{c.customPrice}</span>)}</div>}</div><button onClick={() => { setSelectedSub(s); setPriceModal(true); setPriceErr(''); setNewPrice(''); }} className="bg-white text-black hover:bg-neutral-200 transition px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap">设置拿货价</button></div>);
            }))}
            {agentTab === 'commissions' && (commissions.length === 0 ? <div className="text-xs text-neutral-500 py-8 text-center">暂无佣金</div> : commissions.map(c => (<div key={c.id} className="flex justify-between items-center bg-[#0A0A0A] border border-white/5 rounded-lg px-4 py-2.5 mb-1"><div><div className="text-xs text-neutral-300">{c.remark}</div><div className="text-[10px] text-neutral-500">{new Date(c.createdAt).toLocaleString()}</div></div><span className="text-sm font-mono text-emerald-400">+￥{c.amount.toFixed(2)}</span></div>)))}
          </section>
        </>
      )}

      {/* ========== ADMIN VIEW ========== */}
      {view === 'admin' && user && (
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">
          <section>
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">商品管理</h2><button onClick={() => { resetAForm(); setShowForm(true); }} className="bg-white text-black hover:bg-neutral-200 transition px-4 py-2 rounded-xl text-xs font-semibold">+ 新增商品</button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {adminProducts.map(p => (<div key={p.id} className={`bg-[#0A0A0A] border rounded-2xl p-4 flex flex-col gap-3 ${p.status ? 'border-white/10' : 'border-red-500/20 opacity-50'}`}><div className="flex justify-between"><div><h3 className="font-bold text-sm">{p.title}</h3><p className="text-[10px] text-neutral-500 line-clamp-2">{p.description}</p></div><span className={`text-[10px] px-2 py-0.5 rounded-full border ${p.status ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{p.status ? '上架' : '下架'}</span></div><div className="flex gap-4 text-xs"><span className="text-neutral-400">零售 <span className="text-white font-mono">￥{p.price}</span></span><span className="text-neutral-400">代理 <span className="text-emerald-400 font-mono">￥{p.agentPrice}</span></span></div><div className="flex gap-2"><button onClick={() => openEdit(p)} className="flex-1 border border-white/10 py-1.5 rounded-lg text-[10px] text-neutral-400 hover:text-white transition">编辑</button><button onClick={() => toggleProduct(p.id, p.status)} className="flex-1 border border-white/10 py-1.5 rounded-lg text-[10px] text-neutral-400 hover:text-white transition">{p.status ? '下架' : '上架'}</button><button onClick={() => deleteProduct(p.id)} className="flex-1 border border-red-500/20 py-1.5 rounded-lg text-[10px] text-red-400 hover:bg-red-500/10 transition">删除</button></div></div>))}
            </div>
          </section>
          <section>
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">支付对接配置</h2><button onClick={() => setShowPayForm(true)} className="bg-white text-black hover:bg-neutral-200 transition px-4 py-2 rounded-xl text-xs font-semibold">+ 添加支付通道</button></div>
            {paymentCfgs.length === 0 && <div className="text-xs text-neutral-500 py-4">暂无支付配置</div>}
            {paymentCfgs.map(c => (<div key={c.id} className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4 mb-2 flex flex-col md:flex-row md:items-center justify-between gap-3"><div><div className="flex items-center gap-2"><span className="font-semibold text-sm">{c.platform}</span><span className={`text-[10px] px-2 py-0.5 rounded-full border ${c.status ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20'}`}>{c.status ? '已启用' : '已停用'}</span></div><div className="text-[10px] text-neutral-500 mt-1">商户号: {c.merchantId} | 回调: {c.notifyUrl}</div></div><div className="flex gap-2"><button onClick={() => togglePayment(c.id)} className="border border-white/10 py-1.5 px-3 rounded-lg text-[10px] text-neutral-400 hover:text-white transition">{c.status ? '停用' : '启用'}</button><button onClick={() => deletePayment(c.id)} className="border border-red-500/20 py-1.5 px-3 rounded-lg text-[10px] text-red-400 hover:bg-red-500/10 transition">删除</button></div></div>))}
          </section>
        </div>
      )}

      {/* ========== PROFILE VIEW（个人中心）========== */}
      {view === 'profile' && user && (
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          <div className="flex justify-between items-center"><h2 className="text-xl font-bold">个人中心</h2><button onClick={() => setPwdModal(true)} className="border border-white/10 px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white transition">修改密码</button></div>

          {/* 账户概览 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4"><div className="text-[10px] text-neutral-500 mb-1">余额</div><div className="text-xl font-mono font-bold">￥{user.balance.toFixed(2)}</div></div>
            <div className="bg-[#0A0A0A] border border-emerald-500/20 rounded-xl p-4"><div className="text-[10px] text-neutral-500 mb-1">佣金</div><div className="text-xl font-mono font-bold text-emerald-400">￥{user.commissionBalance.toFixed(2)}</div></div>
            <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4"><div className="text-[10px] text-neutral-500 mb-1">我的邀请码</div><div className="flex items-center gap-2"><code className="text-sm font-mono tracking-wider">{user.inviteCode}</code><button onClick={() => copy(user.inviteCode)} className="text-[10px] text-blue-400 hover:underline">复制</button></div></div>
            <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4"><div className="text-[10px] text-neutral-500 mb-1">注册时间</div><div className="text-sm text-neutral-300">{profile?.orders?.length ? '—' : '—'}</div></div>
          </div>

          {/* 代理申请（仅普通用户可见） */}
          {user.role === 'USER' && (
            <div className="bg-gradient-to-r from-blue-950 to-black border border-blue-500/20 rounded-2xl p-6">
              <h3 className="font-bold mb-2">申请成为代理商</h3>
              <p className="text-xs text-neutral-400 mb-4">一次性充值 3000 元立即升级为一级代理，享有极低内部拿货价 + 25% 招商返佣</p>
              <button onClick={handleUpgrade} className="bg-blue-600 hover:bg-blue-500 transition text-white px-5 py-2.5 rounded-xl text-xs font-medium">立即升级（充值 3000 RMB）</button>
            </div>
          )}

          {/* 分销推广（代理可见） */}
          {(user.role === 'AGENT' || user.role === 'SUB_AGENT') && (
            <div className="bg-gradient-to-r from-emerald-950 to-black border border-emerald-500/20 rounded-2xl p-6">
              <h3 className="font-bold mb-2">🔗 我的分销推广</h3>
              <p className="text-xs text-neutral-400 mb-3">分享此链接，他人注册后自动成为你的下线。对方首次充值激活时你获得 25% 招商奖励！</p>
              <div className="flex items-center gap-2 bg-black border border-white/10 rounded-xl px-4 py-3">
                <code className="flex-1 text-xs font-mono text-emerald-400 truncate select-all">{typeof window !== 'undefined' ? window.location.origin : ''}{profile?.refLink || ''}</code>
                <button onClick={() => copy(`${typeof window !== 'undefined' ? window.location.origin : ''}${profile?.refLink || ''}`)} className="text-[10px] text-blue-400 hover:underline whitespace-nowrap">复制链接</button>
              </div>
              {profile && <div className="text-[10px] text-neutral-500 mt-2">已发展 {profile.subAgentCount} 个子代理</div>}
            </div>
          )}

          {/* Tab 切换：购买记录 / 账目流水 */}
          <div className="flex gap-1 bg-[#0A0A0A] border border-white/5 rounded-xl p-1 w-fit">
            <button onClick={() => setProfileTab('orders')} className={`px-4 py-1.5 rounded-lg text-xs transition ${profileTab === 'orders' ? 'bg-white text-black font-semibold' : 'text-neutral-400'}`}>购买记录 ({profile?.orders?.length || 0})</button>
            <button onClick={() => setProfileTab('tx')} className={`px-4 py-1.5 rounded-lg text-xs transition ${profileTab === 'tx' ? 'bg-white text-black font-semibold' : 'text-neutral-400'}`}>账目流水 ({profile?.transactions?.length || 0})</button>
          </div>

          {profileTab === 'orders' && (
            <div className="space-y-2">
              {(!profile || profile.orders.length === 0) && <div className="text-xs text-neutral-500 py-12 text-center">暂无购买记录</div>}
              {profile?.orders.map(o => (
                <div key={o.id} className="bg-[#0A0A0A] border border-white/5 rounded-xl px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{o.productTitle || '已删除商品'}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${o.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : o.status === 'COMPLETED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>{statusLabel[o.status] || o.status}</span>
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">订单号: {o.orderNo} · {new Date(o.createdAt).toLocaleString()}</div>
                  </div>
                  <span className="text-sm font-mono text-white">￥{o.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {profileTab === 'tx' && (
            <div className="space-y-2">
              {(!profile || profile.transactions.length === 0) && <div className="text-xs text-neutral-500 py-12 text-center">暂无交易记录</div>}
              {profile?.transactions.map(t => {
                const isIn = t.walletType === 'COMMISSION' || t.type === 'RECHARGE';
                return (
                  <div key={t.id} className="bg-[#0A0A0A] border border-white/5 rounded-xl px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isIn ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{txLabel[t.type] || t.type}</span>
                        <span className="text-[10px] text-neutral-500">{walletLabel[t.walletType] || t.walletType}</span>
                      </div>
                      <div className="text-xs text-neutral-300 mt-1">{t.remark}</div>
                      <div className="text-[10px] text-neutral-500 mt-0.5">{new Date(t.createdAt).toLocaleString()}</div>
                    </div>
                    <span className={`text-sm font-mono font-semibold ${isIn ? 'text-emerald-400' : 'text-red-400'}`}>{isIn ? '+' : '-'}￥{t.amount.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== 商品编辑弹窗（Admin） ===== */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-md rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold">{editId ? '编辑商品' : '新增商品'}</h2>
            <input className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" placeholder="名称" value={aForm.title} onChange={e => setAForm({ ...aForm, title: e.target.value })} />
            <textarea className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white h-20 placeholder:text-neutral-600" placeholder="介绍" value={aForm.description} onChange={e => setAForm({ ...aForm, description: e.target.value })} />
            <input className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" placeholder="图片URL" value={aForm.image} onChange={e => setAForm({ ...aForm, image: e.target.value })} />
            <div className="flex gap-3"><input className="flex-1 bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white" placeholder="零售价" type="number" value={aForm.price} onChange={e => setAForm({ ...aForm, price: e.target.value })} /><input className="flex-1 bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white" placeholder="代理价" type="number" value={aForm.agentPrice} onChange={e => setAForm({ ...aForm, agentPrice: e.target.value })} /></div>
            <div className="flex gap-3 pt-2"><button onClick={resetAForm} className="flex-1 border border-white/10 py-2 rounded-xl text-xs text-neutral-400">取消</button><button onClick={saveProduct} className="flex-1 bg-white text-black py-2 rounded-xl text-xs font-semibold">保存</button></div>
          </div>
        </div>
      )}

      {/* ===== 支付配置弹窗 ===== */}
      {showPayForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-md rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold">添加支付通道</h2>
            <input className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" placeholder="平台名称" value={payForm.platform} onChange={e => setPayForm({ ...payForm, platform: e.target.value })} />
            <input className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" placeholder="商户ID" value={payForm.merchantId} onChange={e => setPayForm({ ...payForm, merchantId: e.target.value })} />
            <input className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" placeholder="API Key" value={payForm.apiKey} onChange={e => setPayForm({ ...payForm, apiKey: e.target.value })} />
            <input className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" placeholder="Secret Key" type="password" value={payForm.secretKey} onChange={e => setPayForm({ ...payForm, secretKey: e.target.value })} />
            <input className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" placeholder="回调URL" value={payForm.notifyUrl} onChange={e => setPayForm({ ...payForm, notifyUrl: e.target.value })} />
            <div className="flex gap-3 pt-2"><button onClick={() => setShowPayForm(false)} className="flex-1 border border-white/10 py-2 rounded-xl text-xs text-neutral-400">取消</button><button onClick={savePayment} className="flex-1 bg-white text-black py-2 rounded-xl text-xs font-semibold">保存</button></div>
          </div>
        </div>
      )}

      {/* ===== 代理改价弹窗 ===== */}
      {priceModal && selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-sm rounded-2xl p-6 space-y-4">
            <h3 className="font-bold">为 {selectedSub.username} 设置拿货价</h3>
            <select value={selProduct} onChange={e => { setSelProduct(e.target.value); validatePrice(parseFloat(newPrice || '0')); }} className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white"><option value="">选择商品</option>{products.filter(p => p.status).map(p => <option key={p.id} value={p.id}>{p.title}（零售￥{p.price} / 代理￥{p.agentPrice}）</option>)}</select>
            {selProduct && <div className="text-[10px] text-neutral-500">75折红线：最低 <span className="text-amber-400 font-mono">￥{((products.find(p => p.id === selProduct)?.price || 0) * 0.75).toFixed(2)}</span></div>}
            <input type="number" placeholder="自定义价格" value={newPrice} onChange={e => { setNewPrice(e.target.value); validatePrice(parseFloat(e.target.value || '0')); }} className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white" />
            {priceErr && <div className="text-[11px] text-red-400 bg-red-500/5 p-2 rounded-lg border border-red-500/10">{priceErr}</div>}
            <div className="flex gap-3 pt-1"><button onClick={() => setPriceModal(false)} className="flex-1 border border-white/10 py-2 rounded-xl text-xs text-neutral-400">取消</button><button onClick={handleSetPrice} disabled={!!priceErr || !selProduct || !newPrice} className="flex-1 bg-white text-black py-2 rounded-xl text-xs font-semibold disabled:opacity-30">确认</button></div>
          </div>
        </div>
      )}

      {/* ===== 修改密码弹窗 ===== */}
      {pwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-sm rounded-2xl p-6 space-y-4">
            <h3 className="font-bold">修改密码</h3>
            <input type="password" className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" placeholder="原密码" value={pwdOld} onChange={e => setPwdOld(e.target.value)} />
            <input type="password" className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" placeholder="新密码（至少4位）" value={pwdNew} onChange={e => setPwdNew(e.target.value)} />
            {pwdErr && <div className="text-[11px] text-red-400 bg-red-500/5 p-2 rounded-lg border border-red-500/10">{pwdErr}</div>}
            {pwdOk && <div className="text-[11px] text-emerald-400 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">{pwdOk}</div>}
            <div className="flex gap-3 pt-1"><button onClick={() => { setPwdModal(false); setPwdErr(''); setPwdOk(''); }} className="flex-1 border border-white/10 py-2 rounded-xl text-xs text-neutral-400">关闭</button><button onClick={handleChangePwd} className="flex-1 bg-white text-black py-2 rounded-xl text-xs font-semibold">确认修改</button></div>
          </div>
        </div>
      )}

      {/* ===== 支付成功弹窗 ===== */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl">
            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">✓</div>
            <h2 className="text-xl font-bold mb-1">支付成功 / 额度已扣</h2>
            <p className="text-[11px] text-neutral-400 mb-4">联系客服核对订单号完成交付</p>
            <div className="bg-black border border-white/5 rounded-xl p-3 text-left mb-4"><div className="flex justify-between items-center mb-1.5"><span className="text-[10px] text-neutral-500">订单号:</span><button onClick={() => copy(payOrderNo)} className="text-[10px] text-blue-400 hover:underline">复制</button></div><div className="font-mono text-xs text-white tracking-wider select-all">{payOrderNo}</div></div>
            <div className="space-y-2 text-xs mb-4"><div className="flex justify-between bg-white/5 px-3 py-2 rounded-lg"><span className="text-neutral-400">微信客服:</span><span className="text-white font-mono">NodeHub_VIP_01</span></div><div className="flex justify-between bg-white/5 px-3 py-2 rounded-lg"><span className="text-neutral-400">Telegram:</span><span className="text-blue-400 font-mono">@nodehub_service_bot</span></div></div>
            <button onClick={() => setPayModal(false)} className="w-full bg-white text-black hover:bg-neutral-200 transition py-2 rounded-xl text-xs font-semibold">关闭</button>
          </div>
        </div>
      )}
    </div>
  );
}
