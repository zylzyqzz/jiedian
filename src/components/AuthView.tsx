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
      const body: any = {
        action: 'REGISTER',
        username: formUser,
        password: formPass,
        securityCode: formSec,
      };
      if (formRef) body.refCode = formRef;

      try {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const d = await res.json();
        if (!d.success) { setErr(d.error); return; }
        onAuthSuccess(d.data.user, d.data.token);
      } finally {
        setLoading(false);
      }
      return;
    }

    // login
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'LOGIN',
          username: formUser,
          password: formPass,
          loginRole,
        }),
      });
      const d = await res.json();
      if (!d.success) { setErr(d.error); return; }
      onAuthSuccess(d.data.user, d.data.token);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-md rounded-2xl p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-center mb-1">
          {mode === 'login' ? '欢迎回来' : '创建账号'}
        </h2>
        <p className="text-[11px] text-neutral-500 text-center mb-6">
          {mode === 'login' ? '选择身份入口，安全登录' : '仅需账号密码 + 安全码，无需手机验证'}
        </p>

        {mode === 'login' && (
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { key: 'USER' as const, icon: '👤', label: '个人用户', desc: '购买节点服务' },
              { key: 'AGENT' as const, icon: '💎', label: '代理登录', desc: '充3000元升级后可用' },
              { key: 'ADMIN' as const, icon: '⚙️', label: '管理后台', desc: '仅限预设管理员' },
            ].map(r => (
              <button
                key={r.key}
                onClick={() => setLoginRole(r.key)}
                className={`py-3 rounded-xl text-center transition border ${
                  loginRole === r.key
                    ? 'bg-white text-black border-white'
                    : 'border-white/10 text-neutral-400 hover:border-white/30'
                }`}
              >
                <div className="text-lg mb-0.5">{r.icon}</div>
                <div className="text-[11px] font-semibold">{r.label}</div>
                <div className="text-[9px] opacity-50 mt-0.5">{r.desc}</div>
              </button>
            ))}
          </div>
        )}

        {mode === 'login' && loginRole === 'ADMIN' && (
          <div className="text-[10px] text-amber-400 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10 mb-3 text-center">
            管理员账号需预设，不开放注册
          </div>
        )}

        <input
          className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 mb-3"
          placeholder="用户名"
          value={formUser}
          onChange={e => setFormUser(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
        <input
          className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 mb-3"
          placeholder="密码"
          type="password"
          value={formPass}
          onChange={e => setFormPass(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />

        {mode === 'register' && (
          <>
            <input
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 mb-3"
              placeholder="安全码（找回账号凭证）"
              value={formSec}
              onChange={e => setFormSec(e.target.value)}
            />
            {formRef && (
              <div className="text-[10px] text-emerald-400 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10 mb-3">
                推荐人邀请码：{formRef}
              </div>
            )}
          </>
        )}

        {err && (
          <div className="text-[11px] text-red-400 bg-red-500/5 p-2 rounded-lg border border-red-500/10 mb-3">
            {err}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !formUser || !formPass}
          className="w-full bg-white text-black hover:bg-neutral-200 transition py-2.5 rounded-xl text-sm font-semibold tracking-wide mb-4 disabled:opacity-50"
        >
          {loading ? '处理中...' : mode === 'login' ? `以 ${loginRole === 'USER' ? '用户' : loginRole === 'AGENT' ? '代理' : '管理员'} 身份登录` : '立即注册'}
        </button>

        {loginRole !== 'ADMIN' && (
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}
            className="w-full text-[11px] text-neutral-500 hover:text-white transition"
          >
            {mode === 'login' ? '没有账号？立即注册' : '已有账号？返回登录'}
          </button>
        )}
      </div>
    </div>
  );
}
