import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 拉取商品列表（支持 ?all=true 查看全部含下架）
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get('all') === 'true';
  const products = await prisma.product.findMany({
    where: all ? {} : { status: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(products);
}

// 混合处理器：1. 管理员自定义新增商品 | 2. 代理给子代理改价（控制不低于75折破价红线）
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { action } = data;

    // 动作一：管理员完全自定义商品图文、价格
    if (action === 'ADMIN_CREATE') {
      const newProduct = await prisma.product.create({
        data: {
          title: data.title,
          description: data.description,
          image: data.image,
          price: parseFloat(data.price),
          agentPrice: parseFloat(data.agentPrice),
        },
      });
      return NextResponse.json({ success: true, product: newProduct });
    }

    // 动作二：一级代理给子代理设置采购价（强设75折安全卡点）
    if (action === 'AGENT_SET_PRICE') {
      const { agentId, subAgentId, productId, newPrice } = data;
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) return NextResponse.json({ error: '商品未找到' }, { status: 404 });

      // 核心安全卡点：二级代理的采购价格绝对不能低于零售价的75折（75%）
      const minPriceAllowed = product.price * 0.75;
      if (newPrice < minPriceAllowed) {
        return NextResponse.json({
          error: `提价失败！子代理进货价不得低于平台统一定价的75折（即最低: ${minPriceAllowed} 元）`
        }, { status: 400 });
      }

      const config = await prisma.agentPriceConfig.findFirst({
        where: { agentId, subAgentId, productId }
      });

      if (config) {
        await prisma.agentPriceConfig.update({ where: { id: config.id }, data: { customPrice: newPrice } });
      } else {
        await prisma.agentPriceConfig.create({ data: { agentId, subAgentId, productId, customPrice: newPrice } });
      }

      return NextResponse.json({ success: true, message: '子代理拿货价设置成功，安全红线风控通过' });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT — 管理员编辑商品
export async function PUT(request: Request) {
  try {
    const { id, title, description, image, price, agentPrice } = await request.json();
    if (!id) return NextResponse.json({ error: '缺少商品ID' }, { status: 400 });

    const product = await prisma.product.update({
      where: { id },
      data: { title, description, image, price: parseFloat(price), agentPrice: parseFloat(agentPrice) },
    });
    return NextResponse.json({ success: true, product });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — 上下架切换
export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json();
    if (!id) return NextResponse.json({ error: '缺少商品ID' }, { status: 400 });

    await prisma.product.update({ where: { id }, data: { status } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — 删除商品
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: '缺少商品ID' }, { status: 400 });

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
