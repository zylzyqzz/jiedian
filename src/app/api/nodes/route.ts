import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

function genPassword(len = 16) {
  return crypto.randomBytes(len).toString('hex').slice(0, len);
}

/* ========== GET：节点列表（管理员） ========== */
export async function GET(request: Request) {
  try {
    const session = await requireAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const productId = searchParams.get('productId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};
    if (productId) where.productId = productId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { host: { contains: search } },
        { remark: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.nodeInstance.findMany({
        where,
        include: {
          product: { select: { id: true, title: true, price: true } },
          order: { select: { id: true, orderNo: true } },
          user: { select: { id: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.nodeInstance.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err: any) {
    console.error('[nodes GET]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/* ========== POST：创建节点 / 批量生成 / 手动分配 ========== */
export async function POST(request: Request) {
  try {
    const session = await requireAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    /* --- 单个创建 --- */
    if (action === 'CREATE') {
      const { productId, host, port, protocol, password, remark, trafficLimit } = body;
      if (!productId || !host || !port) {
        return NextResponse.json({ success: false, error: '缺少必要字段' }, { status: 400 });
      }

      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) {
        return NextResponse.json({ success: false, error: '商品不存在' }, { status: 404 });
      }

      const node = await prisma.nodeInstance.create({
        data: {
          productId,
          host,
          port: parseInt(port),
          protocol: protocol || 'trojan',
          password: password || genPassword(16),
          remark: remark || '',
          trafficLimit: trafficLimit || 500,
          status: 'AVAILABLE',
        },
      });

      return NextResponse.json({ success: true, data: node });
    }

    /* --- 批量生成 --- */
    if (action === 'BATCH_GENERATE') {
      const { productId, count, hostPrefix, startPort, protocol } = body;
      if (!productId || !count || !hostPrefix || !startPort) {
        return NextResponse.json({ success: false, error: '缺少必要字段' }, { status: 400 });
      }

      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) {
        return NextResponse.json({ success: false, error: '商品不存在' }, { status: 404 });
      }

      const nodes = [];
      for (let i = 0; i < Math.min(count, 100); i++) {
        const idx = String(i + 1).padStart(2, '0');
        nodes.push({
          productId,
          host: `${hostPrefix}${idx}.nodehub.pro`,
          port: startPort + i,
          protocol: protocol || 'trojan',
          password: genPassword(16),
          trafficLimit: 500,
          status: 'AVAILABLE',
        });
      }

      await prisma.nodeInstance.createMany({ data: nodes });
      const created = await prisma.nodeInstance.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        take: count,
      });

      return NextResponse.json({ success: true, data: created, message: `成功生成 ${count} 个节点` });
    }

    /* --- 手动分配节点给订单 --- */
    if (action === 'ASSIGN') {
      const { nodeId, orderId } = body;
      if (!nodeId || !orderId) {
        return NextResponse.json({ success: false, error: '缺少 nodeId 或 orderId' }, { status: 400 });
      }

      const node = await prisma.nodeInstance.findUnique({ where: { id: nodeId } });
      if (!node || node.status !== 'AVAILABLE') {
        return NextResponse.json({ success: false, error: '节点不可用' }, { status: 400 });
      }

      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) {
        return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
      }

      const expireAt = new Date();
      expireAt.setDate(expireAt.getDate() + 30);

      await prisma.nodeInstance.update({
        where: { id: nodeId },
        data: {
          status: 'ASSIGNED',
          orderId,
          userId: order.userId,
          expireAt,
        },
      });

      return NextResponse.json({ success: true, message: '节点分配成功' });
    }

    /* --- 回收节点 --- */
    if (action === 'RECYCLE') {
      const { nodeId } = body;
      await prisma.nodeInstance.update({
        where: { id: nodeId },
        data: {
          status: 'AVAILABLE',
          orderId: null,
          userId: null,
          expireAt: null,
          trafficUsed: 0,
        },
      });
      return NextResponse.json({ success: true, message: '节点已回收' });
    }

    /* --- 维护模式切换 --- */
    if (action === 'TOGGLE_MAINTENANCE') {
      const { nodeId } = body;
      const node = await prisma.nodeInstance.findUnique({ where: { id: nodeId } });
      if (!node) {
        return NextResponse.json({ success: false, error: '节点不存在' }, { status: 404 });
      }

      const newStatus = node.status === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE';
      await prisma.nodeInstance.update({
        where: { id: nodeId },
        data: { status: newStatus },
      });

      return NextResponse.json({ success: true, message: `节点已${newStatus === 'MAINTENANCE' ? '设为维护' : '恢复可用'}` });
    }

    return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
  } catch (err: any) {
    console.error('[nodes POST]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/* ========== DELETE：删除节点 ========== */
export async function DELETE(request: Request) {
  try {
    const session = await requireAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: '缺少节点ID' }, { status: 400 });
    }

    await prisma.nodeInstance.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[nodes DELETE]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
