import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const configs = await prisma.paymentConfig.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(configs);
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { action } = data;

    if (action === 'CREATE') {
      const config = await prisma.paymentConfig.create({
        data: {
          platform: data.platform,
          merchantId: data.merchantId,
          apiKey: data.apiKey,
          secretKey: data.secretKey,
          notifyUrl: data.notifyUrl,
          status: true,
        },
      });
      return NextResponse.json({ success: true, config });
    }

    if (action === 'TOGGLE') {
      const config = await prisma.paymentConfig.findUnique({ where: { id: data.id } });
      if (!config) return NextResponse.json({ error: '配置不存在' }, { status: 404 });
      await prisma.paymentConfig.update({ where: { id: data.id }, data: { status: !config.status } });
      return NextResponse.json({ success: true });
    }

    if (action === 'DELETE') {
      await prisma.paymentConfig.delete({ where: { id: data.id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
