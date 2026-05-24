import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

/* ========== GET：管理员数据看板 ========== */
export async function GET(request: Request) {
  try {
    const session = await requireAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 403 });
    }

    const [
      totalUsers,
      totalAgents,
      totalProducts,
      totalOrders,
      pendingOrders,
      todayOrders,
      todayRevenue,
      totalRevenue,
      recentOrders,
      topAgents,
      totalNodes,
      availableNodes,
      assignedNodes,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: { in: ['AGENT', 'SUB_AGENT'] } } }),
      prisma.product.count(),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
      prisma.order.aggregate({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          status: { in: ['PAID', 'COMPLETED'] },
        },
        _sum: { amount: true },
      }),
      prisma.order.aggregate({
        where: { status: { in: ['PAID', 'COMPLETED'] } },
        _sum: { amount: true },
      }),
      prisma.order.findMany({
        include: {
          product: { select: { title: true } },
          user: { select: { username: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.user.findMany({
        where: { role: 'AGENT' },
        select: {
          id: true,
          username: true,
          commissionBalance: true,
          _count: { select: { orders: true } },
        },
        orderBy: { commissionBalance: 'desc' },
        take: 10,
      }),
      prisma.nodeInstance.count(),
      prisma.nodeInstance.count({ where: { status: 'AVAILABLE' } }),
      prisma.nodeInstance.count({ where: { status: 'ASSIGNED' } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalAgents,
          totalProducts,
          totalOrders,
          pendingOrders,
          todayOrders,
          todayRevenue: todayRevenue._sum.amount || 0,
          totalRevenue: totalRevenue._sum.amount || 0,
          totalNodes,
          availableNodes,
          assignedNodes,
        },
        recentOrders: recentOrders.map(o => ({
          id: o.id,
          orderNo: o.orderNo,
          amount: o.amount,
          status: o.status,
          productTitle: o.product?.title || '-',
          username: o.user?.username || '-',
          createdAt: o.createdAt,
        })),
        topAgents,
      },
    });
  } catch (err: any) {
    console.error('[dashboard]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
