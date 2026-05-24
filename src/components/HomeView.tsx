'use client';
import { useState, useEffect, useCallback } from 'react';
import { UserBrief, Product, OrderItem } from '@/types';

interface HomeViewProps {
  user: UserBrief;
  token: string;
  onViewChange: (view: string) => void;
}

const api = (token: string) => ({
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
});

export default function HomeView({ user, token, onViewChange }: HomeViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [payModal, setPayModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [orderMsg, setOrderMsg] = useState('');
  const [orderErr, setOrderErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [assignedNode, setAssignedNode] = useState<any>(null);

  const fetchProducts = useCallback(async () => {
    const res = await fetch('/api/products');
    const d = await res.json();
    if (d.success) setProducts(d.data);
  }, []);

  const fetchOrders = useCallback(async () => {
    const res = await fetch('/api/orders', { headers: api(token).headers });
    const d = await res.json();
    if (d.success) setOrders(d.data.items || d.data);
  }, [token]);

  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, [fetchProducts, fetchOrders]);

  const handleOrder = async (productId: string) => {
    setOrderErr('');
    setOrderMsg('');
    setLoading(true);
    setAssignedNode(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        ...api(token),
        body: JSON.stringify({ productId }),
      });
      const d = await res.json();
      if (!d.success) { setOrderErr(d.error); setPayModal(true); return; }

      if (d.data.payType === 'redirect') {
        setOrderMsg(`正在跳转支付...订单号: ${d.data.orderNo}`);
        window.open(d.data.paymentUrl, '_blank');
      } else {
        // 余额直扣 + 节点自动分配
        setOrderMsg(`购买成功！订单号: ${d.data.orderNo}`);
        if (d.data.node) {
          setAssignedNode(d.data.node);
        }
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

  const statusLabel: Record<string, string> = { PENDING: '待支付', PAID: '已支付', COMPLETED: '已完成' };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* 欢迎横幅 */}
      <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-bold mb-1">欢迎，{user.username}</h2>
        <div className="flex flex-wrap gap-4 text-sm text-neutral-400">
          <span>余额：<span className="text-white font-mono">￥{user.balance.toFixed(2)}</span></span>
          <span>佣金：<span className="text-emerald-400 font-mono">￥{user.commissionBalance.toFixed(2)}</span></span>
          <span>邀请码：<span className="text-blue-400 font-mono">{user.inviteCode}</span></span>
        </div>
        <button
          onClick={() => onViewChange('services')}
          className="mt-4 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-blue-500/20 transition inline-flex items-center gap-2"
        >
          <span>📡</span> 我的节点服务
        </button>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'products' ? 'bg-white text-black' : 'border border-white/10 text-neutral-400 hover:text-white'
          }`}
        >
          节点商品
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'orders' ? 'bg-white text-black' : 'border border-white/10 text-neutral-400 hover:text-white'
          }`}
        >
          我的订单 ({orders.length})
        </button>
      </div>

      {/* 商品列表 */}
      {activeTab === 'products' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p.id} className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-4 flex flex-col gap-3 hover:border-white/20 transition">
              {p.image && (
                <div className="w-full h-32 rounded-xl bg-neutral-800 overflow-hidden">
                  <img src={p.image} alt={p.title} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}
              <div>
                <h3 className="font-bold text-sm">{p.title}</h3>
                <p className="text-[10px] text-neutral-500 mt-1 line-clamp-2">{p.description}</p>
              </div>
              <div className="flex justify-between items-center mt-auto">
                <span className="text-lg font-mono font-bold">￥{p.price}</span>
                <button
                  onClick={() => handleOrder(p.id)}
                  disabled={loading}
                  className="bg-white text-black hover:bg-neutral-200 transition px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  {loading ? '处理中...' : '立即购买'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 订单列表 */}
      {activeTab === 'orders' && (
        <div className="space-y-2">
          {orders.length === 0 && (
            <div className="text-center text-neutral-500 py-12">暂无订单</div>
          )}
          {orders.map(o => (
            <div key={o.id} className="bg-[#0A0A0A] border border-white/5 rounded-lg px-4 py-3 flex justify-between items-center">
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
          <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="text-4xl">{orderErr ? '❌' : '✅'}</div>
            <p className={orderErr ? 'text-red-400 text-sm' : 'text-emerald-400 text-sm'}>
              {orderErr || orderMsg}
            </p>

            {/* 节点分配成功提示 */}
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
                  className="w-full bg-blue-500/20 text-blue-300 py-1.5 rounded-lg text-[10px] hover:bg-blue-500/30 transition mt-2"
                >
                  复制连接信息
                </button>
              </div>
            )}

            <button
              onClick={() => { setPayModal(false); fetchOrders(); }}
              className="w-full bg-white text-black py-2 rounded-xl text-xs font-semibold hover:bg-neutral-200 transition"
            >
              确定
            </button>
            {assignedNode && (
              <button
                onClick={() => { setPayModal(false); onViewChange('services'); }}
                className="w-full text-[10px] text-blue-400 hover:text-blue-300 transition"
              >
                前往「我的服务」查看全部节点 →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
