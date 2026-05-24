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

    // 佣金流水
    const commissions = await prisma.transactionHistory.findMany({
      where: { userId: session.userId, walletType: 'COMMISSION' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, amount: true, remark: true, createdAt: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        balance: user.balance,
        commissionBalance: user.commissionBalance,
        inviteCode: user.inviteCode,
        commissions,
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
    const session = await requireAuth(request);
    if (!session) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { action, amount, remark, realName, phone } = body;

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

      const remarkText = [
        remark || '佣金提现申请',
        realName ? `姓名: ${realName}` : '',
        phone ? `手机: ${phone}` : '',
      ].filter(Boolean).join('，');

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
            remark: remarkText,
          },
        }),
      ]);

      return NextResponse.json({ success: true, message: '提现申请已提交，客服会尽快处理' });
    }

    return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
  } catch (err: any) {
    console.error('[agent POST]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
