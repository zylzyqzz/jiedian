'use client';
import { useState, useEffect } from 'react';
import { UserBrief, View } from '@/types';
import NavBar from '@/components/NavBar';
import AuthView from '@/components/AuthView';
import HomeView from '@/components/HomeView';
import ProfileView from '@/components/ProfileView';
import AdminView from '@/components/AdminView';
import AgentView from '@/components/AgentView';
import ServicesView from '@/components/ServicesView';

const TOKEN_KEY = 'nodehub_token';
const USER_KEY = 'nodehub_user';

export default function App() {
  const [view, setView] = useState<View>('auth');
  const [user, setUser] = useState<UserBrief | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // 从 localStorage 恢复会话
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        setView('home');
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setHydrated(true);
  }, []);

  // 认证成功
  const handleAuthSuccess = (newUser: UserBrief, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));

    if (newUser.role === 'ADMIN') setView('admin');
    else if (newUser.role === 'AGENT' || newUser.role === 'SUB_AGENT') setView('home');
    else setView('home');
  };

  // 退出
  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setView('auth');
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  // 水合完成前不渲染，避免 hydration mismatch
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-neutral-500 text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans antialiased selection:bg-blue-600">
      <NavBar
        user={user}
        token={token}
        onViewChange={(v) => setView(v as View)}
        onLogout={handleLogout}
      />

      {view === 'auth' && (
        <AuthView onAuthSuccess={handleAuthSuccess} />
      )}

      {view === 'home' && user && token && (
        <HomeView user={user} token={token} onViewChange={(v) => setView(v as View)} />
      )}

      {view === 'profile' && user && token && (
        <ProfileView user={user} token={token} />
      )}

      {view === 'admin' && user && user.role === 'ADMIN' && token && (
        <AdminView token={token} />
      )}

      {view === 'agent' && user && (user.role === 'AGENT' || user.role === 'SUB_AGENT') && token && (
        <AgentView token={token} />
      )}

      {view === 'services' && user && token && (
        <ServicesView token={token} />
      )}
    </div>
  );
}
