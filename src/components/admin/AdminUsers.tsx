'use client';
import { useState } from 'react';
import { UserManageItem } from '@/types';

interface AdminUsersProps {
  token: string;
  users: UserManageItem[];
  page: number;
  totalPages: number;
  search: string;
  roleFilter: string;
  statusFilter: string;
  onSearchChange: (v: string) => void;
  onRoleFilterChange: (v: string) => void;
  onStatusFilterChange: (v: string) => void;
  onPageChange: (v: number) => void;
  onRefresh: () => void;
}

const api = (token: string) => ({
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
});

const roleLabel: Record<string, string> = { USER: '用户', AGENT: '代理', SUB_AGENT: '子代理', ADMIN: '管理员' };

export default function AdminUsers({
  token, users, page, totalPages, search, roleFilter, statusFilter,
  onSearchChange, onRoleFilterChange, onStatusFilterChange, onPageChange, onRefresh,
}: AdminUsersProps) {
  const [rechargeUserId, setRechargeUserId] = useState<string | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeWallet, setRechargeWallet] = useState<'BALANCE' | 'COMMISSION'>('BALANCE');

  const handleRecharge = async () => {
    const amount = parseFloat(rechargeAmount);
    if (!amount || amount <= 0 || !rechargeUserId) return;
    await fetch('/api/admin/users', {
      method: 'POST',
      ...api(token),
      body: JSON.stringify({ action: 'RECHARGE', userId: rechargeUserId, amount, walletType: rechargeWallet }),
    });
    setRechargeUserId(null);
    setRechargeAmount('');
    onRefresh();
  };

  const handleBan = async (userId: string) => {
    if (!confirm('确认封禁此用户？')) return;
    await fetch('/api/admin/users', { method: 'POST', ...api(token), body: JSON.stringify({ action: 'BAN', userId }) });
    onRefresh();
  };

  const handleUnban = async (userId: string) => {
    await fetch('/api/admin/users', { method: 'POST', ...api(token), body: JSON.stringify({ action: 'UNBAN', userId }) });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input className="flex-1 min-w-[150px] bg-[#0A0A0A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600"
          placeholder="搜索用户名/邀请码" value={search} onChange={e => onSearchChange(e.target.value)} />
        <select className="bg-[#0A0A0A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
          value={roleFilter} onChange={e => onRoleFilterChange(e.target.value)}>
          <option value="">全部角色</option>
          <option value="USER">用户</option>
          <option value="AGENT">代理</option>
          <option value="SUB_AGENT">子代理</option>
          <option value="ADMIN">管理员</option>
        </select>
        <select className="bg-[#0A0A0A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
          value={statusFilter} onChange={e => onStatusFilterChange(e.target.value)}>
          <option value="">全部状态</option>
          <option value="ACTIVE">正常</option>
          <option value="BANNED">已封禁</option>
        </select>
      </div>

      <div className="space-y-1">
        {users.map(u => (
          <div key={u.id} className="bg-[#0A0A0A] border border-white/5 rounded-lg px-4 py-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-sm">{u.username}</span>
                <span className="text-[10px] text-neutral-500 ml-2">{roleLabel[u.role] || u.role}</span>
                {u.status === 'BANNED' && <span className="text-[10px] text-red-400 ml-1">已封禁</span>}
                <div className="text-[10px] text-neutral-500 mt-0.5">
                  余额 ￥{u.balance.toFixed(2)} · 佣金 ￥{u.commissionBalance.toFixed(2)} · {u.orderCount} 单
                  {u.subAgentCount > 0 && <span className="ml-1">· {u.subAgentCount} 子代理</span>}
                </div>
                <div className="text-[10px] text-neutral-600">{u.inviteCode} · {new Date(u.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="flex gap-1">
                {u.status === 'ACTIVE' ? (
                  <button onClick={() => handleBan(u.id)} className="text-[10px] text-red-400 hover:text-red-300 bg-red-500/5 px-2 py-1 rounded">封禁</button>
                ) : (
                  <button onClick={() => handleUnban(u.id)} className="text-[10px] text-emerald-400 hover:text-emerald-300 bg-emerald-500/5 px-2 py-1 rounded">解封</button>
                )}
                <button onClick={() => setRechargeUserId(u.id)} className="text-[10px] text-blue-400 hover:text-blue-300 bg-blue-500/5 px-2 py-1 rounded">充值</button>
              </div>
            </div>
            {rechargeUserId === u.id && (
              <div className="mt-2 flex gap-2 items-center">
                <select value={rechargeWallet} onChange={e => setRechargeWallet(e.target.value as 'BALANCE' | 'COMMISSION')}
                  className="bg-black border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white">
                  <option value="BALANCE">余额</option>
                  <option value="COMMISSION">佣金</option>
                </select>
                <input type="number" placeholder="金额" value={rechargeAmount}
                  onChange={e => setRechargeAmount(e.target.value)}
                  className="flex-1 bg-black border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white placeholder:text-neutral-600" />
                <button onClick={handleRecharge} className="bg-white text-black px-3 py-1 rounded text-[10px] font-semibold">确认</button>
                <button onClick={() => setRechargeUserId(null)} className="text-[10px] text-neutral-500">取消</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => onPageChange(i + 1)}
              className={`px-3 py-1 rounded text-[10px] ${page === i + 1 ? 'bg-white text-black' : 'border border-white/10 text-neutral-400'}`}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
