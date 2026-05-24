import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

/* ========== GET：用户查看已购节点服务 ========== */
export async function GET(request: Request) {
  try {
    const session = await requireAuth(request);
    if (!session) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const nodes = await prisma.nodeInstance.findMany({
      where: {
        userId: session.userId,
        status: { in: ['ASSIGNED', 'EXPIRED'] },
      },
      include: {
        product: { select: { id: true, title: true } },
        order: { select: { id: true, orderNo: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const services = nodes.map(n => ({
      id: n.id,
      productId: n.productId,
      host: n.host,
      port: n.port,
      protocol: n.protocol,
      password: n.password,
      expireAt: n.expireAt,
      trafficLimit: n.trafficLimit,
      trafficUsed: n.trafficUsed,
      productTitle: n.product?.title || '未知商品',
      orderNo: n.order?.orderNo || '',
      status: n.status,
    }));

    return NextResponse.json({ success: true, data: services });
  } catch (err: any) {
    console.error('[services GET]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
