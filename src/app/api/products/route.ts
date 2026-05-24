import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, requireAgent } from '@/lib/auth';
import { productCreateSchema, agentSetPriceSchema } from '@/lib/validators';

/* ========== GET：商品列表 ========== */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';
    const category = searchParams.get('category');

    const where: any = all ? {} : { status: true };
    if (category && (category === 'LIVE' || category === 'NON_LIVE')) {
      where.category = category;
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: products });
  } catch (err: any) {
    console.error('[products GET]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/* ========== POST：管理员创建商品 / 代理为子代理设价 ========== */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    /* --- 管理员创建商品 --- */
    if (action === 'ADMIN_CREATE') {
      const session = await requireAdmin(request);
      if (!session) {
        return NextResponse.json({ success: false, error: '未授权：仅管理员可操作' }, { status: 403 });
      }

      const parsed = productCreateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
      }

      const product = await prisma.product.create({ data: parsed.data });
      return NextResponse.json({ success: true, data: product });
    }

    /* --- 代理为子代理设价 --- */
    if (action === 'AGENT_SET_PRICE') {
      const session = await requireAgent(request);
      if (!session) {
        return NextResponse.json({ success: false, error: '未授权：仅代理可操作' }, { status: 403 });
      }

      const parsed = agentSetPriceSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
      }

      // 校验代理是否有权为该子代理设价
      const subAgent = await prisma.user.findUnique({ where: { id: parsed.data.subAgentId } });
      if (!subAgent || subAgent.parentId !== session.userId) {
        return NextResponse.json({ success: false, error: '无权为此外部代理设置价格' }, { status: 403 });
      }

      const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } });
      if (!product) {
        return NextResponse.json({ success: false, error: '商品不存在' }, { status: 404 });
      }

      // 75折红线
      const minPrice = product.price * 0.75;
      if (parsed.data.newPrice < minPrice) {
        return NextResponse.json({
          success: false,
          error: `价格不得低于零售价的75折（最低 ￥${minPrice.toFixed(2)}）`,
        }, { status: 400 });
      }

      const existing = await prisma.agentPriceConfig.findFirst({
        where: {
          agentId: session.userId,
          subAgentId: parsed.data.subAgentId,
          productId: parsed.data.productId,
        },
      });

      if (existing) {
        await prisma.agentPriceConfig.update({
          where: { id: existing.id },
          data: { customPrice: parsed.data.newPrice },
        });
      } else {
        await prisma.agentPriceConfig.create({
          data: {
            agentId: session.userId,
            subAgentId: parsed.data.subAgentId,
            productId: parsed.data.productId,
            customPrice: parsed.data.newPrice,
          },
        });
      }

      return NextResponse.json({ success: true, message: '拿货价设置成功' });
    }

    return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
  } catch (err: any) {
    console.error('[products POST]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/* ========== PUT：管理员编辑商品 ========== */
export async function PUT(request: Request) {
  try {
    const session = await requireAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: '未授权：仅管理员可操作' }, { status: 403 });
    }

    const body = await request.json();
    const { id, title, description, image, originalPrice, price, agentPrice, category } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: '缺少商品ID' }, { status: 400 });
    }

    const data: any = { title, description, image, price: parseFloat(price), agentPrice: parseFloat(agentPrice) };
    if (originalPrice !== undefined) data.originalPrice = parseFloat(originalPrice) || 0;
    if (category) data.category = category;

    const product = await prisma.product.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, data: product });
  } catch (err: any) {
    console.error('[products PUT]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/* ========== PATCH：上下架切换 ========== */
export async function PATCH(request: Request) {
  try {
    const session = await requireAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: '未授权：仅管理员可操作' }, { status: 403 });
    }

    const { id, status } = await request.json();
    if (!id) {
      return NextResponse.json({ success: false, error: '缺少商品ID' }, { status: 400 });
    }

    await prisma.product.update({ where: { id }, data: { status } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[products PATCH]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/* ========== DELETE：删除商品 ========== */
export async function DELETE(request: Request) {
  try {
    const session = await requireAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: '未授权：仅管理员可操作' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: '缺少商品ID' }, { status: 400 });
    }

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[products DELETE]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
