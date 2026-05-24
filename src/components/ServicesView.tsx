'use client';
import { useState, useEffect, useCallback } from 'react';
import { NodeBrief } from '@/types';

interface ServicesViewProps {
  token: string;
}

const api = (token: string) => ({
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
});

const protocolColor: Record<string, string> = {
  trojan: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  vmess: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  ss: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  vless: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const statusLabel: Record<string, { text: string; class: string }> = {
  ASSIGNED: { text: '使用中', class: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10' },
  EXPIRED: { text: '已过期', class: 'text-red-400 bg-red-500/5 border-red-500/10' },
  MAINTENANCE: { text: '维护中', class: 'text-amber-400 bg-amber-500/5 border-amber-500/10' },
};

export default function ServicesView({ token }: ServicesViewProps) {
  const [services, setServices] = useState<NodeBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyIdx, setCopyIdx] = useState<number | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/services', { headers: api(token).headers });
      const d = await res.json();
      if (d.success) setServices(d.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const copy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopyIdx(idx);
    setTimeout(() => setCopyIdx(null), 2000);
  };

  const copyAll = (s: NodeBrief) => {
    const cfg = [
      `协议: ${s.protocol}`,
      `地址: ${s.host}`,
      `端口: ${s.port}`,
      `密码: ${s.password}`,
    ].join('\n');
    navigator.clipboard.writeText(cfg);
  };

  const daysLeft = (expireAt: string | null): number => {
    if (!expireAt) return 0;
    const remain = new Date(expireAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(remain / (1000 * 60 * 60 * 24)));
  };

  const trafficPercent = (used: number, limit: number): number => {
    if (limit <= 0) return 0;
    return Math.min(100, Math.round((used / limit) * 100));
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-neutral-500 text-sm text-center py-20">加载中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">我的服务</h2>
        <span className="text-[10px] text-neutral-500">{services.length} 个节点</span>
      </div>

      {services.length === 0 && (
        <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-4">📡</div>
          <p className="text-neutral-400 text-sm mb-2">暂无已购服务</p>
          <p className="text-neutral-600 text-xs">购买节点后，连接信息将在此展示</p>
        </div>
      )}

      <div className="space-y-4">
        {services.map((s, idx) => {
          const remain = daysLeft(s.expireAt);
          const tPct = trafficPercent(s.trafficUsed, s.trafficLimit);
          const st = statusLabel[s.status as string] || statusLabel.ASSIGNED;

          return (
            <div key={s.id} className="bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition">
              {/* 头部 */}
              <div
                className="p-5 cursor-pointer"
                onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-sm">{s.productTitle}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${st.class}`}>
                        {st.text}
                      </span>
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      订单号: {s.orderNo} · {s.host}:{s.port}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-1 rounded-lg border ${
                      protocolColor[s.protocol] || 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20'
                    }`}>
                      {s.protocol.toUpperCase()}
                    </span>
                    <span className="text-neutral-600 text-xs">
                      {expandedIdx === idx ? '收起 ▲' : '详情 ▼'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 展开详情 */}
              {expandedIdx === idx && (
                <div className="border-t border-white/5 px-5 py-4 space-y-4 bg-black/30">
                  {/* 连接信息 */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: '协议', value: s.protocol.toUpperCase() },
                      { label: '地址', value: s.host },
                      { label: '端口', value: String(s.port) },
                      { label: '密码 / UUID', value: s.password },
                    ].map(f => (
                      <div key={f.label} className="bg-black border border-white/5 rounded-lg p-3">
                        <div className="text-[10px] text-neutral-500 mb-1">{f.label}</div>
                        <div className="flex justify-between items-center gap-2">
                          <code className="text-xs text-neutral-200 font-mono break-all">{f.value}</code>
                          <button
                            onClick={(e) => { e.stopPropagation(); copy(f.value, idx); }}
                            className="text-[10px] text-neutral-500 hover:text-white shrink-0 transition"
                          >
                            {copyIdx === idx ? '已复制' : '复制'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 到期信息 */}
                  <div className="flex gap-4">
                    <div className="flex-1 bg-black border border-white/5 rounded-lg p-3">
                      <div className="text-[10px] text-neutral-500 mb-1">到期时间</div>
                      <div className="text-sm font-mono">
                        {s.expireAt ? new Date(s.expireAt).toLocaleDateString('zh-CN') : '永久'}
                      </div>
                      {s.expireAt && (
                        <div className={`text-[10px] mt-0.5 ${remain <= 3 ? 'text-red-400' : remain <= 7 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          剩余 {remain} 天
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 流量 */}
                  {s.trafficLimit > 0 && (
                    <div className="bg-black border border-white/5 rounded-lg p-3">
                      <div className="flex justify-between text-[10px] mb-2">
                        <span className="text-neutral-500">流量用量</span>
                        <span className="text-neutral-400 font-mono">{s.trafficUsed.toFixed(1)} GB / {s.trafficLimit} GB</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${tPct > 80 ? 'bg-red-500' : tPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${tPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 一键复制 */}
                  <button
                    onClick={() => copyAll(s)}
                    className="w-full bg-white text-black hover:bg-neutral-200 transition py-2.5 rounded-xl text-xs font-semibold"
                  >
                    一键复制连接配置
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
