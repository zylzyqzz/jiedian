'use client';
import { useState, useEffect, useCallback } from 'react';
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
  { key: 'alipay', label: '支付宝', desc: '扫码 / 网页支付' },
  { key: 'wxpay', label: '微信支付', desc: '扫码 / JSAPI' },
  { key: 'sandbox', label: '模拟支付', desc: '演示环境，免真实付费' },
];

const CATEGORIES: { key: ProductCategory | 'ALL'; label: string }[] = [
  { key: 'ALL', label: '全部产品' },
  { key: 'LIVE', label: '直播专线' },
  { key: 'NON_LIVE', label: '非直播专线' },
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
  const [showDetail, setShowDetail] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [siteIntro, setSiteIntro] = useState('');
  const [siteName, setSiteName] = useState('');

  const [showPaySelect, setShowPaySelect] = useState(false);
  const [pendingProductId, setPendingProductId] = useState('');
  const [category, setCategory] = useState<ProductCategory | 'ALL'>('ALL');

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
        setOrderMsg(`正在跳转支付... 订单号: ${d.data.orderNo}`);
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

  const statusLabel: Record<string, string> = { PENDING: '待支付', PAID: '已支付', COMPLETED: '已完成' };
  const siteTitle = siteName || 'NodeHub';

  return (
    <div className="min-h-screen">
      {/* ═══════════════ Hero ═══════════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/3 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-purple-500/3 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-12 sm:pt-24 sm:pb-20 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-[11px] font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              全球多地区部署 · 即时自动开通
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
              <span className="bg-gradient-to-r from-white via-white to-neutral-400 bg-clip-text text-transparent">
                {siteTitle}
              </span>
            </h1>

            <p className="mt-4 sm:mt-6 text-sm sm:text-base text-neutral-400 leading-relaxed max-w-xl mx-auto">
              {siteIntro || '全栈代理分销管理系统，支持多级代理、节点自动分配、佣金自动结算。'}
            </p>

            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-6 py-2.5 bg-white text-black rounded-lg text-sm font-semibold hover:bg-neutral-200 transition-all duration-200 active:scale-95"
              >
                立刻选购
              </button>
              <button
                onClick={() => onViewChange('profile')}
                className="px-6 py-2.5 border border-white/15 text-white rounded-lg text-sm font-medium hover:border-white/30 hover:bg-white/5 transition-all duration-200 active:scale-95"
              >
                注册账户
              </button>
            </div>

            {/* 信任指标 */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 mt-12 sm:mt-16 max-w-lg mx-auto">
              {[
                { value: '48h', label: '不满意退款' },
                { value: '99.9%', label: '在线率保障' },
                { value: '7×24', label: '技术支持' },
              ].map(item => (
                <div key={item.label} className="text-center">
                  <div className="text-lg sm:text-xl font-bold text-white">{item.value}</div>
                  <div className="text-[10px] sm:text-xs text-neutral-500 mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ 产品区 ═══════════════ */}
      <section id="products-section" className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">全部产品</h2>
            <p className="text-sm text-neutral-500 mt-1">中国大陆优化线路，低延迟，高连接性</p>
          </div>
          <div className="flex gap-1.5 p-1 bg-white/3 rounded-lg">
            {CATEGORIES.map(c => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  category === c.key
                    ? 'bg-white/10 text-white'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-1 mb-6">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
              activeTab === 'products'
                ? 'bg-white text-black'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            节点商品
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
              activeTab === 'orders'
                ? 'bg-white text-black'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            我的订单 ({orders.length})
          </button>
        </div>

        {activeTab === 'products' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {products.map((p) => (
              <div
                key={p.id}
                onClick={() => openDetail(p)}
                className="group relative bg-[#0b0c0e] border border-white/5 rounded-xl overflow-hidden transition-all duration-300 hover:border-blue-500/30 hover:shadow-[0_0_40px_-12px_rgba(59,130,246,0.15)] cursor-pointer"
              >
                <div className={`h-0.5 w-full ${p.category === 'LIVE' ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}`} />

                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">{p.title}</h3>
                      <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2 leading-relaxed">{p.description}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      p.category === 'LIVE'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                      {p.category === 'LIVE' ? '直播' : '专线'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-5">
                    {[
                      { label: '协议', value: 'Trojan/VMess' },
                      { label: '带宽', value: '1Gbps' },
                      { label: '流量', value: '500GB/月' },
                      { label: 'IP', value: '独立公网IP' },
                    ].map(spec => (
                      <div key={spec.label} className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                        <span className="w-1 h-1 rounded-full bg-neutral-600" />
                        {spec.label}: <span className="text-neutral-300">{spec.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-neutral-500">¥</span>
                        <span className="text-xl font-bold text-white">{p.price}</span>
                        <span className="text-xs text-neutral-500">/月</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); openPaySelect(p.id); }}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-50 active:scale-95"
                    >
                      立即购买
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-2">
            {orders.length === 0 && (
              <div className="text-center text-neutral-600 py-16 text-sm">暂无订单记录</div>
            )}
            {orders.map((o) => (
              <div key={o.id} className="bg-[#0b0c0e] border border-white/5 rounded-lg px-5 py-4 flex items-center justify-between hover:border-white/10 transition-all duration-200">
                <div>
                  <div className="text-sm text-white font-medium">{o.productTitle}</div>
                  <div className="text-[11px] text-neutral-500 mt-1">
                    {o.orderNo} · {new Date(o.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-white">¥{o.amount.toFixed(2)}</div>
                  <div className={`text-[10px] font-medium mt-0.5 ${
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
      </section>

      {/* ═══════════════ 信任板块 ═══════════════ */}
      <section className="border-t border-white/5 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-xl sm:text-2xl font-bold text-white">为什么选择 {siteTitle}</h2>
            <p className="text-sm text-neutral-500 mt-2">优质网络 · 专业服务 · 即时开通</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                  </svg>
                ),
                title: '全球多地区部署',
                desc: '覆盖亚洲、北美、欧洲核心节点，BGP 多线接入，延迟低至 &lt;50ms，保障业务稳定运行。',
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                ),
                title: '专业运维保障',
                desc: 'T3+ 数据中心标准，24 小时人工守护，快速处理突发故障，48 小时不满意无条件退款。',
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                ),
                title: '极速自动开通',
                desc: '下单即时自动分配节点，无需人工等待，连接信息一键复制，化繁为简，云理应如此。',
              },
            ].map(item => (
              <div key={item.title} className="bg-[#0b0c0e] border border-white/5 rounded-xl p-6 hover:border-white/10 transition-all duration-300">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ Footer ═══════════════ */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs text-neutral-600">{siteTitle} · 全球高质量节点服务</p>
          <p className="text-[10px] text-neutral-700 mt-1">
            © {new Date().getFullYear()} {siteTitle}. All rights reserved.
          </p>
        </div>
      </footer>

      {/* ═══════════════ 详情弹窗 ═══════════════ */}
      {showDetail && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowDetail(false)}>
          <div className="bg-[#0b0c0e] border border-white/10 w-full max-w-md rounded-xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}>
            {selectedProduct.image && (
              <div className="h-48 overflow-hidden bg-neutral-900">
                <img src={selectedProduct.image} alt={selectedProduct.title}
                  className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-bold text-white">{selectedProduct.title}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  selectedProduct.category === 'LIVE'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}>
                  {selectedProduct.category === 'LIVE' ? '直播专线' : '非直播专线'}
                </span>
              </div>
              <p className="text-sm text-neutral-400 leading-relaxed mb-4">{selectedProduct.description}</p>
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div>
                  <span className="text-2xl font-bold text-white">¥{selectedProduct.price}</span>
                  <span className="text-xs text-neutral-500 ml-1">/月</span>
                </div>
                <button
                  onClick={() => { setShowDetail(false); openPaySelect(selectedProduct.id); }}
                  className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-all duration-200 active:scale-95"
                >
                  立即购买
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ 支付选择弹窗 ═══════════════ */}
      {showPaySelect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowPaySelect(false)}>
          <div className="bg-[#0b0c0e] border border-white/10 w-full max-w-sm rounded-xl p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">选择支付方式</h3>
              <button onClick={() => setShowPaySelect(false)}
                className="text-neutral-500 hover:text-white transition-colors text-lg">&times;</button>
            </div>

            {(user.role === 'AGENT' || user.role === 'SUB_AGENT') ? (
              <div>
                <p className="text-xs text-neutral-500 mb-3">代理/子代理使用余额直扣</p>
                <button
                  onClick={() => { setShowPaySelect(false); handleOrder(pendingProductId, 'balance'); }}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-95"
                >
                  余额支付 · ¥{products.find(p => p.id === pendingProductId)?.price || 0}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {PAY_METHODS.map(m => (
                  <button
                    key={m.key}
                    onClick={() => { setShowPaySelect(false); handleOrder(pendingProductId, m.key); }}
                    className="w-full bg-black border border-white/10 rounded-lg p-3.5 flex items-center gap-3 hover:border-blue-500/30 transition-all duration-200 active:scale-[0.98] text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-sm">
                      {m.key === 'alipay' ? '🔵' : m.key === 'wxpay' ? '🟢' : '🟡'}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{m.label}</div>
                      <div className="text-[11px] text-neutral-500">{m.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ 结果弹窗 ═══════════════ */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setPayModal(false)}>
          <div className="bg-[#0b0c0e] border border-white/10 w-full max-w-sm rounded-xl p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className={`text-3xl mb-3 ${orderErr ? 'text-red-400' : 'text-emerald-400'}`}>
                {orderErr ? '✕' : '✓'}
              </div>
              <p className={`text-sm font-medium ${orderErr ? 'text-red-400' : 'text-white'}`}>
                {orderErr || orderMsg || '操作完成'}
              </p>
              {assignedNode && (
                <div className="mt-4 p-3 bg-white/5 rounded-lg text-left">
                  <p className="text-[11px] text-neutral-400 mb-2">节点连接信息</p>
                  <div className="space-y-1.5 text-xs text-neutral-300">
                    <p>地址: {assignedNode.host}:{assignedNode.port}</p>
                    <p>协议: {assignedNode.protocol}</p>
                    {assignedNode.password && <p>密码: {assignedNode.password}</p>}
                  </div>
                </div>
              )}
              <button
                onClick={() => { setPayModal(false); setAssignedNode(null); }}
                className="mt-5 px-6 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-neutral-200 transition-all duration-200"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
