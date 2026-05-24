/* ========== 统一类型定义 ========== */

// 用户角色
export type Role = 'USER' | 'SUB_AGENT' | 'AGENT' | 'ADMIN';

// 用户状态
export type UserStatus = 'ACTIVE' | 'BANNED';

// 用户
export interface User {
  id: string;
  username: string;
  role: Role;
  status: UserStatus;
  balance: number;
  commissionBalance: number;
  inviteCode: string;
  securityCode: string;
  parentId: string | null;
  createdAt: string;
}

// 用户简要信息（返回给前端）
export interface UserBrief {
  id: string;
  username: string;
  role: Role;
  status: UserStatus;
  balance: number;
  commissionBalance: number;
  inviteCode: string;
}

// 用户管理列表项
export interface UserManageItem {
  id: string;
  username: string;
  role: Role;
  status: UserStatus;
  balance: number;
  commissionBalance: number;
  inviteCode: string;
  createdAt: string;
  subAgentCount: number;
  orderCount: number;
}

// 商品
export interface Product {
  id: string;
  title: string;
  description: string;
  image: string;
  price: number;
  agentPrice: number;
  status: boolean;
  createdAt: string;
}

// 订单状态
export type OrderStatus = 'PENDING' | 'PAID' | 'COMPLETED' | 'REFUNDED';

// 订单
export interface Order {
  id: string;
  orderNo: string;
  userId: string;
  productId: string;
  amount: number;
  status: OrderStatus;
  paymentMethod: string;
  createdAt: string;
  product?: { id: string; title: string };
  user?: { id: string; username: string };
  node?: NodeBrief;
}

// 订单列表项
export interface OrderItem {
  id: string;
  orderNo: string;
  amount: number;
  status: OrderStatus;
  productTitle: string;
  paymentMethod: string;
  createdAt: string;
}

// 交易类型
export type TxType = 'RECHARGE' | 'PURCHASE' | 'AGENT_REWARD' | 'DISTRIBUTE_REBATE' | 'WITHDRAW' | 'REFUND';
export type WalletType = 'BALANCE' | 'COMMISSION';

// 交易流水
export interface TransactionItem {
  id: string;
  type: TxType;
  walletType: WalletType;
  amount: number;
  remark: string;
  createdAt: string;
}

// 节点实例状态
export type NodeStatus = 'AVAILABLE' | 'ASSIGNED' | 'EXPIRED' | 'MAINTENANCE';

// 节点实例
export interface NodeInstance {
  id: string;
  productId: string;
  host: string;
  port: number;
  protocol: string;
  password: string;
  remark: string;
  status: NodeStatus;
  orderId: string | null;
  userId: string | null;
  expireAt: string | null;
  trafficLimit: number;
  trafficUsed: number;
  createdAt: string;
  product?: { id: string; title: string; price: number };
  order?: { id: string; orderNo: string };
  user?: { id: string; username: string };
}

// 节点简要信息（用户侧展示）
export interface NodeBrief {
  id: string;
  productId: string;
  host: string;
  port: number;
  status: string;
  protocol: string;
  password: string;
  expireAt: string | null;
  trafficLimit: number;
  trafficUsed: number;
  productTitle: string;
  orderNo: string;
}

// 子代理
export interface SubAgent {
  id: string;
  username: string;
  role: Role;
  createdAt: string;
}

// 佣金记录
export interface CommissionRecord {
  id: string;
  amount: number;
  remark: string;
  createdAt: string;
}

// 代理价格配置
export interface AgentPriceConfigItem {
  id: string;
  subAgentId: string;
  productId: string;
  customPrice: number;
  product: { id: string; title: string; price: number };
}

// 支付配置
export interface PaymentConfigItem {
  id: string;
  platform: string;
  merchantId: string;
  apiKey: string;
  secretKey: string;
  notifyUrl: string;
  status: boolean;
}

// 分页参数
export interface PageParams {
  page: number;
  pageSize: number;
}

// 分页响应
export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// API 统一响应
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// JWT payload
export interface JwtPayload {
  userId: string;
  username: string;
  role: Role;
  iat?: number;
  exp?: number;
}

// 页面视图
export type View = 'auth' | 'home' | 'agent' | 'admin' | 'profile' | 'services';