import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { paymentConfigCreateSchema } from '@/lib/validators';

/* ========== GET：获取全部支付配置（管理员） ========== */
export async function GET(request: Request) {
  try {
    const session = await requireAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 403 });
    }
    const configs = await prisma.paymentConfig.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ success: true, data: configs });
  } catch (err: any) {
    console.error('[payment GET]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/* ========== POST：创建 / 切换 / 删除 ========== */
export async function POST(request: Request) {
  try {
    const session = await requireAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: '未授权：仅管理员可操作' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'CREATE') {
      const parsed = paymentConfigCreateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
      }
      const config = await prisma.paymentConfig.create({
        data: {
          ...parsed.data,
          notifyUrl: parsed.data.notifyUrl || '',
          status: true,
        },
      });
      return NextResponse.json({ success: true, data: config });
    }

    if (action === 'TOGGLE') {
      const config = await prisma.paymentConfig.findUnique({ where: { id: body.id } });
      if (!config) {
        return NextResponse.json({ success: false, error: '配置不存在' }, { status: 404 });
      }
      await prisma.paymentConfig.update({
        where: { id: body.id },
        data: { status: !config.status },
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'DELETE') {
      await prisma.paymentConfig.delete({ where: { id: body.id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
  } catch (err: any) {
    console.error('[payment POST]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}