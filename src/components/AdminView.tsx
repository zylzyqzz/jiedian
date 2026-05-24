'use client';
import { useState, useEffect, useCallback } from 'react';
import { Product, PaymentConfigItem, UserManageItem, NodeInstance } from '@/types';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AdminProducts from '@/components/admin/AdminProducts';
import AdminPayment from '@/components/admin/AdminPayment';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminNodes from '@/components/admin/AdminNodes';
import AdminSettings from '@/components/admin/AdminSettings';

interface AdminViewProps {
  token: string;
}

const api = (token: string) => ({
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
});

export default function AdminView({ token }: AdminViewProps) {
  const [tab, setTab] = useState<'dashboard' | 'products' | 'payment' | 'users' | 'nodes' | 'settings'>('dashboard');

  /* ========== 看板 ========== */
  const [dashboard, setDashboard] = useState<any>(null);

  /* ========== 商品管理 ========== */
  const [products, setProducts] = useState<Product[]>([]);

  /* ========== 支付配置 ========== */
  const [paymentCfgs, setPaymentCfgs] = useState<PaymentConfigItem[]>([]);

  /* ========== 用户管理 ========== */
  const [users, setUsers] = useState<UserManageItem[]>([]);
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');

  /* ========== 节点管理 ========== */
  const [nodes, setNodes] = useState<NodeInstance[]>([]);
  const [nodePage, setNodePage] = useState(1);
  const [nodeTotalPages, setNodeTotalPages] = useState(1);
  const [nodeStatusFilter, setNodeStatusFilter] = useState('');

  /* ========== 数据加载 ========== */
  const fetchDashboard = useCallback(async () => {
    const res = await fetch('/api/dashboard', { headers: api(token).headers });
    const d = await res.json();
    if (d.success) setDashboard(d.data);
  }, [token]);

  const fetchProducts = useCallback(async () => {
    const res = await fetch('/api/products?all=true');
    const d = await res.json();
    if (d.success) setProducts(d.data);
  }, []);

  const fetchPayments = useCallback(async () => {
    const res = await fetch('/api/payment', { headers: api(token).headers });
    const d = await res.json();
    if (d.success) setPaymentCfgs(d.data);
  }, [token]);

  const fetchUsers = useCallback(async () => {
    const params = new URLSearchParams({ page: String(userPage), pageSize: '15' });
    if (userSearch) params.set('search', userSearch);
    if (userRoleFilter) params.set('role', userRoleFilter);
    if (userStatusFilter) params.set('status', userStatusFilter);
    const res = await fetch(`/api/admin/users?${params}`, { headers: api(token).headers });
    const d = await res.json();
    if (d.success) {
      setUsers(d.data.items);
      setUserTotalPages(d.data.totalPages);
    }
  }, [token, userPage, userSearch, userRoleFilter, userStatusFilter]);

  const fetchNodes = useCallback(async () => {
    const params = new URLSearchParams({ page: String(nodePage), pageSize: '15' });
    if (nodeStatusFilter) params.set('status', nodeStatusFilter);
    const res = await fetch(`/api/nodes?${params}`, { headers: api(token).headers });
    const d = await res.json();
    if (d.success) {
      setNodes(d.data.items);
      setNodeTotalPages(d.data.totalPages);
    }
  }, [token, nodePage, nodeStatusFilter]);

  useEffect(() => {
    fetchDashboard();
    fetchProducts();
    fetchPayments();
  }, [fetchDashboard, fetchProducts, fetchPayments]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchNodes(); }, [fetchNodes]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Tab 导航 */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'dashboard' as const, label: '数据看板' },
          { key: 'products' as const, label: '商品管理' },
          { key: 'payment' as const, label: '支付配置' },
          { key: 'users' as const, label: '用户管理' },
          { key: 'nodes' as const, label: '节点管理' },
          { key: 'settings' as const, label: '⚙️ 站点设置' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${tab === t.key ? 'bg-white text-black' : 'border border-white/10 text-neutral-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <AdminDashboard data={dashboard} />}

      {tab === 'products' && (
        <AdminProducts token={token} products={products} onRefresh={fetchProducts} />
      )}

      {tab === 'payment' && (
        <AdminPayment token={token} configs={paymentCfgs} onRefresh={fetchPayments} />
      )}

      {tab === 'users' && (
        <AdminUsers
          token={token}
          users={users}
          page={userPage}
          totalPages={userTotalPages}
          search={userSearch}
          roleFilter={userRoleFilter}
          statusFilter={userStatusFilter}
          onSearchChange={setUserSearch}
          onRoleFilterChange={setUserRoleFilter}
          onStatusFilterChange={setUserStatusFilter}
          onPageChange={setUserPage}
          onRefresh={fetchUsers}
        />
      )}

      {tab === 'nodes' && (
        <AdminNodes
          token={token}
          nodes={nodes}
          page={nodePage}
          totalPages={nodeTotalPages}
          statusFilter={nodeStatusFilter}
          products={products.map(p => ({ id: p.id, title: p.title }))}
          onStatusFilterChange={setNodeStatusFilter}
          onPageChange={setNodePage}
          onRefresh={fetchNodes}
        />
      )}

      {tab === 'settings' && (
        <AdminSettings token={token} />
      )}
    </div>
  );
}
