'use client';
import { useEffect } from 'react';

export default function AgentRedirect() {
  useEffect(() => {
    window.location.href = '/';
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="text-neutral-500 text-sm">正在跳转到代理后台...</div>
    </div>
  );
}
