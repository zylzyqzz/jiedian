import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

/* ========== GET：个人中心数据 ========== */
export async function GET(request: Request) {
  try {
    const session = await requireAuth(request);
    if (!session) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        orders: {
          include: {
            product: { select: { title: true } },
            node: { select: { id: true, host: true, port: true, protocol: true, password: true, expireAt: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
    }

    let subAgentCount = 0;
    if (user.role === 'AGENT') {
      subAgentCount = await prisma.user.count({ where: { parentId: session.userId } });
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          status: user.status,
          balance: user.balance,
          commissionBalance: user.commissionBalance,
          inviteCode: user.inviteCode,
          createdAt: user.createdAt,
        },
        orders: user.orders.map(o => ({
          id: o.id,
          orderNo: o.orderNo,
          amount: o.amount,
          status: o.status,
          productTitle: o.product?.title || '未知商品',
          paymentMethod: o.paymentMethod,
          createdAt: o.createdAt,
          node: o.node ? {
            id: o.node.id,
            host: o.node.host,
            port: o.node.port,
            protocol: o.node.protocol,
            password: o.node.password,
            expireAt: o.node.expireAt,
          } : null,
        })),
        transactions: user.transactions.map(t => ({
          id: t.id,
          type: t.type,
          walletType: t.walletType,
          amount: t.amount,
          remark: t.remark,
          createdAt: t.createdAt,
        })),
        refLink: `?ref=${user.inviteCode}`,
        subAgentCount,
      },
    });
  } catch (err: any) {
    console.error('[me GET]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
