'use client';
import { useState, useEffect } from 'react';

interface AdminSettingsProps {
  token: string;
}

const api = (token: string) => ({
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
});

const SETTING_KEYS = [
  { key: 'siteIntro', label: '网站简介（首页展示）', type: 'textarea', rows: 4, placeholder: '全栈代理分销管理系统，支持多级代理、节点自动分配、佣金自动结算。' },
  { key: 'siteName', label: '站点名称', type: 'text', placeholder: 'NodeHub' },
  { key: 'contactInfo', label: '联系方式', type: 'text', placeholder: '客服微信 / 邮箱等' },
  { key: 'footerText', label: '页脚文字', type: 'text', placeholder: '© 2026 NodeHub. All rights reserved.' },
  { key: 'rebateRate', label: '消费返佣比例 (%)', type: 'number', placeholder: '15' },
  { key: 'recruitRate', label: '招商返佣比例 (%)', type: 'number', placeholder: '25' },
  { key: 'withdrawMin', label: '最低提现金额 (元)', type: 'number', placeholder: '100' },
];

export default function AdminSettings({ token }: AdminSettingsProps) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const map: Record<string, string> = {};
          SETTING_KEYS.forEach(s => { map[s.key] = d.data[s.key] || ''; });
          setSettings(map);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST', ...api(token),
        body: JSON.stringify({ key, value: settings[key] || '' }),
      });
      const d = await res.json();
      if (d.success) setMsg(`「${SETTING_KEYS.find(s => s.key === key)?.label}」已保存`);
      else setMsg('保存失败');
    } catch {
      setMsg('网络错误');
    }
    setSaving(false);
    setTimeout(() => setMsg(''), 2000);
  };

  if (loading) return <div className="text-neutral-500 text-sm py-8 text-center">加载中...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      {msg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 text-xs text-emerald-400">
          {msg}
        </div>
      )}

      {SETTING_KEYS.map(field => (
        <div key={field.key} className="bg-[#0A0A0A] border border-white/10 rounded-xl p-5">
          <label className="block text-sm font-semibold text-white mb-2">{field.label}</label>
          {field.type === 'textarea' ? (
            <textarea
              value={settings[field.key] || ''}
              onChange={e => handleChange(field.key, e.target.value)}
              rows={field.rows || 3}
              placeholder={field.placeholder}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white/30 resize-none"
            />
          ) : (
            <input
              type="text"
              value={settings[field.key] || ''}
              onChange={e => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white/30"
            />
          )}
          <div className="flex justify-end mt-3">
            <button
              onClick={() => handleSave(field.key)}
              disabled={saving}
              className="bg-white text-black hover:bg-neutral-200 transition px-5 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
