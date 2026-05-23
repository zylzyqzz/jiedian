import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function genInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { action } = data;

    // ===== 注册 =====
    if (action === 'REGISTER') {
      const { username, password, securityCode, refCode } = data;
      if (!username || !password || !securityCode) {
        return NextResponse.json({ error: '用户名、密码、安全码均不能为空' }, { status: 400 });
      }
      const exists = await prisma.user.findUnique({ where: { username } });
      if (exists) return NextResponse.json({ error: '用户名已存在' }, { status: 400 });

      let inviteCode = genInviteCode();
      while (await prisma.user.findUnique({ where: { inviteCode } })) {
        inviteCode = genInviteCode();
      }

      let parentId: string | null = null;
      if (refCode) {
        const parent = await prisma.user.findUnique({ where: { inviteCode: refCode } });
        if (parent && parent.role === 'AGENT') parentId = parent.id;
      }

      const user = await prisma.user.create({
        data: { username, password, securityCode, inviteCode, parentId },
      });
      return NextResponse.json({
        success: true,
        user: { id: user.id, username: user.username, role: user.role, balance: user.balance, commissionBalance: user.commissionBalance, inviteCode: user.inviteCode },
      });
    }

    // ===== 登录 =====
    if (action === 'LOGIN') {
      const { username, password, loginRole } = data;
      if (!username || !password) return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 });
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });
      if (user.password !== password) return NextResponse.json({ error: '密码错误' }, { status: 401 });
      if (loginRole === 'ADMIN' && user.role !== 'ADMIN') return NextResponse.json({ error: '非管理员账号' }, { status: 403 });
      if (loginRole === 'AGENT' && user.role !== 'AGENT' && user.role !== 'SUB_AGENT') return NextResponse.json({ error: '非代理账号，请先充值3000元升级' }, { status: 403 });
      return NextResponse.json({
        success: true,
        user: { id: user.id, username: user.username, role: user.role, balance: user.balance, commissionBalance: user.commissionBalance, inviteCode: user.inviteCode },
      });
    }

    // ===== 修改密码 =====
    if (action === 'CHANGE_PASSWORD') {
      const { userId, oldPassword, newPassword } = data;
      if (!userId || !oldPassword || !newPassword) return NextResponse.json({ error: '参数不完整' }, { status: 400 });
      if (newPassword.length < 4) return NextResponse.json({ error: '新密码至少4位' }, { status: 400 });
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });
      if (user.password !== oldPassword) return NextResponse.json({ error: '原密码错误' }, { status: 401 });
      await prisma.user.update({ where: { id: userId }, data: { password: newPassword } });
      return NextResponse.json({ success: true, message: '密码修改成功' });
    }

    // ===== 充值 =====
    if (action === 'RECHARGE') {
      const { userId, amount } = data;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

      let targetRole = user.role;
      if ((user.role === 'USER' || user.role === 'DISTRIBUTOR') && amount >= 3000) targetRole = 'AGENT';

      await prisma.user.update({ where: { id: userId }, data: { balance: { increment: amount }, role: targetRole } });
      await prisma.transactionHistory.create({ data: { userId, type: 'RECHARGE', walletType: 'BALANCE', amount, remark: `充值入账 ￥${amount}，身份: ${targetRole}` } });

      if (user.role === 'USER' && user.parentId) {
        const parent = await prisma.user.findUnique({ where: { id: user.parentId } });
        if (parent && parent.role === 'AGENT') {
          await prisma.user.update({ where: { id: userId }, data: { role: 'SUB_AGENT' } });
          const reward = amount * 0.25;
          await prisma.user.update({ where: { id: parent.id }, data: { commissionBalance: { increment: reward } } });
          await prisma.transactionHistory.create({ data: { userId: parent.id, type: 'AGENT_REWARD', walletType: 'COMMISSION', amount: reward, remark: `招募子代理 ${user.username}，25%招商提成 ￥${reward}` } });
        }
      }
      return NextResponse.json({ success: true, role: targetRole, message: '充值成功' });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
