import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET — 代理面板数据聚合
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: '缺少userId' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'AGENT') {
      return NextResponse.json({ error: '非代理身份' }, { status: 403 });
    }

    // 子代理列表（通过 parentId 关联）
    const subAgents = await prisma.user.findMany({ where: { parentId: userId } });

    // 佣金流水
    const commissions = await prisma.transactionHistory.findMany({
      where: { userId, walletType: 'COMMISSION' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // 各商品当前改价配置（该代理给子代理设过的价）
    const priceConfigs = await prisma.agentPriceConfig.findMany({
      where: { agentId: userId },
      include: { product: true },
    });

    return NextResponse.json({
      balance: user.balance,
      commissionBalance: user.commissionBalance,
      inviteCode: user.inviteCode,
      subAgents,
      commissions,
      priceConfigs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
