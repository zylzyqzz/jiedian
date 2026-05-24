import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken, requireAuth } from '@/lib/auth';
import { registerSchema, loginSchema, changePasswordSchema, rechargeSchema } from '@/lib/validators';
import { UserBrief } from '@/types';

function toBrief(user: any): UserBrief {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    status: user.status,
    balance: user.balance,
    commissionBalance: user.commissionBalance,
    inviteCode: user.inviteCode,
  };
}

function genInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/* ========== POST ========== */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    /* ----- 注册 ----- */
    if (action === 'REGISTER') {
      const parsed = registerSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
      }
      const { username, password, securityCode, refCode } = parsed.data;

      const exists = await prisma.user.findUnique({ where: { username } });
      if (exists) {
        return NextResponse.json({ success: false, error: '用户名已存在' }, { status: 409 });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const hashedSecurityCode = await bcrypt.hash(securityCode, 10);

      let inviteCode = genInviteCode();
      while (await prisma.user.findUnique({ where: { inviteCode } })) {
        inviteCode = genInviteCode();
      }

      let parentId: string | null = null;
      if (refCode) {
        const parent = await prisma.user.findUnique({ where: { inviteCode: refCode } });
        if (parent && (parent.role === 'AGENT' || parent.role === 'ADMIN')) {
          parentId = parent.id;
        }
      }

      const user = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          securityCode: hashedSecurityCode,
          inviteCode,
          parentId,
        },
      });

      const token = await signToken({
        userId: user.id,
        username: user.username,
        role: user.role as any,
      });

      return NextResponse.json({
        success: true,
        data: { user: toBrief(user), token },
      });
    }

    /* ----- 登录 ----- */
    if (action === 'LOGIN') {
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
      }
      const { username, password, loginRole } = parsed.data;

      const user = await prisma.user.findUnique({ where: { username } });
      if (!user) {
        return NextResponse.json({ success: false, error: '用户名或密码错误' }, { status: 401 });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return NextResponse.json({ success: false, error: '用户名或密码错误' }, { status: 401 });
      }

      if (loginRole === 'ADMIN' && user.role !== 'ADMIN') {
        return NextResponse.json({ success: false, error: '非管理员账号' }, { status: 403 });
      }
      if (loginRole === 'AGENT' && user.role !== 'AGENT') {
        return NextResponse.json({ success: false, error: '非代理账号，请先充值升级' }, { status: 403 });
      }

      // 封禁检查
      if (user.status === 'BANNED') {
        return NextResponse.json({ success: false, error: '账号已被封禁' }, { status: 403 });
      }

      const token = await signToken({
        userId: user.id,
        username: user.username,
        role: user.role as any,
      });

      return NextResponse.json({
        success: true,
        data: { user: toBrief(user), token },
      });
    }

    /* ----- 修改密码 ----- */
    if (action === 'CHANGE_PASSWORD') {
      const session = await requireAuth(request);
      if (!session) {
        return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
      }

      const parsed = changePasswordSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
      }
      const { oldPassword, newPassword } = parsed.data;
      // 使用 JWT 认证的 userId，而非请求体中的参数
      const userId = session.userId;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
      }

      const valid = await bcrypt.compare(oldPassword, user.password);
      if (!valid) {
        return NextResponse.json({ success: false, error: '原密码错误' }, { status: 401 });
      }

      const hashedNew = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({ where: { id: userId }, data: { password: hashedNew } });

      return NextResponse.json({ success: true, message: '密码修改成功' });
    }

    /* ----- 充值（管理员操作或系统内部） ----- */
    if (action === 'RECHARGE') {
      const parsed = rechargeSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
      }
      const { amount } = parsed.data;
      const userId = body.userId;
      if (!userId) {
        return NextResponse.json({ success: false, error: '缺少用户标识' }, { status: 400 });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
      }

      let targetRole = user.role;
      if ((user.role === 'USER') && amount >= 3000) {
        targetRole = 'AGENT';
      }

      await prisma.user.update({
        where: { id: userId },
        data: { balance: { increment: amount }, role: targetRole },
      });

      await prisma.transactionHistory.create({
        data: {
          userId,
          type: 'RECHARGE',
          walletType: 'BALANCE',
          amount,
          remark: `充值入账 ￥${amount}`,
        },
      });

      return NextResponse.json({ success: true, message: '充值成功', data: { role: targetRole } });
    }

    return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
  } catch (err: any) {
    console.error('[users]', err);
    return NextResponse.json({ success: false, error: err.message || '服务器内部错误' }, { status: 500 });
  }
}