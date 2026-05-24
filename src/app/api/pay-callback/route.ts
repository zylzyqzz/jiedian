import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

/* ========== 易支付 MD5 验签 ========== */
function yiPayVerify(params: Record<string, string>, secretKey: string): boolean {
  const sign = params.sign;
  if (!sign) return false;

  const keys = Object.keys(params)
    .filter(k => k !== 'sign' && k !== 'sign_type' && params[k] !== '' && params[k] !== undefined)
    .sort();
  const raw = keys.map(k => `${k}=${params[k]}`).join('&') + secretKey;
  const computed = crypto.createHash('md5').update(raw).digest('hex');

  return computed === sign;
}

/* ========== 自动分配节点 ========== */
async function autoAssignNode(productId: string, orderId: string, userId: string) {
  const node = await prisma.nodeInstance.findFirst({
    where: { productId, status: 'AVAILABLE' },
    orderBy: { createdAt: 'asc' },
  });

  if (!node) return;

  const expireAt = new Date();
  expireAt.setDate(expireAt.getDate() + 30);

  await prisma.nodeInstance.update({
    where: { id: node.id },
    data: {
      status: 'ASSIGNED',
      orderId,
      userId,
      expireAt,
    },
  });
}

/* ========== POST：易支付异步回调 ========== */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let params: Record<string, string>;

    if (contentType.includes('application/json')) {
      params = await request.json();
    } else {
      const text = await request.text();
      params = Object.fromEntries(new URLSearchParams(text));
    }

    const orderNo = params.out_trade_no;
    const tradeStatus = params.trade_status;

    if (!orderNo) {
      return NextResponse.json({ code: 0, msg: '缺少订单号' }, { status: 400 });
    }

    // 查找订单
    const order = await prisma.order.findUnique({ where: { orderNo } });
    if (!order) {
      return NextResponse.json({ code: 0, msg: '订单不存在' }, { status: 404 });
    }

    const payCfg = await prisma.paymentConfig.findFirst({ where: { status: true } });
    if (!payCfg) {
      return NextResponse.json({ code: 0, msg: '支付配置不存在' }, { status: 500 });
    }

    // 验签
    if (!yiPayVerify(params, payCfg.secretKey)) {
      console.error('[pay-callback] 签名验证失败', orderNo);
      return NextResponse.json({ code: 0, msg: '签名验证失败' }, { status: 403 });
    }

    // 防止重复回调
    if (order.status !== 'PENDING') {
      return NextResponse.json({ code: 1, msg: 'success' });
    }

    // 支付成功
    if (tradeStatus === 'TRADE_SUCCESS') {
      await prisma.$transaction([
        prisma.order.update({
          where: { orderNo },
          data: { status: 'PAID' },
        }),
        prisma.transactionHistory.create({
          data: {
            userId: order.userId,
            orderId: order.id,
            type: 'PURCHASE',
            walletType: 'BALANCE',
            amount: order.amount,
            remark: `第三方支付成功：${orderNo}`,
          },
        }),
      ]);

      // 自动分配节点
      await autoAssignNode(order.productId, order.id, order.userId);
    }

    return NextResponse.json({ code: 1, msg: 'success' });
  } catch (err: any) {
    console.error('[pay-callback]', err);
    return NextResponse.json({ code: 0, msg: err.message }, { status: 500 });
  }
}

/* ========== GET：浏览器同步跳转（处理 return_url） ========== */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderNo = searchParams.get('out_trade_no');
  const tradeStatus = searchParams.get('trade_status');

  // GET 回调仅用于浏览器跳转，不做状态变更（状态由 POST 异步回调处理）
  // 构建支付成功页 URL，传递订单号供前端展示
  const successUrl = new URL('/pay-success', request.url);
  if (orderNo) {
    successUrl.searchParams.set('out_trade_no', orderNo);
  }
  if (tradeStatus === 'TRADE_SUCCESS') {
    successUrl.searchParams.set('status', 'success');
  }
  return NextResponse.redirect(successUrl);
}