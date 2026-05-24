'use client';
import { useState, useEffect, useCallback } from 'react';
import { UserBrief, OrderItem, TransactionItem } from '@/types';

interface ProfileViewProps {
  user: UserBrief;
  token: string;
}

const api = (token: string) => ({
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
});

const txLabel: Record<string, string> = {
  RECHARGE: '充值',
  PURCHASE: '消费',
  AGENT_REWARD: '招商奖励',
  DISTRIBUTE_REBATE: '分销返佣',
  WITHDRAW: '提现',
};
const walletLabel: Record<string, string> = { BALANCE: '余额', COMMISSION: '佣金' };
const statusLabel: Record<string, string> = { PENDING: '待支付', PAID: '已支付', COMPLETED: '已完成' };

export default function ProfileView({ user, token }: ProfileViewProps) {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [txs, setTxs] = useState<TransactionItem[]>([]);
  const [refLink, setRefLink] = useState('');
  const [activeTab, setActiveTab] = useState<'orders' | 'tx'>('orders');

  // 改密
  const [pwdModal, setPwdModal] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdErr, setPwdErr] = useState('');
  const [pwdOk, setPwdOk] = useState('');

  const fetchMe = useCallback(async () => {
    const res = await fetch('/api/me', { headers: api(token).headers });
    const d = await res.json();
    if (d.success) {
      setOrders(d.data.orders);
      setTxs(d.data.transactions);
      setRefLink(d.data.refLink);
    }
  }, [token]);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const handleChangePwd = async () => {
    setPwdErr('');
    setPwdOk('');
    const res = await fetch('/api/users', {
      method: 'POST',
      ...api(token),
      body: JSON.stringify({
        action: 'CHANGE_PASSWORD',
        oldPassword: oldPwd,
        newPassword: newPwd,
      }),
    });
    const d = await res.json();
    if (!d.success) { setPwdErr(d.error); return; }
    setPwdOk('密码修改成功');
    setOldPwd('');
    setNewPwd('');
  };

  const copy = (text: string) => navigator.clipboard.writeText(text);

  const inviteUrl = `${window.location.origin}/${refLink}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* 用户信息卡片 */}
      <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold">{user.username}</h2>
            <p className="text-xs text-neutral-500 mt-1">邀请码：{user.inviteCode}</p>
          </div>
          <button
            onClick={() => setPwdModal(true)}
            className="border border-white/10 py-1.5 px-3 rounded-lg text-[10px] text-neutral-400 hover:text-white transition"
          >
            修改密码
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-black border border-white/5 rounded-xl p-3">
            <div className="text-[10px] text-neutral-500">余额</div>
            <div className="text-lg font-mono font-bold mt-0.5">￥{user.balance.toFixed(2)}</div>
          </div>
          <div className="bg-black border border-white/5 rounded-xl p-3">
            <div className="text-[10px] text-neutral-500">佣金余额</div>
            <div className="text-lg font-mono font-bold text-emerald-400 mt-0.5">￥{user.commissionBalance.toFixed(2)}</div>
          </div>
        </div>
        {refLink && (
          <div className="mt-4 bg-blue-500/5 border border-blue-500/10 rounded-xl p-3">
            <div className="text-[10px] text-blue-400 mb-1">推荐链接（分享给新用户获得返佣）</div>
            <div className="flex gap-2">
              <code className="flex-1 bg-black rounded-lg px-3 py-1.5 text-xs text-blue-300 font-mono truncate">
                {inviteUrl}
              </code>
              <button
                onClick={() => copy(inviteUrl)}
                className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-lg text-[10px] hover:bg-blue-500/30 transition"
              >
                复制
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tab */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'orders' ? 'bg-white text-black' : 'border border-white/10 text-neutral-400 hover:text-white'
          }`}
        >
          我的订单 ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('tx')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'tx' ? 'bg-white text-black' : 'border border-white/10 text-neutral-400 hover:text-white'
          }`}
        >
          交易流水
        </button>
      </div>

      {/* 订单 */}
      {activeTab === 'orders' && (
        <div className="space-y-2">
          {orders.length === 0 && <div className="text-xs text-neutral-500 py-8 text-center">暂无订单</div>}
          {orders.map(o => (
            <div key={o.id} className="bg-[#0A0A0A] border border-white/5 rounded-lg px-4 py-3 flex justify-between items-center">
              <div>
                <div className="text-sm">{o.productTitle}</div>
                <div className="text-[10px] text-neutral-500 mt-0.5">
                  {o.orderNo} · {new Date(o.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-mono">￥{o.amount.toFixed(2)}</span>
                <div className={`text-[10px] ${o.status === 'PAID' || o.status === 'COMPLETED' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {statusLabel[o.status] || o.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 交易流水 */}
      {activeTab === 'tx' && (
        <div className="space-y-1">
          {txs.length === 0 && <div className="text-xs text-neutral-500 py-8 text-center">暂无交易记录</div>}
          {txs.map(t => (
            <div key={t.id} className="flex justify-between items-center bg-[#0A0A0A] border border-white/5 rounded-lg px-4 py-2.5">
              <div>
                <div className="text-xs text-neutral-300">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded mr-1.5 ${
                    t.walletType === 'COMMISSION' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    {walletLabel[t.walletType] || t.walletType}
                  </span>
                  {t.remark}
                </div>
                <div className="text-[10px] text-neutral-500 mt-0.5">{new Date(t.createdAt).toLocaleString()}</div>
              </div>
              <span className={`text-sm font-mono ${t.type === 'PURCHASE' || t.type === 'WITHDRAW' ? 'text-red-400' : 'text-emerald-400'}`}>
                {t.type === 'PURCHASE' || t.type === 'WITHDRAW' ? '-' : '+'}￥{t.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 改密弹窗 */}
      {pwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold">修改密码</h3>
            <input
              type="password"
              placeholder="原密码"
              value={oldPwd}
              onChange={e => setOldPwd(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600"
            />
            <input
              type="password"
              placeholder="新密码（至少4位）"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600"
            />
            {pwdErr && <div className="text-[11px] text-red-400">{pwdErr}</div>}
            {pwdOk && <div className="text-[11px] text-emerald-400">{pwdOk}</div>}
            <div className="flex gap-3">
              <button onClick={() => setPwdModal(false)} className="flex-1 border border-white/10 py-2 rounded-xl text-xs text-neutral-400 hover:text-white">取消</button>
              <button onClick={handleChangePwd} className="flex-1 bg-white text-black py-2 rounded-xl text-xs font-semibold hover:bg-neutral-200">确认修改</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}