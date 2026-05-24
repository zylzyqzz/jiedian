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
    setOrderErr(''); setOrderMsg(''); setLoading(true); setAssignedNode(null);
    try {
      const res = await fetch('/api/orders', { method: 'POST', ...api(token), body: JSON.stringify({ productId, paymentType }) });
      const d = await res.json();
      if (!d.success) { setOrderErr(d.error); setPayModal(true); return; }
      if (d.data.payType === 'redirect') {
        setOrderMsg(`正在跳转支付... 订单号: ${d.data.orderNo}`);
        window.open(d.data.paymentUrl, '_blank');
      } else {
        setOrderMsg(`购买成功！订单号: ${d.data.orderNo}`);
        if (d.data.node) setAssignedNode(d.data.node);
      }
      fetchOrders(); setPayModal(true);
    } catch { setOrderErr('网络错误，请重试'); setPayModal(true); }
    finally { setLoading(false); }
  };

  const openPaySelect = (productId: string) => { setPendingProductId(productId); setShowPaySelect(true); };
  const openDetail = (product: Product) => { setSelectedProduct(product); setShowDetail(true); };
  const statusLabel: Record<string, string> = { PENDING: '待支付', PAID: '已支付', COMPLETED: '已完成' };
  const siteTitle = siteName || 'NodeHub';

  const features = [
    { icon: '🌍', title: '全球多地区部署', desc: '覆盖亚洲、北美、欧洲核心节点，BGP 多线接入，延迟低至 50ms，保障业务稳定运行。' },
    { icon: '🛡️', title: '专业运维保障', desc: 'T3+ 数据中心标准，24 小时人工守护，快速处理突发故障，48 小时不满意无条件退款。' },
    { icon: '⚡', title: '极速自动开通', desc: '下单即时自动分配节点，无需人工等待，连接信息一键复制，化繁为简，云理应如此。' },
  ];

  return (
    <div className="min-h-screen">
      {/* 顶部公告条 */}
      <div className="bg-blue-500/5 border-b border-blue-500/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-9 flex items-center gap-2 overflow-hidden">
          <span className="shrink-0 text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">公告</span>
          <div className="overflow-hidden whitespace-nowrap">
            <p className="text-[10px] sm:text-xs text-blue-300/70">
              新用户享 48 小时不满意无条件退款 · 全球多地区部署 · 即时自动开通 · 7×24 技术支持
            </p>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.04]">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/[0.06] via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-500/[0.03] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-indigo-500/[0.02] rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16 sm:pt-28 sm:pb-24 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/[0.04] text-blue-400 text-[11px] font-medium mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              全球多地区部署 · 即时自动开通
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
              <span className="text-white">优质网络</span>
              <span className="text-neutral-400 mx-2 sm:mx-3 font-light">·</span>
              <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">专业服务</span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-neutral-400 leading-relaxed max-w-xl mx-auto">
              {siteIntro || '全栈代理分销管理系统，支持多级代理、节点自动分配、佣金自动结算。'}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
              <button
                onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:w-auto px-8 py-3 bg-white text-black rounded-xl text-base font-semibold hover:bg-neutral-100 transition-all duration-200 active:scale-[0.97] shadow-lg shadow-white/5"
              >
                立刻选购
              </button>
              <button
                onClick={() => onViewChange('profile')}
                className="w-full sm:w-auto px-8 py-3 border border-white/15 text-white rounded-xl text-base font-medium hover:border-white/30 hover:bg-white/[0.03] transition-all duration-200 active:scale-[0.97]"
              >
                注册账户
              </button>
            </div>

            <div className="grid grid-cols-3 gap-8 sm:gap-12 mt-16 pt-12 border-t border-white/[0.05] max-w-md mx-auto">
              {[
                { value: '48h', label: '不满意退款' },
                { value: '99.9%', label: '在线率保障' },
                { value: '7×24', label: '技术支持' },
              ].map(item => (
                <div key={item.label} className="text-center">
                  <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{item.value}</div>
                  <div className="text-xs text-neutral-500 mt-1.5">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 热销产品 */}
      <section id="products" className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-12">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">热销产品</h2>
              <p className="text-sm text-neutral-500 mt-2">中国大陆优化线路，三网 CN2 GIA 国际精品网络，低延迟，高连接性</p>
            </div>
            <div className="flex p-1 bg-white/[0.03] rounded-xl self-start">
              {CATEGORIES.map(c => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    category === c.key ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mb-8">
            <button onClick={() => setActiveTab('products')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'products' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white bg-white/[0.02]'
              }`}>节点商品</button>
            <button onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'orders' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white bg-white/[0.02]'
              }`}>我的订单 ({orders.length})</button>
          </div>

          {activeTab === 'products' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
              {products.map((p, i) => (
                <div
                  key={p.id}
                  onClick={() => openDetail(p)}
                  className="group relative bg-[#0a0b0d] border border-white/[0.06] rounded-2xl overflow-hidden transition-all duration-300 hover:border-blue-500/20 hover:shadow-[0_0_60px_-15px_rgba(59,130,246,0.12)] hover:-translate-y-1 cursor-pointer"
                >
                  <div className={`h-1 w-full ${
                    p.category === 'LIVE'
                      ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500'
                      : 'bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500'
                  }`} />

                  <div className="p-6 sm:p-7">
                    <div className="flex items-start justify-between gap-3 mb-5">
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors truncate">{p.title}</h3>
                        <p className="text-sm text-neutral-500 mt-1.5 line-clamp-2 leading-relaxed">{p.description}</p>
                      </div>
                      {i === 1 && (
                        <span className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                          最受欢迎
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-neutral-400 leading-relaxed mb-6 py-5 border-y border-white/[0.04] line-clamp-3">{p.description}</p>

                    <div className="flex items-end justify-between">
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs text-neutral-500">¥</span>
                          <span className="text-3xl font-extrabold text-white tracking-tight">{p.price}</span>
                          <span className="text-sm text-neutral-500">/ 月</span>
                        </div>
                        {p.agentPrice > 0 && p.agentPrice < p.price && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-neutral-500 line-through">¥{p.price * 1.4}</span>
                            <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">限时特价</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); openPaySelect(p.id); }}
                        disabled={loading}
                        className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 active:scale-95 shadow-lg shadow-blue-500/20"
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
                <div className="text-center text-neutral-600 py-20">
                  <div className="text-3xl mb-3">📦</div>
                  <p className="text-sm">暂无订单记录</p>
                </div>
              )}
              {orders.map(o => (
                <div key={o.id} className="bg-[#0a0b0d] border border-white/[0.06] rounded-xl px-5 py-4 flex items-center justify-between hover:border-white/10 transition-all duration-200">
                  <div>
                    <div className="text-sm font-medium text-white">{o.productTitle}</div>
                    <div className="text-xs text-neutral-500 mt-1">{o.orderNo} · {new Date(o.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">¥{o.amount.toFixed(2)}</div>
                    <div className={`text-xs font-medium mt-0.5 ${
                      o.status === 'PAID' || o.status === 'COMPLETED' ? 'text-emerald-400' : 'text-amber-400'
                    }`}>{statusLabel[o.status] || o.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 为什么选择我们 */}
      <section className="border-t border-white/[0.04] py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              为什么选择 <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">{siteTitle}</span>
            </h2>
            <p className="text-sm text-neutral-500 mt-3">优质的网络，高性能的服务器，专业的技术团队，带给您最佳的云端服务体验</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {features.map((item, i) => (
              <div key={item.title} className="group bg-[#0a0b0d] border border-white/[0.06] rounded-2xl p-7 hover:border-white/[0.12] hover:-translate-y-1 transition-all duration-300">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-5 ${
                  i === 0 ? 'bg-blue-500/10 border border-blue-500/20' :
                  i === 1 ? 'bg-emerald-500/10 border border-emerald-500/20' :
                  'bg-purple-500/10 border border-purple-500/20'
                }`}>
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-3">{item.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              {siteTitle}
            </div>
            <div className="flex items-center gap-6 text-xs text-neutral-600">
              <span>用户中心</span>
              <span>产品中心</span>
              <span>联系我们</span>
            </div>
            <p className="text-xs text-neutral-600">© {new Date().getFullYear()} {siteTitle}. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* 详情弹窗 */}
      {showDetail && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={() => setShowDetail(false)}>
          <div className="bg-[#0a0b0d] border border-white/[0.08] w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}>
            {selectedProduct.image && (
              <div className="h-52 overflow-hidden bg-neutral-900">
                <img src={selectedProduct.image} alt={selectedProduct.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-7">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-bold text-white">{selectedProduct.title}</h3>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${
                  selectedProduct.category === 'LIVE'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}>
                  {selectedProduct.category === 'LIVE' ? '直播专线' : '非直播专线'}
                </span>
              </div>
              <p className="text-sm text-neutral-400 leading-relaxed mb-6">{selectedProduct.description}</p>
              <div className="flex items-center justify-between pt-5 border-t border-white/[0.05]">
                <div>
                  <span className="text-3xl font-extrabold text-white">¥{selectedProduct.price}</span>
                  <span className="text-sm text-neutral-500 ml-1">/ 月</span>
                </div>
                <button
                  onClick={() => { setShowDetail(false); openPaySelect(selectedProduct.id); }}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-base font-semibold transition-all duration-200 active:scale-95 shadow-lg shadow-blue-500/20"
                >
                  立即购买
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 支付选择弹窗 */}
      {showPaySelect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={() => setShowPaySelect(false)}>
          <div className="bg-[#0a0b0d] border border-white/[0.08] w-full max-w-sm rounded-2xl p-7 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">选择支付方式</h3>
              <button onClick={() => setShowPaySelect(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 hover:text-white hover:bg-white/5 transition-all text-lg">&times;</button>
            </div>
            {(user.role === 'AGENT' || user.role === 'SUB_AGENT') ? (
              <div>
                <p className="text-sm text-neutral-500 mb-4">代理 / 子代理使用余额直接扣款</p>
                <button
                  onClick={() => { setShowPaySelect(false); handleOrder(pendingProductId, 'balance'); }}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3.5 rounded-xl text-base font-semibold transition-all duration-200 active:scale-[0.98]"
                >
                  余额支付 · ¥{products.find(p => p.id === pendingProductId)?.price || 0}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {PAY_METHODS.map(m => (
                  <button
                    key={m.key}
                    onClick={() => { setShowPaySelect(false); handleOrder(pendingProductId, m.key); }}
                    className="w-full bg-black border border-white/[0.08] rounded-xl p-4 flex items-center gap-4 hover:border-blue-500/30 transition-all duration-200 active:scale-[0.98] text-left"
                  >
                    <span className="text-2xl">{m.key === 'alipay' ? '🔵' : m.key === 'wxpay' ? '🟢' : '🟡'}</span>
                    <div>
                      <div className="text-sm font-semibold text-white">{m.label}</div>
                      <div className="text-xs text-neutral-500 mt-0.5">{m.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 结果弹窗 */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={() => setPayModal(false)}>
          <div className="bg-[#0a0b0d] border border-white/[0.08] w-full max-w-sm rounded-2xl p-7 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4 bg-white/5">
                <span className={`text-2xl ${orderErr ? 'text-red-400' : 'text-emerald-400'}`}>
                  {orderErr ? '✕' : '✓'}
                </span>
              </div>
              <p className={`text-base font-semibold mb-1 ${orderErr ? 'text-red-400' : 'text-white'}`}>
                {orderErr ? '操作失败' : '操作成功'}
              </p>
              <p className="text-sm text-neutral-400 mb-4">{orderErr || orderMsg}</p>
              {assignedNode && (
                <div className="mt-4 p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl text-left">
                  <p className="text-xs text-neutral-500 mb-2 font-medium">节点连接信息</p>
                  <div className="space-y-1.5 text-sm text-neutral-300">
                    <p>地址: {assignedNode.host}:{assignedNode.port}</p>
                    <p>协议: {assignedNode.protocol}</p>
                    {assignedNode.password && <p>密码: {assignedNode.password}</p>}
                  </div>
                </div>
              )}
              <button
                onClick={() => { setPayModal(false); setAssignedNode(null); }}
                className="mt-5 w-full py-2.5 bg-white text-black rounded-xl text-sm font-semibold hover:bg-neutral-100 transition-all duration-200"
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
