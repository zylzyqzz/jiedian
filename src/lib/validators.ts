import { z } from 'zod';

/* ========== 用户 ========== */
export const registerSchema = z.object({
  username: z.string().min(2, '用户名至少2位').max(20, '用户名最多20位'),
  password: z.string().min(4, '密码至少4位').max(32, '密码最多32位'),
  securityCode: z.string().min(4, '安全码至少4位').max(16, '安全码最多16位'),
  refCode: z.string().optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
  loginRole: z.enum(['USER', 'AGENT', 'ADMIN']),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '原密码不能为空'),
  newPassword: z.string().min(4, '新密码至少4位').max(32, '新密码最多32位'),
});

export const rechargeSchema = z.object({
  amount: z.number().positive('充值金额必须为正数').max(100000, '单笔充值上限10万'),
});

/* ========== 商品 ========== */
export const productCreateSchema = z.object({
  title: z.string().min(1, '商品名不能为空').max(100),
  description: z.string().max(1000).default(''),
  image: z.string().max(500000).default(''),
  price: z.number().positive('零售价必须为正数'),
  agentPrice: z.number().positive('代理价必须为正数'),
  category: z.enum(['LIVE', 'NON_LIVE']).default('LIVE'),
});

export const productUpdateSchema = z.object({
  id: z.string().uuid('无效的商品ID'),
  title: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  image: z.string().max(500000).optional(),
  price: z.number().positive(),
  agentPrice: z.number().positive(),
  category: z.enum(['LIVE', 'NON_LIVE']).optional(),
});

export const productToggleSchema = z.object({
  id: z.string().uuid(),
  status: z.boolean(),
});

export const agentSetPriceSchema = z.object({
  agentId: z.string().uuid(),
  subAgentId: z.string().uuid(),
  productId: z.string().uuid(),
  newPrice: z.number().positive('价格必须为正数'),
});

/* ========== 订单 ========== */
export const createOrderSchema = z.object({
  productId: z.string().uuid('无效的商品ID'),
  paymentMethod: z.string().optional(),
  paymentType: z.enum(['alipay', 'wxpay', 'sandbox', 'balance']).default('alipay'),
});

/* ========== 支付配置 ========== */
export const paymentConfigCreateSchema = z.object({
  platform: z.string().min(1, '平台名不能为空'),
  merchantId: z.string().min(1, '商户号不能为空'),
  apiKey: z.string().min(1, 'API地址不能为空'),
  secretKey: z.string().min(1, '密钥不能为空'),
  notifyUrl: z.string().url('回调地址格式不正确').optional(),
});

/* ========== 提现 ========== */
export const withdrawSchema = z.object({
  amount: z.number().positive('提现金额必须为正数').min(10, '最低提现10元'),
  remark: z.string().max(200).optional(),
});
