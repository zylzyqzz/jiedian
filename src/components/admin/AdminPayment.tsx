'use client';
import { useState } from 'react';
import { PaymentConfigItem } from '@/types';

interface AdminPaymentProps {
  token: string;
  configs: PaymentConfigItem[];
  onRefresh: () => void;
}

const api = (token: string) => ({
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
});

export default function AdminPayment({ token, configs, onRefresh }: AdminPaymentProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ platform: '', merchantId: '', apiKey: '', secretKey: '', notifyUrl: '' });

  const savePayment = async () => {
    await fetch('/api/payment', { method: 'POST', ...api(token), body: JSON.stringify({ action: 'CREATE', ...form }) });
    setForm({ platform: '', merchantId: '', apiKey: '', secretKey: '', notifyUrl: '' });
    setShowForm(false);
    onRefresh();
  };

  const togglePayment = async (id: string) => {
    await fetch('/api/payment', { method: 'POST', ...api(token), body: JSON.stringify({ action: 'TOGGLE', id }) });
    onRefresh();
  };

  const deletePayment = async (id: string) => {
    await fetch('/api/payment', { method: 'POST', ...api(token), body: JSON.stringify({ action: 'DELETE', id }) });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <button onClick={() => setShowForm(!showForm)} className="bg-white text-black px-4 py-2 rounded-xl text-xs font-semibold hover:bg-neutral-200 transition">+ 新增配置</button>
      {showForm && (
        <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 space-y-3">
          <h3 className="text-sm font-bold">新增支付配置</h3>
          <input className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" placeholder="平台名称（如 易支付）" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} />
          <input className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" placeholder="商户号" value={form.merchantId} onChange={e => setForm({ ...form, merchantId: e.target.value })} />
          <input className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" placeholder="API 地址" value={form.apiKey} onChange={e => setForm({ ...form, apiKey: e.target.value })} />
          <input className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" placeholder="密钥" value={form.secretKey} onChange={e => setForm({ ...form, secretKey: e.target.value })} />
          <input className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" placeholder="回调地址（可选）" value={form.notifyUrl} onChange={e => setForm({ ...form, notifyUrl: e.target.value })} />
          <button onClick={savePayment} className="bg-white text-black px-4 py-2 rounded-xl text-xs font-semibold">保存</button>
        </div>
      )}
      <div className="space-y-2">
        {configs.map(c => (
          <div key={c.id} className="bg-[#0A0A0A] border border-white/5 rounded-lg px-4 py-3 flex justify-between items-center">
            <div><div className="text-sm">{c.platform}</div><div className="text-[10px] text-neutral-500">商户号: {c.merchantId}</div></div>
            <div className="flex gap-2 items-center">
              <span className={`text-[10px] ${c.status ? 'text-emerald-400' : 'text-red-400'}`}>{c.status ? '启用' : '停用'}</span>
              <button onClick={() => togglePayment(c.id)} className="text-[10px] text-amber-400">切换</button>
              <button onClick={() => deletePayment(c.id)} className="text-[10px] text-red-400">删除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
