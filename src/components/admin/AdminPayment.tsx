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

const QUICK_TEMPLATES = [
  {
    label: '易支付 - 支付宝/微信',
    platform: '易支付',
    merchantId: '你的商户号',
    apiKey: 'https://pay.xxxx.com/submit.php',
    secretKey: '你的密钥',
    notifyUrl: '',
  },
];

export default function AdminPayment({ token, configs, onRefresh }: AdminPaymentProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ platform: '', merchantId: '', apiKey: '', secretKey: '', notifyUrl: '' });

  const applyTemplate = (tpl: typeof QUICK_TEMPLATES[0]) => {
    setForm({
      platform: tpl.platform,
      merchantId: tpl.merchantId,
      apiKey: tpl.apiKey,
      secretKey: tpl.secretKey,
      notifyUrl: tpl.notifyUrl,
    });
  };

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
      {/* 说明卡片 */}
      <div className="bg-[#0A0A0A] border border-blue-500/10 rounded-2xl p-5 space-y-2">
        <h3 className="text-sm font-bold text-blue-400">💳 支付配置说明</h3>
        <div className="text-[10px] text-neutral-400 space-y-1">
          <p>• 支持 <strong className="text-white">支付宝</strong> 和 <strong className="text-white">微信支付</strong>（通过易支付网关）</p>
          <p>• 用户下单时可选择支付方式，系统自动跳转到对应支付页面</p>
          <p>• <strong className="text-amber-400">模拟支付</strong>：无需真实支付账号，用户可直接"购买"用于演示测试</p>
          <p>• 回调地址会自动使用当前域名，无需手动填写</p>
        </div>
      </div>

      {/* 当前配置列表 */}
      <div className="space-y-2">
        {configs.length === 0 && (
          <div className="text-center text-neutral-500 text-xs py-6 border border-dashed border-white/10 rounded-xl">
            暂无支付配置，点击下方按钮添加
          </div>
        )}
        {configs.map(c => (
          <div key={c.id} className="bg-[#0A0A0A] border border-white/5 rounded-lg px-4 py-3 flex justify-between items-center">
            <div>
              <div className="text-sm">{c.platform}</div>
              <div className="text-[10px] text-neutral-500">
                商户号: {c.merchantId} &nbsp;|&nbsp; API: {c.apiKey}
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <span className={`text-[10px] ${c.status ? 'text-emerald-400' : 'text-red-400'}`}>
                {c.status ? '✅ 启用' : '⏸ 停用'}
              </span>
              <button onClick={() => togglePayment(c.id)} className="text-[10px] text-amber-400 hover:text-amber-300">切换</button>
              <button onClick={() => deletePayment(c.id)} className="text-[10px] text-red-400 hover:text-red-300">删除</button>
            </div>
          </div>
        ))}
      </div>

      {/* 新增按钮 */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="bg-white text-black px-4 py-2 rounded-xl text-xs font-semibold hover:bg-neutral-200 transition"
      >
        + 新增支付配置
      </button>

      {/* 新增表单 */}
      {showForm && (
        <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold">新增支付配置</h3>
            <button onClick={() => setShowForm(false)} className="text-neutral-500 hover:text-white text-sm">&times;</button>
          </div>

          {/* 快速模板 */}
          <div className="flex flex-wrap gap-2">
            {QUICK_TEMPLATES.map(tpl => (
              <button
                key={tpl.label}
                onClick={() => applyTemplate(tpl)}
                className="text-[10px] bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-500/20 transition"
              >
                📋 {tpl.label}
              </button>
            ))}
          </div>

          <input className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" placeholder="平台名称（如 易支付）" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} />
          <input className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" placeholder="商户号 (PID)" value={form.merchantId} onChange={e => setForm({ ...form, merchantId: e.target.value })} />
          <input className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" placeholder="API 网关地址" value={form.apiKey} onChange={e => setForm({ ...form, apiKey: e.target.value })} />
          <input className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" placeholder="通信密钥 (Key)" value={form.secretKey} onChange={e => setForm({ ...form, secretKey: e.target.value })} />
          <input className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" placeholder="回调地址（留空自动）" value={form.notifyUrl} onChange={e => setForm({ ...form, notifyUrl: e.target.value })} />
          <button onClick={savePayment} className="bg-white text-black px-4 py-2 rounded-xl text-xs font-semibold hover:bg-neutral-200 transition">保存</button>
        </div>
      )}
    </div>
  );
}
