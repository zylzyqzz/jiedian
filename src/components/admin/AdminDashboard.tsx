'use client';

interface DashboardData {
  stats: {
    totalUsers: number;
    totalAgents: number;
    totalProducts: number;
    totalOrders: number;
    pendingOrders: number;
    todayOrders: number;
    todayRevenue: number;
    totalRevenue: number;
    totalNodes: number;
    availableNodes: number;
    assignedNodes: number;
  };
  recentOrders: Array<{
    id: string;
    orderNo: string;
    amount: number;
    status: string;
    productTitle: string;
    username: string;
    createdAt: string;
  }>;
  topAgents: Array<{
    id: string;
    username: string;
    commissionBalance: number;
    _count: { orders: number };
  }>;
}

interface AdminDashboardProps {
  data: DashboardData | null;
}

export default function AdminDashboard({ data }: AdminDashboardProps) {
  if (!data) {
    return <div className="text-neutral-500 text-sm text-center py-20">加载中...</div>;
  }

  const { stats, recentOrders, topAgents } = data;
  const statusLabel: Record<string, string> = {
    PENDING: '待支付', PAID: '已支付', COMPLETED: '已完成',
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '总用户', value: stats.totalUsers },
          { label: '代理数量', value: stats.totalAgents },
          { label: '总订单', value: stats.totalOrders },
          { label: '待处理', value: stats.pendingOrders, highlight: true },
        ].map(s => (
          <div key={s.label} className={`bg-[#0A0A0A] border border-white/5 rounded-xl p-4 ${s.highlight ? 'border-amber-500/20' : ''}`}>
            <div className="text-[10px] text-neutral-500">{s.label}</div>
            <div className="text-xl font-bold mt-1">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: '今日订单', value: stats.todayOrders },
          { label: '今日营收', value: `￥${stats.todayRevenue.toFixed(2)}` },
          { label: '累计营收', value: `￥${stats.totalRevenue.toFixed(2)}` },
          { label: '节点总数', value: stats.totalNodes },
          { label: '可用节点', value: stats.availableNodes },
          { label: '已分配节点', value: stats.assignedNodes },
        ].map(s => (
          <div key={s.label} className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4">
            <div className="text-[10px] text-neutral-500">{s.label}</div>
            <div className="text-lg font-bold mt-1 font-mono">{s.value}</div>
          </div>
        ))}
      </div>

      {topAgents.length > 0 && (
        <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4">
          <div className="text-xs text-neutral-400 mb-3">Top 代理排行</div>
          <div className="space-y-2">
            {topAgents.map((a, i) => (
              <div key={a.id} className="flex justify-between text-xs">
                <span className="text-neutral-300">{i + 1}. {a.username}</span>
                <span className="font-mono text-emerald-400">佣金 ￥{a.commissionBalance.toFixed(2)} · {a._count.orders} 单</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4">
        <div className="text-xs text-neutral-400 mb-3">最近订单</div>
        <div className="space-y-1">
          {recentOrders.map(o => (
            <div key={o.id} className="flex justify-between text-[10px] text-neutral-400">
              <span>{o.orderNo} · {o.username} · {o.productTitle}</span>
              <span className={`font-mono ${o.status === 'PAID' || o.status === 'COMPLETED' ? 'text-emerald-400' : 'text-amber-400'}`}>
                ￥{o.amount.toFixed(2)} {statusLabel[o.status] || o.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
