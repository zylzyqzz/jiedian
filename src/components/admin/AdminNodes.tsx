'use client';
import { useState } from 'react';
import { NodeInstance } from '@/types';

interface AdminNodesProps {
  token: string;
  nodes: NodeInstance[];
  page: number;
  totalPages: number;
  statusFilter: string;
  products: Array<{ id: string; title: string }>;
  onStatusFilterChange: (v: string) => void;
  onPageChange: (v: number) => void;
  onRefresh: () => void;
}

const api = (token: string) => ({
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
});

const nodeStatusLabel: Record<string, { text: string; cls: string }> = {
  AVAILABLE: { text: '可用', cls: 'text-emerald-400' },
  ASSIGNED: { text: '已分配', cls: 'text-blue-400' },
  EXPIRED: { text: '已过期', cls: 'text-red-400' },
  MAINTENANCE: { text: '维护中', cls: 'text-amber-400' },
};

export default function AdminNodes({
  token, nodes, page, totalPages, statusFilter, products,
  onStatusFilterChange, onPageChange, onRefresh,
}: AdminNodesProps) {
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchProductId, setBatchProductId] = useState('');
  const [batchCount, setBatchCount] = useState('10');
  const [batchHostPrefix, setBatchHostPrefix] = useState('');
  const [batchStartPort, setBatchStartPort] = useState('443');
  const [batchProtocol, setBatchProtocol] = useState('trojan');

  const handleBatchGenerate = async () => {
    await fetch('/api/nodes', {
      method: 'POST',
      ...api(token),
      body: JSON.stringify({
        action: 'BATCH_GENERATE', productId: batchProductId,
        count: parseInt(batchCount), hostPrefix: batchHostPrefix,
        startPort: parseInt(batchStartPort), protocol: batchProtocol,
      }),
    });
    setShowBatchModal(false);
    onRefresh();
  };

  const handleRecycle = async (nodeId: string) => {
    await fetch('/api/nodes', { method: 'POST', ...api(token), body: JSON.stringify({ action: 'RECYCLE', nodeId }) });
    onRefresh();
  };

  const handleToggleMaintenance = async (nodeId: string) => {
    await fetch('/api/nodes', { method: 'POST', ...api(token), body: JSON.stringify({ action: 'TOGGLE_MAINTENANCE', nodeId }) });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <select className="bg-[#0A0A0A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
          value={statusFilter} onChange={e => onStatusFilterChange(e.target.value)}>
          <option value="">全部状态</option>
          <option value="AVAILABLE">可用</option>
          <option value="ASSIGNED">已分配</option>
          <option value="EXPIRED">已过期</option>
          <option value="MAINTENANCE">维护中</option>
        </select>
        <button onClick={() => setShowBatchModal(true)}
          className="bg-white text-black px-4 py-2 rounded-xl text-xs font-semibold hover:bg-neutral-200 transition">
          + 批量生成
        </button>
      </div>

      <div className="space-y-1">
        {nodes.map(n => {
          const st = nodeStatusLabel[n.status] || { text: n.status, cls: 'text-neutral-400' };
          return (
            <div key={n.id} className="bg-[#0A0A0A] border border-white/5 rounded-lg px-4 py-3 flex justify-between items-start">
              <div>
                <span className="text-sm font-mono">{n.host}:{n.port}</span>
                <span className={`text-[10px] ml-2 ${st.cls}`}>{st.text}</span>
                <div className="text-[10px] text-neutral-500 mt-0.5">
                  {n.protocol.toUpperCase()} · {n.product?.title || '-'}
                  {n.user && <span className="ml-1">· {n.user.username}</span>}
                  {n.order && <span className="ml-1">· {n.order.orderNo}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                {n.status === 'ASSIGNED' && (
                  <button onClick={() => handleRecycle(n.id)} className="text-[10px] text-amber-400 hover:text-amber-300">回收</button>
                )}
                {(n.status === 'AVAILABLE' || n.status === 'MAINTENANCE') && (
                  <button onClick={() => handleToggleMaintenance(n.id)} className="text-[10px] text-purple-400 hover:text-purple-300">
                    {n.status === 'MAINTENANCE' ? '恢复' : '维护'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => onPageChange(i + 1)}
              className={`px-3 py-1 rounded text-[10px] ${page === i + 1 ? 'bg-white text-black' : 'border border-white/10 text-neutral-400'}`}>
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold">批量生成节点</h3>
            <select value={batchProductId} onChange={e => setBatchProductId(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white">
              <option value="">选择商品</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <input type="number" placeholder="数量（最多100）" value={batchCount}
              onChange={e => setBatchCount(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" />
            <input placeholder="主机名前缀（如 sg）" value={batchHostPrefix}
              onChange={e => setBatchHostPrefix(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" />
            <input type="number" placeholder="起始端口" value={batchStartPort}
              onChange={e => setBatchStartPort(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600" />
            <select value={batchProtocol} onChange={e => setBatchProtocol(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white">
              <option value="trojan">Trojan</option>
              <option value="vmess">VMess</option>
            </select>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowBatchModal(false)} className="flex-1 border border-white/10 py-2 rounded-xl text-xs text-neutral-400">取消</button>
              <button onClick={handleBatchGenerate} className="flex-1 bg-white text-black py-2 rounded-xl text-xs font-semibold hover:bg-neutral-200">生成</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
