'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { UserBrief, Product, OrderItem, ProductCategory } from '@/types';

interface HomeViewProps {
  user: UserBrief;
  token: string;
  onViewChange: (view: string) => void;
}

const api = (token: string) => ({
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
});

const PAY_METHODS = [
  { key: 'alipay', label: '支付宝', icon: '🔵', desc: '支持扫码/网页支付' },
  { key: 'wxpay', label: '微信支付', icon: '🟢', desc: '支持扫码/JSAPI' },
  { key: 'sandbox', label: '模拟支付', icon: '🟡', desc: '演示用，免真实付费' },
];

const CATEGORIES: { key: ProductCategory | 'ALL'; label: string }[] = [
  { key: 'ALL', label: '全部' },
  { key: 'LIVE', label: '📡 直播专线' },
  { key: 'NON_LIVE', label: '🌐 非直播专线' },
];

export default function HomeView({ user, token, onViewChange }: HomeViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [payModal, setPayModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [orderMsg, setOrderMsg] = useState('');
  const [orderErr, setOrderErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [assignedNode, setAssignedNode] = useState<any>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [siteIntro, setSiteIntro] = useState('');
  const [siteName, setSiteName] = useState('');

  /* ---- 支付方式选择 ---- */
  const [showPaySelect, setShowPaySelect] = useState(false);
  const [pendingProductId, setPendingProductId] = useState('');

  /* ---- 分类筛选 ---- */
  const [category, setCategory] = useState<ProductCategory | 'ALL'>('ALL');

  /* ---- 加载站点设置 ---- */
  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.success && d.data.siteIntro) setSiteIntro(d.data.siteIntro);
      if (d.success && d.data.siteName) setSiteName(d.data.siteName);
    }).catch(() => {});
  }, []);

  const fetchProducts = useCallback(async () => {
    const url = category === 'ALL' ? '/api/products' : `/api/products?category=${category}`;
    const res = await fetch(url);
    const d = await res.json();
    if (d.success) setProducts(d.data);
  }, [category]);

  const fetchOrders = useCallback(async () => {
    const res = await fetch('/api/orders', { headers: api(token).headers });
    const d = await res.json();
    if (d.success) setOrders(d.data.items || d.data);
  }, [token]);

  useEffect(() => {
    fetchProducts();
    if (activeTab === 'orders') fetchOrders();
  }, [fetchProducts, fetchOrders, activeTab]);

  /* ---- Scroll Reveal ---- */
  useEffect(() => {
    if (activeTab !== 'products') return;
    const timer = setTimeout(() => {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) e.target.classList.add('revealed');
        });
      }, { threshold: 0.1 });
      document.querySelectorAll('.card-reveal').forEach(el => observer.observe(el));
      return () => observer.disconnect();
    }, 100);
    return () => clearTimeout(timer);
  }, [products, activeTab, category]);

  const handleOrder = async (productId: string, paymentType: string) => {
    setOrderErr('');
    setOrderMsg('');
    setLoading(true);
    setAssignedNode(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        ...api(token),
        body: JSON.stringify({ productId, paymentType }),
      });
      const d = await res.json();
      if (!d.success) { setOrderErr(d.error); setPayModal(true); return; }

      if (d.data.payType === 'redirect') {
        setOrderMsg(`正在跳转支付...订单号: ${d.data.orderNo}`);
        window.open(d.data.paymentUrl, '_blank');
      } else {
        setOrderMsg(`购买成功！订单号: ${d.data.orderNo}`);
        if (d.data.node) setAssignedNode(d.data.node);
      }
      fetchOrders();
      setPayModal(true);
    } catch {
      setOrderErr('网络错误，请重试');
      setPayModal(true);
    } finally {
      setLoading(false);
    }
  };

  const openPaySelect = (productId: string) => {
    setPendingProductId(productId);
    setShowPaySelect(true);
  };

  const openDetail = (product: Product) => {
    setSelectedProduct(product);
    setShowDetail(true);
  };

  /* ---- 商品详情弹窗 ---- */
  const statusLabel: Record<string, string> = { PENDING: '待支付', PAID: '已支付', COMPLETED: '已完成' };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* ====== CSS 动画 ====== */}
      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        .card-reveal { opacity:0; transform:translateY(24px); transition: opacity .6s cubic-bezier(.25,.46,.45,.94), transform .6s cubic-bezier(.25,.46,.45,.94); }
        .card-reveal.revealed { opacity:1; transform:translateY(0); }
        .hover-glow:hover { box-shadow: 0 0 30px -8px rgba(255,255,255,.08); }
      `}</style>

      {/* 公司简介 */}
      {(siteIntro || true) && (
        <div className="card-reveal bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-transparent border border-blue-500/10 rounded-2xl p-5 sm:p-6 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0 mt-0.5">✦</span>
            <div>
              <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{siteName || 'NodeHub'}</h2>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed mt-2">
                {siteIntro || '全栈代理分销管理系统，支持多级代理、节点自动分配、佣金自动结算。'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 页面标题 */}
      <div className="card-reveal mb-6">
        <h2 className="text-xl font-bold">节点商店</h2>
        <p className="text-xs text-neutral-500 mt-1">选购适合你的节点服务</p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 mb-6 card-reveal">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${
            activeTab === 'products' ? 'bg-white text-black' : 'border border-white/10 text-neutral-400 hover:text-white hover:border-white/30'
          }`}
        >
          节点商品
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${
            activeTab === 'orders' ? 'bg-white text-black' : 'border border-white/10 text-neutral-400 hover:text-white hover:border-white/30'
          }`}
        >
          我的订单 ({orders.length})
        </button>
      </div>

      {/* 商品列表 */}
      {activeTab === 'products' && (
        <div>
          {/* 分类 Tab */}
          <div className="flex gap-2 mb-4 flex-wrap card-reveal">
            {CATEGORIES.map(c => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-300 active:scale-95 ${
                  category === c.key
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'border border-white/10 text-neutral-500 hover:text-white hover:border-white/30'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((p, i) => (
              <div
                key={p.id}
                onClick={() => openDetail(p)}
                className="group card-reveal bg-[#0A0A0A] border border-white/5 rounded-2xl flex flex-col overflow-hidden transition-all duration-500 hover:border-white/20 hover-glow cursor-pointer"
                style={{ animation: `fadeInUp .5s ease ${i * 0.06}s both` }}
              >
                {/* 图片区域 */}
                <div className="relative h-40 overflow-hidden bg-neutral-900">
                  {p.image ? (
                    <img src={p.image} alt={p.title} loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-600">📡</div>
                  )}
                  {/* 渐变叠加 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* 分类标签 */}
                  <span className={`absolute top-3 left-3 text-[9px] px-2 py-0.5 rounded-full font-semibold backdrop-blur-[4px] transition-all duration-300 group-hover:scale-105 ${
                    p.category === 'LIVE'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    {p.category === 'LIVE' ? '📡 直播专线' : '🌐 非直播专线'}
                  </span>
                </div>

                {/* 信息区域 */}
                <div className="p-4 flex flex-col gap-2 flex-1">
                  <h3 className="font-bold text-sm text-white transition-colors duration-300 group-hover:text-blue-400">{p.title}</h3>
                  <p className="text-[10px] text-neutral-500 leading-relaxed line-clamp-2 flex-1">{p.description}</p>
                  <div className="flex justify-between items-center pt-2 border-t border-white/5 mt-auto">
                    <span className="text-lg font-mono font-bold transition-all duration-300 group-hover:text-emerald-400">￥{p.price}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); openPaySelect(p.id); }}
                      disabled={loading}
                      className="bg-white text-black hover:bg-neutral-200 transition-all duration-300 px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50 active:scale-90"
                    >
                      {loading ? '处理中...' : '立即购买'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 商品详情弹窗 */}
      {showDetail && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowDetail(false)}>
          <div className="card-reveal revealed bg-[#0A0A0A] border border-white/10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            {/* 大图 */}
            <div className="relative h-56 bg-neutral-900">
              {selectedProduct.image ? (
                <img src={selectedProduct.image} alt={selectedProduct.title}
                  className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-600 text-4xl">📡</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent" />
              {/* 分类标签 */}
              <span className={`absolute top-3 left-3 text-[10px] px-2 py-0.5 rounded-full font-semibold backdrop-blur-[4px] ${
                selectedProduct.category === 'LIVE'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}>
                {selectedProduct.category === 'LIVE' ? '📡 直播专线' : '🌐 非直播专线'}
              </span>
              {/* 关闭按钮 */}
              <button
                onClick={() => setShowDetail(false)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white/80 flex items-center justify-center hover:bg-black/80 hover:text-white transition-all text-lg"
              >
                &times;
              </button>
            </div>

            {/* 详情内容 */}
            <div className="p-6 space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedProduct.title}</h2>
                <p className="text-sm text-neutral-400 leading-relaxed mt-3">
                  {selectedProduct.description}
                </p>
              </div>

              {/* 节点信息概要 */}
              <div className="bg-black border border-white/5 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-neutral-500">协议支持</span>
                  <span className="text-white">Trojan / VMess</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-neutral-500">流量限额</span>
                  <span className="text-white">500 GB / 月</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-neutral-500">带宽</span>
                  <span className="text-white">1 Gbps</span>
                </div>
              </div>

              {/* 价格 + 购买 */}
              <div className="flex justify-between items-center pt-4 border-t border-white/10">
                <div>
                  <div className="text-[10px] text-neutral-500 mb-1">价格</div>
                  <span className="text-2xl font-mono font-bold text-emerald-400">￥{selectedProduct.price}</span>
                </div>
                <button
                  onClick={() => { setShowDetail(false); setTimeout(() => openPaySelect(selectedProduct.id), 200); }}
                  className="bg-white text-black hover:bg-neutral-200 transition-all duration-300 px-6 py-3 rounded-xl text-sm font-semibold active:scale-90"
                >
                  立即购买
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 支付方式选择弹窗 */}
      {showPaySelect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="card-reveal revealed bg-[#0A0A0A] border border-white/10 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold">选择支付方式</h3>
              <button onClick={() => setShowPaySelect(false)} className="text-neutral-500 hover:text-white transition-colors text-lg">&times;</button>
            </div>

            {(user.role === 'AGENT' || user.role === 'SUB_AGENT') ? (
              <div className="space-y-2">
                <p className="text-[10px] text-neutral-400">代理/子代理使用余额直扣，无需选择支付方式</p>
                <button
                  onClick={() => { setShowPaySelect(false); handleOrder(pendingProductId, 'balance'); }}
                  className="w-full bg-white text-black py-3 rounded-xl text-sm font-semibold hover:bg-neutral-200 transition-all duration-300 active:scale-95"
                >
                  💰 余额支付（￥{products.find(p => p.id === pendingProductId)?.price || 0}）
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {PAY_METHODS.map(m => (
                  <button
                    key={m.key}
                    onClick={() => { setShowPaySelect(false); handleOrder(pendingProductId, m.key); }}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 flex items-center gap-3 hover:border-white/30 transition-all duration-300 active:scale-[0.98] text-left"
                  >
                    <span className="text-2xl">{m.icon}</span>
                    <div>
                      <div className="text-sm font-semibold">{m.label}</div>
                      <div className="text-[10px] text-neutral-500">{m.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 订单列表 */}
      {activeTab === 'orders' && (
        <div className="space-y-2">
          {orders.length === 0 && (
            <div className="card-reveal text-center text-neutral-500 py-12">暂无订单</div>
          )}
          {orders.map((o, i) => (
            <div key={o.id} className="card-reveal bg-[#0A0A0A] border border-white/5 rounded-lg px-4 py-3 flex justify-between items-center hover:border-white/20 transition-all duration-300"
              style={{ animation: `fadeInUp .4s ease ${i * 0.05}s both` }}>
              <div>
                <div className="text-sm text-white">{o.productTitle}</div>
                <div className="text-[10px] text-neutral-500 mt-0.5">
                  {o.orderNo} · {new Date(o.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-mono">￥{o.amount.toFixed(2)}</span>
                <div className={`text-[10px] ${
                  o.status === 'PAID' || o.status === 'COMPLETED'
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}>
                  {statusLabel[o.status] || o.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 结果弹窗 */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="card-reveal revealed bg-[#0A0A0A] border border-white/10 w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="text-4xl">{orderErr ? '❌' : '✅'}</div>
            <p className={orderErr ? 'text-red-400 text-sm' : 'text-emerald-400 text-sm'}>
              {orderErr || orderMsg}
            </p>

            {assignedNode && (
              <div className="bg-black border border-white/10 rounded-xl p-4 text-left space-y-2">
                <div className="text-[10px] text-blue-400 mb-1">节点已分配，连接信息：</div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="text-neutral-500">地址</div>
                  <div className="text-white font-mono">{assignedNode.host}:{assignedNode.port}</div>
                  <div className="text-neutral-500">协议</div>
                  <div className="text-white">{assignedNode.protocol.toUpperCase()}</div>
                  <div className="text-neutral-500">密码</div>
                  <div className="text-white font-mono truncate">{assignedNode.password}</div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `协议: ${assignedNode.protocol}\n地址: ${assignedNode.host}\n端口: ${assignedNode.port}\n密码: ${assignedNode.password}`
                    );
                  }}
                  className="mt-2 w-full bg-neutral-800 border border-white/10 text-white rounded-lg py-2 text-[10px] hover:bg-neutral-700 transition-all duration-300 active:scale-95"
                >
                  📋 一键复制连接信息
                </button>
              </div>
            )}

            <button
              onClick={() => setPayModal(false)}
              className="mt-2 bg-white text-black px-6 py-2 rounded-xl text-xs font-semibold hover:bg-neutral-200 transition-all duration-300 active:scale-95"
            >
              确定
            </button>
          </div>
        </div>
      )}
    </div>
  );
}