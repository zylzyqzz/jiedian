import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAgent, requireAuth } from '@/lib/auth';
import { withdrawSchema } from '@/lib/validators';

/* ========== GET：代理控制台数据 ========== */
export async function GET(request: Request) {
  try {
    const session = await requireAgent(request);
    if (!session) {
      return NextResponse.json({ success: false, error: '未授权：仅代理可访问' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
    }

    // 子代理列表
    const subAgents = await prisma.user.findMany({
      where: { parentId: session.userId },
      select: { id: true, username: true, role: true, status: true, createdAt: true },
    });

    // 佣金流水
    const commissions = await prisma.transactionHistory.findMany({
      where: { userId: session.userId, walletType: 'COMMISSION' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, amount: true, remark: true, createdAt: true },
    });

    // 价格配置
    const priceConfigs = await prisma.agentPriceConfig.findMany({
      where: { agentId: session.userId },
      include: { product: { select: { id: true, title: true, price: true } } },
    });

    // 团队统计
    const teamOrders = await prisma.order.count({
      where: {
        user: { parentId: session.userId },
        status: { in: ['PAID', 'COMPLETED'] },
      },
    });

    const teamRevenue = await prisma.order.aggregate({
      where: {
        user: { parentId: session.userId },
        status: { in: ['PAID', 'COMPLETED'] },
      },
      _sum: { amount: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        balance: user.balance,
        commissionBalance: user.commissionBalance,
        inviteCode: user.inviteCode,
        subAgents,
        commissions,
        priceConfigs,
        teamStats: {
          subAgentCount: subAgents.length,
          teamOrders,
          teamRevenue: teamRevenue._sum.amount || 0,
        },
      },
    });
  } catch (err: any) {
    console.error('[agent GET]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/* ========== POST：佣金提现申请 ========== */
export async function POST(request: Request) {
  try {
    const session = await requireAgent(request);
    if (!session) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 403 });
    }

    const body = await request.json();
    const { action, amount, remark } = body;

    if (action === 'WITHDRAW') {
      const parsed = withdrawSchema.safeParse({ amount, remark });
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
      }

      const user = await prisma.user.findUnique({ where: { id: session.userId } });
      if (!user || user.commissionBalance < amount) {
        return NextResponse.json({ success: false, error: '可提现佣金不足' }, { status: 400 });
      }

      // 最低提现门槛
      const minSetting = await prisma.siteSetting.findUnique({ where: { key: 'withdrawMin' } });
      const withdrawMin = parseFloat(minSetting?.value || '100');
      if (amount < withdrawMin) {
        return NextResponse.json({ success: false, error: `最低提现金额为 ￥${withdrawMin}` }, { status: 400 });
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: session.userId },
          data: { commissionBalance: { decrement: amount } },
        }),
        prisma.transactionHistory.create({
          data: {
            userId: session.userId,
            type: 'WITHDRAW',
            walletType: 'COMMISSION',
            amount,
            remark: remark || '佣金提现申请',
          },
        }),
      ]);

      return NextResponse.json({ success: true, message: '提现申请已提交' });
    }

    return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
  } catch (err: any) {
    console.error('[agent POST]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
