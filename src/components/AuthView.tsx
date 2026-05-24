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
  const [formEmail, setFormEmail] = useState('');
  const [formRef, setFormRef] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  // 忘记密码
  const [showForgot, setShowForgot] = useState(false);
  const [forgotUser, setForgotUser] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<'verify' | 'reset'>('verify');
  const [forgotNewPwd, setForgotNewPwd] = useState('');
  const [forgotOk, setForgotOk] = useState('');

  const closeForgot = () => {
    setShowForgot(false); setForgotStep('verify'); setForgotUser(''); setForgotEmail(''); setForgotNewPwd(''); setErr(''); setForgotOk('');
  };

  const handleForgot = async () => {
    setErr(''); setForgotOk(''); setLoading(true);
    try {
      const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'FORGOT_PASSWORD', username: forgotUser, email: forgotEmail }) });
      const d = await res.json();
      if (!d.success) { setErr(d.error); return; }
      setForgotStep('reset');
    } catch { setErr('网络错误'); }
    finally { setLoading(false); }
  };

  const handleResetPwd = async () => {
    setErr(''); setForgotOk(''); setLoading(true);
    try {
      const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'RESET_PASSWORD', username: forgotUser, email: forgotEmail, newPassword: forgotNewPwd }) });
      const d = await res.json();
      if (!d.success) { setErr(d.error); return; }
      setForgotOk(d.message);
    } catch { setErr('网络错误'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const r = p.get('ref');
    if (r) setFormRef(r);
  }, []);

  const handleSubmit = async () => {
    setErr('');
    setLoading(true);
    if (mode === 'register') {
      const body: any = { action: 'REGISTER', username: formUser, password: formPass, securityCode: formEmail };
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
          {mode === 'login' ? '选择身份入口，安全登录' : '仅需账号密码，邮箱选填用于找回密码'}
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
                placeholder="邮箱（选填，用于找回密码）"
                value={formEmail}
                onChange={e => setFormEmail(e.target.value)}
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

        <div className="flex items-center justify-between mt-4">
          {loginRole !== 'ADMIN' && (
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}
              className="text-sm text-neutral-500 hover:text-white transition-colors">
              {mode === 'login' ? '没有账号？立即注册' : '已有账号？返回登录'}
            </button>
          )}
          {mode === 'login' && (
            <button onClick={() => { setShowForgot(true); setErr(''); }}
              className="text-sm text-neutral-600 hover:text-neutral-400 transition-colors ml-auto">
              忘记密码？
            </button>
          )}
        </div>
      </div>

      {/* 忘记密码弹窗 */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={closeForgot}>
          <div className="bg-[#0a0b0d] border border-white/[0.08] w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-1">
              {forgotStep === 'verify' ? '找回密码' : '重置密码'}
            </h3>
            <p className="text-xs text-neutral-500 mb-5">
              {forgotStep === 'verify' ? '输入注册时填写的账号和邮箱' : '请设置新密码'}
            </p>

            {forgotStep === 'verify' ? (
              <div className="space-y-3">
                <input className="w-full bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-blue-500/50 focus:outline-none"
                  placeholder="用户名" value={forgotUser} onChange={e => setForgotUser(e.target.value)} />
                <input className="w-full bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-blue-500/50 focus:outline-none"
                  placeholder="邮箱" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
              </div>
            ) : (
              <input className="w-full bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-blue-500/50 focus:outline-none"
                placeholder="新密码（至少4位）" type="password" value={forgotNewPwd} onChange={e => setForgotNewPwd(e.target.value)} />
            )}

            {err && <div className="mt-3 text-xs text-red-400 bg-red-500/5 p-3 rounded-xl border border-red-500/10">{err}</div>}
            {forgotOk && <div className="mt-3 text-xs text-emerald-400 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">{forgotOk}</div>}

            <div className="flex gap-3 mt-5">
              <button onClick={closeForgot}
                className="flex-1 border border-white/[0.08] py-2.5 rounded-xl text-sm text-neutral-400 hover:text-white transition-all">取消</button>
              <button onClick={forgotStep === 'verify' ? handleForgot : handleResetPwd} disabled={loading}
                className="flex-1 bg-white text-black py-2.5 rounded-xl text-sm font-semibold hover:bg-neutral-100 transition-all disabled:opacity-50 active:scale-[0.98]">
                {loading ? '处理中...' : forgotStep === 'verify' ? '验证' : '重置密码'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
