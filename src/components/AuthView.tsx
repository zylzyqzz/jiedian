'use client';
import { useState, useEffect } from 'react';
import { UserBrief } from '@/types';

interface AuthViewProps {
  onAuthSuccess: (user: UserBrief, token: string) => void;
}

export default function AuthView({ onAuthSuccess }: AuthViewProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loginRole, setLoginRole] = useState<'USER' | 'AGENT' | 'ADMIN'>('USER');
  const [formUser, setFormUser] = useState('');
  const [formPass, setFormPass] = useState('');
  const [formSec, setFormSec] = useState('');
  const [formRef, setFormRef] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const r = p.get('ref');
    if (r) setFormRef(r);
  }, []);

  const handleSubmit = async () => {
    setErr('');
    setLoading(true);
    if (mode === 'register') {
      const body: any = { action: 'REGISTER', username: formUser, password: formPass, securityCode: formSec };
      if (formRef) body.refCode = formRef;
      try {
        const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const d = await res.json();
        if (!d.success) { setErr(d.error); return; }
        onAuthSuccess(d.data.user, d.data.token);
      } finally { setLoading(false); }
      return;
    }
    try {
      const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'LOGIN', username: formUser, password: formPass, loginRole }) });
      const d = await res.json();
      if (!d.success) { setErr(d.error); return; }
      onAuthSuccess(d.data.user, d.data.token);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-4">
      <div className="bg-[#0a0b0d] border border-white/[0.06] w-full max-w-md rounded-2xl p-8 sm:p-10 shadow-2xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
          <span className="text-lg font-bold text-white tracking-tight">NodeHub</span>
        </div>

        <h2 className="text-2xl font-bold text-center text-white mb-1">
          {mode === 'login' ? '欢迎回来' : '创建账号'}
        </h2>
        <p className="text-sm text-neutral-500 text-center mb-8">
          {mode === 'login' ? '选择身份入口，安全登录' : '仅需账号密码，无需手机验证'}
        </p>

        {mode === 'login' && (
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[
              { key: 'USER' as const, label: '用户', desc: '购买节点' },
              { key: 'AGENT' as const, label: '代理', desc: '分销管理' },
              { key: 'ADMIN' as const, label: '管理', desc: '后台管理' },
            ].map(r => (
              <button
                key={r.key}
                onClick={() => setLoginRole(r.key)}
                className={`py-3 rounded-xl text-center transition-all duration-200 border ${
                  loginRole === r.key
                    ? 'bg-white text-black border-white shadow-sm'
                    : 'border-white/[0.06] text-neutral-500 hover:border-white/20 hover:text-neutral-300'
                }`}
              >
                <div className="text-sm font-semibold">{r.label}</div>
                <div className="text-[10px] opacity-50 mt-0.5">{r.desc}</div>
              </button>
            ))}
          </div>
        )}

        {mode === 'login' && loginRole === 'ADMIN' && (
          <div className="text-xs text-amber-400 bg-amber-500/5 p-3 rounded-xl border border-amber-500/10 mb-4 text-center">
            管理员账号需预设，不开放注册
          </div>
        )}

        <div className="space-y-3">
          <input
            className="w-full bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-blue-500/50 focus:outline-none transition-colors"
            placeholder="用户名"
            value={formUser}
            onChange={e => setFormUser(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
          <input
            className="w-full bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-blue-500/50 focus:outline-none transition-colors"
            placeholder="密码"
            type="password"
            value={formPass}
            onChange={e => setFormPass(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />

          {mode === 'register' && (
            <>
              <input
                className="w-full bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-blue-500/50 focus:outline-none transition-colors"
                placeholder="安全码（找回账号凭证）"
                value={formSec}
                onChange={e => setFormSec(e.target.value)}
              />
              {formRef && (
                <div className="text-xs text-emerald-400 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                  推荐人邀请码：{formRef}
                </div>
              )}
            </>
          )}
        </div>

        {err && (
          <div className="mt-3 text-xs text-red-400 bg-red-500/5 p-3 rounded-xl border border-red-500/10">
            {err}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !formUser || !formPass}
          className="mt-6 w-full bg-white text-black hover:bg-neutral-100 transition-all duration-200 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 active:scale-[0.98]"
        >
          {loading ? '处理中...' : mode === 'login' ? `登录` : '立即注册'}
        </button>

        {loginRole !== 'ADMIN' && (
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}
            className="mt-4 w-full text-sm text-neutral-500 hover:text-white transition-colors"
          >
            {mode === 'login' ? '没有账号？立即注册' : '已有账号？返回登录'}
          </button>
        )}
      </div>
    </div>
  );
}
