import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

/* ========== 易支付 MD5 字典序签名 ========== */
function yiPaySign(params: Record<string, string | number>, secretKey: string): string {
  const keys = Object.keys(params)
    .filter(k => k !== 'sign' && k !== 'sign_type' && params[k] !== '' && params[k] !== undefined)
    .sort();
  const raw = keys.map(k => `${k}=${params[k]}`).join('&') + secretKey;
  return crypto.createHash('md5').update(raw).digest('hex');
}

/* ========== POST：创建订单 ========== */
export async function POST(request: Request) {
  try {
    const { userId, productId, paymentMethod, paymentType } = await request.json();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!user || !product) return NextResponse.json({ error: '用户或商品不存在' }, { status: 404 });

    let finalPrice = product.price;
    if (user.role === 'AGENT') finalPrice = product.agentPrice;
    else if (user.role === 'SUB_AGENT') {
      const cfg = await prisma.agentPriceConfig.findFirst({ where: { subAgentId: user.id, productId: product.id } });
      if (cfg) finalPrice = cfg.customPrice;
    }

    /* ===== AGENT/SUB_AGENT → 内盘余额直扣 ===== */
    if (user.role === 'AGENT' || user.role === 'SUB_AGENT') {
      if (user.balance < finalPrice) return NextResponse.json({ error: '代理余额不足，请先充值' }, { status: 400 });
      const order = await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: userId }, data: { balance: { decrement: finalPrice } } });
        const o = await tx.order.create({ data: { orderNo: 'NODE' + Date.now(), userId, productId, amount: finalPrice, status: 'PAID', paymentMethod: 'BALANCE' } });
        await tx.transactionHistory.create({ data: { userId, orderId: o.id, type: 'PURCHASE', walletType: 'BALANCE', amount: finalPrice, remark: `代理扣款：${product.title}，￥${finalPrice}` } });
        return o;
      });
      return NextResponse.json({ success: true, orderNo: order.orderNo, status: 'PAID', payType: 'balance' });
    }

    /* ===== USER → 第三方易支付跳转 ===== */
    const payCfg = await prisma.paymentConfig.findFirst({ where: { status: true } });
    if (!payCfg) return NextResponse.json({ error: '支付通道未配置，请联系管理员' }, { status: 500 });

    const orderNo = 'NODE' + Date.now();
    await prisma.order.create({ data: { orderNo, userId, productId, amount: finalPrice, status: 'PENDING', paymentMethod: paymentMethod || paymentType || 'alipay' } });

    const origin = request.headers.get('origin') || request.headers.get('host') || 'http://localhost:3457';
    const baseUrl = origin.startsWith('http') ? origin : `http://${origin}`;
    const notifyUrl = `${baseUrl}/api/pay-callback`;
    const returnUrl = `${baseUrl}/`;

    const params: Record<string, string | number> = {
      pid: payCfg.merchantId,
      type: paymentType || 'alipay',
      out_trade_no: orderNo,
      notify_url: notifyUrl,
      return_url: returnUrl,
      name: product.title,
      money: finalPrice.toFixed(2),
    };
    const sign = yiPaySign(params, payCfg.secretKey);
    params.sign = sign;
    params.sign_type = 'MD5';

    const gateway = payCfg.apiKey || 'https://pay.epay.com/submit.php';
    const qs = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
    const paymentUrl = `${gateway}?${qs}`;

    return NextResponse.json({ success: true, orderNo, status: 'PENDING', payType: 'redirect', paymentUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ========== GET：订单查询 ========== */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');
    const where: any = role === 'ADMIN' ? {} : { userId };
    const orders = await prisma.order.findMany({ where, include: { product: true, user: true }, orderBy: { createdAt: 'desc' }, take: 100 });
    return NextResponse.json(orders);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
