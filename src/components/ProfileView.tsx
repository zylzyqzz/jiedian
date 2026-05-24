'use client';
import { useState, useEffect, useCallback } from 'react';
import { UserBrief, OrderItem, TransactionItem, NodeBrief } from '@/types';

interface ProfileViewProps {
  user: UserBrief;
  token: string;
}

const api = (token: string) => ({
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
});

const txLabel: Record<string, string> = {
  RECHARGE: '充值', PURCHASE: '消费', AGENT_REWARD: '招商奖励',
  DISTRIBUTE_REBATE: '分销返佣', WITHDRAW: '提现',
};
const walletLabel: Record<string, string> = { BALANCE: '余额', COMMISSION: '佣金' };
const statusLabel: Record<string, string> = { PENDING: '待支付', PAID: '已支付', COMPLETED: '已完成' };

/* ---- 节点服务辅助函数 ---- */
const protocolColor: Record<string, string> = {
  trojan: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  vmess: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  ss: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  vless: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};
const stLabel: Record<string, { text: string; cls: string }> = {
  ASSIGNED: { text: '使用中', cls: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10' },
  EXPIRED: { text: '已过期', cls: 'text-red-400 bg-red-500/5 border-red-500/10' },
  MAINTENANCE: { text: '维护中', cls: 'text-amber-400 bg-amber-500/5 border-amber-500/10' },
};
const daysLeft = (expireAt: string | null): number => {
  if (!expireAt) return 0;
  return Math.max(0, Math.ceil((new Date(expireAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
};
const trafficPercent = (used: number, limit: number): number => {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
};

export default function ProfileView({ user, token }: ProfileViewProps) {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [txs, setTxs] = useState<TransactionItem[]>([]);
  const [services, setServices] = useState<NodeBrief[]>([]);
  const [refLink, setRefLink] = useState('');
  const [rebateRate, setRebateRate] = useState('20');
  const [withdrawMin, setWithdrawMin] = useState('100');

  // 提现
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [wdName, setWdName] = useState('');
  const [wdPhone, setWdPhone] = useState('');
  const [wdAmount, setWdAmount] = useState('');
  const [wdErr, setWdErr] = useState('');
  const [wdOk, setWdOk] = useState('');
  const [wdLoading, setWdLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'tx' | 'services'>('services');
  const [expandedSvc, setExpandedSvc] = useState<number | null>(null);
  const [copyIdx, setCopyIdx] = useState<number | null>(null);

  // 改密
  const [pwdModal, setPwdModal] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdErr, setPwdErr] = useState('');
  const [pwdOk, setPwdOk] = useState('');

  const fetchData = useCallback(async () => {
    const [meRes, svcRes] = await Promise.all([
      fetch('/api/me', { headers: api(token).headers }),
      fetch('/api/services', { headers: api(token).headers }),
    ]);
    const me = await meRes.json();
    if (me.success) {
      setOrders(me.data.orders);
      setTxs(me.data.transactions);
      setRefLink(me.data.refLink);
    }
    const svc = await svcRes.json();
    if (svc.success) setServices(svc.data);
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 获取返佣比例用于邀请链接展示
  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.success && d.data.rebateRate) setRebateRate(d.data.rebateRate);
      if (d.success && d.data.withdrawMin) setWithdrawMin(d.data.withdrawMin);
    }).catch(() => {});
  }, []);

  const handleChangePwd = async () => {
    setPwdErr(''); setPwdOk('');
    const res = await fetch('/api/users', {
      method: 'POST', ...api(token),
      body: JSON.stringify({ action: 'CHANGE_PASSWORD', oldPassword: oldPwd, newPassword: newPwd }),
    });
    const d = await res.json();
    if (!d.success) { setPwdErr(d.error); return; }
    setPwdOk('密码修改成功');
    setOldPwd(''); setNewPwd('');
  };

  const copy = (text: string, idx?: number) => {
    navigator.clipboard.writeText(text);
    if (idx !== undefined) { setCopyIdx(idx); setTimeout(() => setCopyIdx(null), 2000); }
  };
  const copyAll = (s: NodeBrief) => {
    navigator.clipboard.writeText(`协议: ${s.protocol}\n地址: ${s.host}\n端口: ${s.port}\n密码: ${s.password}`);
  };

  const handleWithdraw = async () => {
    setWdErr(''); setWdOk('');
    if (!wdName.trim()) { setWdErr('请输入真实姓名'); return; }
    if (!wdPhone.trim()) { setWdErr('请输入手机号'); return; }
    const amt = parseFloat(wdAmount);
    if (isNaN(amt) || amt <= 0) { setWdErr('请输入有效提现金额'); return; }
    if (amt < parseFloat(withdrawMin)) { setWdErr(`最低提现金额为 ¥${withdrawMin}`); return; }
    setWdLoading(true);
    try {
      const res = await fetch('/api/agent', {
        method: 'POST', ...api(token),
        body: JSON.stringify({ action: 'WITHDRAW', amount: amt, realName: wdName, phone: wdPhone, remark: '佣金提现' }),
      });
      const d = await res.json();
      if (!d.success) { setWdErr(d.error); return; }
      setWdOk(d.message || '提现申请已提交');
      setWdName(''); setWdPhone(''); setWdAmount('');
    } catch { setWdErr('网络错误'); }
    finally { setWdLoading(false); }
  };

  const inviteUrl = refLink ? `${window.location.origin}/${refLink}` : '';

  /* ---- Tab 统计 ---- */
  const tabCount = (tab: string) => {
    if (tab === 'orders') return orders.length;
    if (tab === 'services') return services.length;
    return '';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* ====== 用户信息总览卡片 ====== */}
      <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden">
        {/* 头部 */}
        <div className="p-5 sm:p-6 border-b border-white/5">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold">{user.username}</h2>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    ID: {user.id.slice(0, 8)}...
                  </p>
                </div>
              </div>
            </div>
            <button onClick={() => setPwdModal(true)}
              className="border border-white/10 py-1.5 px-3 rounded-lg text-[10px] text-neutral-400 hover:text-white transition">
              修改密码
            </button>
          </div>
        </div>

        {/* 资产概览 */}
        <div className="grid grid-cols-2 gap-px bg-white/5">
          <div className="bg-[#0A0A0A] p-5 sm:p-6">
            <div className="text-[10px] text-neutral-500 mb-1">💰 余额</div>
            <div className="text-xl sm:text-2xl font-mono font-bold">￥{user.balance.toFixed(2)}</div>
          </div>
          <div className="bg-[#0A0A0A] p-5 sm:p-6">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-neutral-500">📊 佣金</span>
              {user.commissionBalance >= parseFloat(withdrawMin) && (
                <button onClick={() => setWithdrawModal(true)}
                  className="text-[10px] text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 transition">
                  提现
                </button>
              )}
            </div>
            <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-400">￥{user.commissionBalance.toFixed(2)}</div>
            {user.commissionBalance > 0 && user.commissionBalance < parseFloat(withdrawMin) && (
              <p className="text-[10px] text-neutral-600 mt-1">满 ¥{withdrawMin} 可提现</p>
            )}
          </div>
        </div>

        {/* 邀请链接 */}
        {inviteUrl && (
          <div className="p-5 sm:p-6 bg-blue-500/5 border-t border-blue-500/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-blue-400 font-medium">推荐链接</span>
              <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-semibold">推荐奖励 {rebateRate}%</span>
            </div>
            <p className="text-[11px] text-neutral-500 mb-3">分享此链接，对方注册并购买后，你将获得 {rebateRate}% 返佣</p>
            <div className="flex gap-2">
              <code className="flex-1 bg-black rounded-lg px-3 py-2 text-xs text-blue-300 font-mono truncate">{inviteUrl}</code>
              <button onClick={() => copy(inviteUrl)} className="bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-lg text-xs hover:bg-blue-500/30 transition shrink-0">
                复制
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ====== Tab 切换 ====== */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'services', label: '📡 我的节点', count: tabCount('services') },
          { key: 'orders', label: '📋 我的订单', count: tabCount('orders') },
          { key: 'tx', label: '💳 交易流水' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-white text-black'
                : 'border border-white/10 text-neutral-400 hover:text-white hover:border-white/30'
            }`}>
            {tab.label} {tab.count !== '' && `(${tab.count})`}
          </button>
        ))}
      </div>

      {/* ====== 节点服务 ====== */}
      {activeTab === 'services' && (
        <div className="space-y-3">
          {services.length === 0 && (
            <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-12 text-center">
              <div className="text-4xl mb-4">📡</div>
              <p className="text-neutral-400 text-sm mb-2">暂无已购服务</p>
              <p className="text-neutral-600 text-xs">购买节点后，连接信息将在此展示</p>
            </div>
          )}
          {services.map((s, idx) => {
            const remain = daysLeft(s.expireAt);
            const tPct = trafficPercent(s.trafficUsed, s.trafficLimit);
            const st = stLabel[s.status as string] || stLabel.ASSIGNED;
            return (
              <div key={s.id} className="bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition">
                <div className="p-4 sm:p-5 cursor-pointer" onClick={() => setExpandedSvc(expandedSvc === idx ? null : idx)}>
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-sm truncate">{s.productTitle}</h3>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full border shrink-0 ${st.cls}`}>{st.text}</span>
                      </div>
                      <div className="text-[10px] text-neutral-500 truncate">
                        {s.host}:{s.port} · {s.protocol.toUpperCase()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className={`text-[9px] px-2 py-1 rounded-lg border ${protocolColor[s.protocol] || 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20'}`}>
                        {s.protocol.toUpperCase()}
                      </span>
                      <span className="text-neutral-600 text-[10px]">{expandedSvc === idx ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* 到期 & 流量概要 */}
                  <div className="flex gap-4 mt-3">
                    {s.expireAt && (
                      <div className="text-[10px]">
                        <span className="text-neutral-500">到期 </span>
                        <span className={`font-mono ${remain <= 3 ? 'text-red-400' : remain <= 7 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {new Date(s.expireAt).toLocaleDateString('zh-CN')} ({remain}天)
                        </span>
                      </div>
                    )}
                    {s.trafficLimit > 0 && (
                      <div className="text-[10px]">
                        <span className="text-neutral-500">流量 </span>
                        <span className="text-neutral-400 font-mono">{s.trafficUsed.toFixed(1)}/{s.trafficLimit} GB</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 展开详情 */}
                {expandedSvc === idx && (
                  <div className="border-t border-white/5 px-4 sm:px-5 py-4 space-y-4 bg-black/30">
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      {[
                        { label: '协议', value: s.protocol.toUpperCase() },
                        { label: '地址', value: s.host },
                        { label: '端口', value: String(s.port) },
                        { label: '密码 / UUID', value: s.password },
                      ].map(f => (
                        <div key={f.label} className="bg-black border border-white/5 rounded-lg p-3">
                          <div className="text-[10px] text-neutral-500 mb-1">{f.label}</div>
                          <div className="flex justify-between items-center gap-2">
                            <code className="text-[10px] sm:text-xs text-neutral-200 font-mono break-all">{f.value}</code>
                            <button onClick={(e) => { e.stopPropagation(); copy(f.value, idx); }}
                              className="text-[10px] text-neutral-500 hover:text-white shrink-0 transition">
                              {copyIdx === idx ? '✓' : '复制'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 流量条 */}
                    {s.trafficLimit > 0 && (
                      <div className="bg-black border border-white/5 rounded-lg p-3">
                        <div className="flex justify-between text-[10px] mb-2">
                          <span className="text-neutral-500">流量用量</span>
                          <span className="text-neutral-400 font-mono">{s.trafficUsed.toFixed(1)} GB / {s.trafficLimit} GB</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${tPct > 80 ? 'bg-red-500' : tPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${tPct}%` }} />
                        </div>
                      </div>
                    )}

                    <button onClick={() => copyAll(s)}
                      className="w-full bg-white text-black hover:bg-neutral-200 transition py-2.5 rounded-xl text-xs font-semibold">
                      📋 一键复制连接配置
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ====== 我的订单 ====== */}
      {activeTab === 'orders' && (
        <div className="space-y-2">
          {orders.length === 0 && <div className="text-xs text-neutral-500 py-8 text-center">暂无订单</div>}
          {orders.map(o => (
            <div key={o.id} className="bg-[#0A0A0A] border border-white/5 rounded-lg px-4 py-3 flex justify-between items-center hover:border-white/20 transition">
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate">{o.productTitle}</div>
                <div className="text-[10px] text-neutral-500 mt-0.5 truncate">
                  {o.orderNo} · {new Date(o.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <span className="text-sm font-mono">￥{o.amount.toFixed(2)}</span>
                <div className={`text-[10px] ${o.status === 'PAID' || o.status === 'COMPLETED' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {statusLabel[o.status] || o.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ====== 交易流水 ====== */}
      {activeTab === 'tx' && (
        <div className="space-y-1">
          {txs.length === 0 && <div className="text-xs text-neutral-500 py-8 text-center">暂无交易记录</div>}
          {txs.map(t => (
            <div key={t.id} className="flex justify-between items-center bg-[#0A0A0A] border border-white/5 rounded-lg px-4 py-2.5 hover:border-white/20 transition">
              <div className="min-w-0 flex-1">
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
              <span className={`text-sm font-mono shrink-0 ml-3 ${t.type === 'PURCHASE' || t.type === 'WITHDRAW' ? 'text-red-400' : 'text-emerald-400'}`}>
                {t.type === 'PURCHASE' || t.type === 'WITHDRAW' ? '-' : '+'}￥{t.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ====== 改密弹窗 ====== */}
      {pwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold">修改密码</h3>
            <input type="password" placeholder="原密码" value={oldPwd} onChange={e => setOldPwd(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" />
            <input type="password" placeholder="新密码（至少4位）" value={newPwd} onChange={e => setNewPwd(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" />
            {pwdErr && <p className="text-red-400 text-xs">{pwdErr}</p>}
            {pwdOk && <p className="text-emerald-400 text-xs">{pwdOk}</p>}
            <div className="flex gap-2 pt-2">
              <button onClick={() => setPwdModal(false)} className="flex-1 border border-white/10 text-neutral-400 py-2 rounded-xl text-xs hover:text-white transition">取消</button>
              <button onClick={handleChangePwd} className="flex-1 bg-white text-black py-2 rounded-xl text-xs font-semibold hover:bg-neutral-200 transition">确认修改</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== 提现弹窗 ====== */}
      {withdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => { if (!wdLoading) setWithdrawModal(false); }}>
          <div className="bg-[#0a0b0d] border border-white/[0.08] w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-1">佣金提现</h3>
            <p className="text-xs text-neutral-500 mb-5">最低提现金额 <span className="text-amber-400 font-semibold">¥{withdrawMin}</span></p>

            <div className="space-y-3">
              <input
                placeholder="支付宝真实姓名"
                value={wdName}
                onChange={e => setWdName(e.target.value)}
                className="w-full bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-amber-500/50 focus:outline-none"
              />
              <input
                placeholder="手机号"
                value={wdPhone}
                onChange={e => setWdPhone(e.target.value)}
                className="w-full bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-amber-500/50 focus:outline-none"
              />
              <div>
                <input
                  type="number"
                  placeholder="提现金额"
                  value={wdAmount}
                  onChange={e => setWdAmount(e.target.value)}
                  className="w-full bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-amber-500/50 focus:outline-none"
                />
                <p className="text-[10px] text-neutral-600 mt-1.5">可提现佣金 ¥{user.commissionBalance.toFixed(2)}</p>
              </div>
            </div>

            {wdErr && <p className="text-xs text-red-400 mt-3">{wdErr}</p>}
            {wdOk && <p className="text-xs text-emerald-400 mt-3">{wdOk}</p>}

            <div className="flex gap-3 mt-5">
              <button onClick={() => { if (!wdLoading) setWithdrawModal(false); }}
                className="flex-1 border border-white/[0.08] py-2.5 rounded-xl text-sm text-neutral-400 hover:text-white transition-all">
                取消
              </button>
              <button onClick={handleWithdraw} disabled={wdLoading}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-black py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 active:scale-[0.98]">
                {wdLoading ? '提交中...' : '确认提现'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
