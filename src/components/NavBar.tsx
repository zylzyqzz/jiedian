'use client';
import { UserBrief } from '@/types';

interface NavBarProps {
  user: UserBrief | null;
  token: string | null;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

export default function NavBar({ user, token, onViewChange, onLogout }: NavBarProps) {
  const roleLabels: Record<string, { label: string; color: string }> = {
    ADMIN: { label: '管理员', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    AGENT: { label: '一级代理', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    SUB_AGENT: { label: '子代理', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    USER: { label: '用户', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  };

  const rl = user ? roleLabels[user.role] || roleLabels.USER : null;

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/5 bg-black/40 px-3 sm:px-6 py-3 flex justify-between items-center">
      <button
        onClick={() => onViewChange('home')}
        className="text-lg sm:text-xl font-bold tracking-tighter bg-gradient-to-r from-white to-neutral-500 bg-clip-text text-transparent"
      >
        NodeHub
      </button>
      <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs">
        {token && user ? (
          <>

            <button onClick={() => onViewChange('profile')} className="text-neutral-400 hover:text-white transition">
              个人中心
            </button>
            {(user.role === 'AGENT' || user.role === 'SUB_AGENT') && (
              <button onClick={() => onViewChange('agent')} className="text-emerald-400 hover:text-emerald-300 transition">
                代理后台
              </button>
            )}
            {user.role === 'ADMIN' && (
              <button onClick={() => onViewChange('admin')} className="text-red-400 hover:text-red-300 transition">
                管理后台
              </button>
            )}
            <span className={`px-2 py-0.5 rounded-full border text-[9px] sm:text-[10px] ${rl?.color}`}>
              {rl?.label}
            </span>
            <span className="text-neutral-500 hidden sm:inline">|</span>
            <span className="text-neutral-500 font-mono hidden sm:inline">￥{user.balance.toFixed(2)}</span>
            <button onClick={onLogout} className="text-neutral-500 hover:text-white transition">
              退出
            </button>
          </>
        ) : (
          <span className="text-neutral-500 text-[10px] sm:text-xs">2026 节点聚合分销系统</span>
        )}
      </div>
    </nav>
  );
}
