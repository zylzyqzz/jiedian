import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: '缺少userId' }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        orders: { include: { product: true }, orderBy: { createdAt: 'desc' }, take: 50 },
        transactions: { orderBy: { createdAt: 'desc' }, take: 100 },
      },
    });
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

    let subAgentCount = 0;
    if (user.role === 'AGENT') {
      subAgentCount = await prisma.user.count({ where: { parentId: userId } });
    }

    const refLink = `?ref=${user.inviteCode}`;

    return NextResponse.json({
      user: {
        id: user.id, username: user.username, role: user.role,
        balance: user.balance, commissionBalance: user.commissionBalance,
        inviteCode: user.inviteCode, createdAt: user.createdAt,
      },
      orders: user.orders.map(o => ({
        id: o.id, orderNo: o.orderNo, amount: o.amount, status: o.status,
        productTitle: o.product?.title, createdAt: o.createdAt,
      })),
      transactions: user.transactions.map(t => ({
        id: t.id, type: t.type, walletType: t.walletType, amount: t.amount,
        remark: t.remark, createdAt: t.createdAt,
      })),
      refLink,
      subAgentCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
