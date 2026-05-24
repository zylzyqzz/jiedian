'use client';
import { useState, useEffect, useCallback } from 'react';
import { CommissionRecord } from '@/types';

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
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [copyHint, setCopyHint] = useState(false);
  const [rebateRate, setRebateRate] = useState('20');

  const [showWithdraw, setShowWithdraw] = useState(false);
  const [wdName, setWdName] = useState('');
  const [wdPhone, setWdPhone] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMsg, setWithdrawMsg] = useState('');
  const [withdrawErr, setWithdrawErr] = useState('');

  const fetchAgent = useCallback(async () => {
    const res = await fetch('/api/agent', { headers: api(token).headers });
    const d = await res.json();
    if (d.success) {
      setBalance(d.data.balance);
      setCommissionBalance(d.data.commissionBalance);
      setInviteCode(d.data.inviteCode);
      setCommissions(d.data.commissions);
    }
  }, [token]);

  useEffect(() => {
    fetchAgent();
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.success && d.data.agentRebateRate) setRebateRate(d.data.agentRebateRate);
    }).catch(() => {});
  }, [fetchAgent]);

  const handleWithdraw = async () => {
    setWithdrawErr(''); setWithdrawMsg('');
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 10) { setWithdrawErr('最低提现10元'); return; }
    if (!wdName.trim()) { setWithdrawErr('请输入真实姓名'); return; }
    if (!wdPhone.trim()) { setWithdrawErr('请输入手机号'); return; }
    const res = await fetch('/api/agent', {
      method: 'POST', ...api(token),
      body: JSON.stringify({ action: 'WITHDRAW', amount, realName: wdName, phone: wdPhone, remark: '佣金提现' }),
    });
    const d = await res.json();
    if (!d.success) { setWithdrawErr(d.error); return; }
    setWithdrawMsg(d.message || '提现申请已提交');
    setWithdrawAmount(''); setWdName(''); setWdPhone('');
    fetchAgent();
  };

  const copy = (text: string) => { navigator.clipboard.writeText(text); setCopyHint(true); setTimeout(() => setCopyHint(false), 2000); };
  const inviteUrl = `${window.location.origin}/?ref=${inviteCode}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="bg-[#0a0b0d] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-bold text-white mb-5">代理控制台</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black border border-white/[0.05] rounded-xl p-4">
              <div className="text-xs text-neutral-500">余额</div>
              <div className="text-xl font-bold text-white mt-1">¥{balance.toFixed(2)}</div>
            </div>
            <div className="bg-black border border-white/[0.05] rounded-xl p-4">
              <div className="text-xs text-neutral-500">佣金</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">¥{commissionBalance.toFixed(2)}</div>
            </div>
          </div>

          <div className="mt-4 bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-blue-400 font-medium">推荐链接</span>
              <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-semibold">推荐奖励 {rebateRate}%</span>
            </div>
            <p className="text-[11px] text-neutral-500 mb-2">分享此链接，对方注册并购买后，你将获得 {rebateRate}% 返佣</p>
            <div className="flex gap-2">
              <code className="flex-1 bg-black rounded-lg px-3 py-1.5 text-xs text-blue-300 font-mono truncate">{inviteUrl}</code>
              <button onClick={() => copy(inviteUrl)}
                className="bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-lg text-xs hover:bg-blue-500/30 transition shrink-0">
                {copyHint ? '已复制' : '复制'}
              </button>
            </div>
          </div>

          <button onClick={() => setShowWithdraw(true)}
            className="mt-4 w-full bg-amber-500 hover:bg-amber-600 text-black py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]">
            佣金提现
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-white mb-3">佣金记录</h3>
        <div className="space-y-1">
          {commissions.length === 0 && <div className="text-xs text-neutral-500 py-8 text-center">暂无佣金记录</div>}
          {commissions.map(c => (
            <div key={c.id} className="flex justify-between items-center bg-[#0a0b0d] border border-white/[0.05] rounded-lg px-4 py-3 hover:border-white/[0.08] transition">
              <div className="min-w-0 flex-1">
                <div className="text-sm text-neutral-300 truncate">{c.remark}</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">{new Date(c.createdAt).toLocaleString()}</div>
              </div>
              <span className="text-sm font-bold text-emerald-400 shrink-0 ml-3">+¥{c.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {showWithdraw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowWithdraw(false)}>
          <div className="bg-[#0a0b0d] border border-white/[0.08] w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-1">佣金提现</h3>
            <p className="text-xs text-neutral-500 mb-5">最低提现 ¥100 · 可提现 ¥{commissionBalance.toFixed(2)}</p>
            <div className="space-y-3">
              <input placeholder="支付宝真实姓名" value={wdName} onChange={e => setWdName(e.target.value)}
                className="w-full bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-amber-500/50 focus:outline-none" />
              <input placeholder="手机号" value={wdPhone} onChange={e => setWdPhone(e.target.value)}
                className="w-full bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-amber-500/50 focus:outline-none" />
              <input type="number" placeholder="提现金额" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                className="w-full bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-amber-500/50 focus:outline-none" />
            </div>
            {withdrawErr && <p className="text-xs text-red-400 mt-3">{withdrawErr}</p>}
            {withdrawMsg && <p className="text-xs text-emerald-400 mt-3">{withdrawMsg}</p>}
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowWithdraw(false)}
                className="flex-1 border border-white/[0.08] py-2.5 rounded-xl text-sm text-neutral-400 hover:text-white transition-all">取消</button>
              <button onClick={handleWithdraw}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-black py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]">确认提现</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
