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
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#050505]/80 border-b border-white/[0.04]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => onViewChange('home')}
          className="flex items-center gap-2 text-base font-bold tracking-tight text-white hover:text-neutral-300 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          NodeHub
        </button>

        {/* 右侧 */}
        <div className="flex items-center gap-3 sm:gap-4 text-xs">
          {token && user ? (
            <>
              <button onClick={() => onViewChange('profile')}
                className="text-neutral-400 hover:text-white transition-colors duration-200">
                个人中心
              </button>

              {(user.role === 'AGENT' || user.role === 'SUB_AGENT') && (
                <button onClick={() => onViewChange('agent')}
                  className="text-emerald-500 hover:text-emerald-400 transition-colors duration-200">
                  代理后台
                </button>
              )}

              {user.role === 'ADMIN' && (
                <button onClick={() => onViewChange('admin')}
                  className="text-blue-500 hover:text-blue-400 transition-colors duration-200">
                  管理后台
                </button>
              )}

              <span className="h-4 w-px bg-white/10 hidden sm:block" />

              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${rl?.color} hidden sm:inline`}>
                {rl?.label}
              </span>

              <span className="text-neutral-600 hidden sm:inline font-mono text-[11px]">
                ¥{user.balance.toFixed(2)}
              </span>

              <button onClick={onLogout}
                className="text-neutral-600 hover:text-neutral-400 transition-colors duration-200">
                退出
              </button>
            </>
          ) : (
            <span className="text-neutral-600 text-[11px]">全球高质量节点服务</span>
          )}
        </div>
      </div>
    </nav>
  );
}
