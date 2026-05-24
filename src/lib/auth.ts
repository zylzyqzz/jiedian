import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';
import { JwtPayload, Role } from '@/types';

// JWT 密钥: 必须通过环境变量设置, 不存在时启动即报错
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET 环境变量未设置。请在 .env 文件中配置 JWT_SECRET。');
  }
  return new TextEncoder().encode(secret);
}
const JWT_SECRET = getJwtSecret();

const TOKEN_EXPIRY = '7d';

/* ========== 签发 JWT ========== */
export async function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

/* ========== 验证 JWT ========== */
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

/* ========== 从请求头提取 JWT ========== */
export function extractToken(req: Request | NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}

/* ========== 获取当前会话（任意角色） ========== */
export async function getSession(req: Request | NextRequest): Promise<JwtPayload | null> {
  const token = extractToken(req);
  if (!token) return null;
  return verifyToken(token);
}

/* ========== 角色守卫 ========== */
export async function requireRole(req: Request | NextRequest, ...roles: Role[]): Promise<JwtPayload | null> {
  const session = await getSession(req);
  if (!session) return null;
  if (roles.length > 0 && !roles.includes(session.role)) return null;
  return session;
}

/* ========== 管理员守卫 ========== */
export async function requireAdmin(req: Request | NextRequest): Promise<JwtPayload | null> {
  return requireRole(req, 'ADMIN');
}

/* ========== 代理守卫（含一级代理和子代理） ========== */
export async function requireAgent(req: Request | NextRequest): Promise<JwtPayload | null> {
  return requireRole(req, 'AGENT');
}

/* ========== 已登录守卫 ========== */
export async function requireAuth(req: Request | NextRequest): Promise<JwtPayload | null> {
  return getSession(req);
}