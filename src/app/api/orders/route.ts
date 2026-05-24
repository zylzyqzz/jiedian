import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { createOrderSchema } from '@/lib/validators';

/* ========== 易支付 MD5 字典序签名 ========== */
function yiPaySign(params: Record<string, string | number>, secretKey: string): string {
  const keys = Object.keys(params)
    .filter(k => k !== 'sign' && k !== 'sign_type' && params[k] !== '' && params[k] !== undefined)
    .sort();
  const raw = keys.map(k => `${k}=${params[k]}`).join('&') + secretKey;
  return crypto.createHash('md5').update(raw).digest('hex');
}

/* ========== 自动分配可用节点 ========== */
async function autoAssignNode(productId: string, orderId: string, userId: string) {
  const node = await prisma.nodeInstance.findFirst({
    where: { productId, status: 'AVAILABLE' },
    orderBy: { createdAt: 'asc' },
  });

  if (!node) return null;

  const expireAt = new Date();
  expireAt.setDate(expireAt.getDate() + 30);

  return prisma.nodeInstance.update({
    where: { id: node.id },
    data: {
      status: 'ASSIGNED',
      orderId,
      userId,
      expireAt,
    },
  });
}

/* ========== POST：创建订单 ========== */
export async function POST(request: Request) {
  try {
    const session = await requireAuth(request);
    if (!session) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { productId, paymentMethod, paymentType } = parsed.data;
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    const product = await prisma.product.findUnique({ where: { id: productId } });

    if (!user || !product || !product.status) {
      return NextResponse.json({ success: false, error: '用户或商品不存在/已下架' }, { status: 404 });
    }

    // 封禁检查
    if (user.status === 'BANNED') {
      return NextResponse.json({ success: false, error: '账号已被封禁，无法下单' }, { status: 403 });
    }

    let finalPrice = product.price;
    if (user.role === 'AGENT') {
      finalPrice = product.agentPrice;
    } else if (user.role === 'SUB_AGENT') {
      const cfg = await prisma.agentPriceConfig.findFirst({
        where: { subAgentId: user.id, productId: product.id },
      });
      if (cfg) finalPrice = cfg.customPrice;
    }

    /* ---- 代理/子代理：余额直扣 + 自动分配节点 ---- */
    if (user.role === 'AGENT' || user.role === 'SUB_AGENT') {
      if (user.balance < finalPrice) {
        return NextResponse.json({ success: false, error: '代理余额不足，请先充值' }, { status: 400 });
      }

      const result = await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: session.userId },
          data: { balance: { decrement: finalPrice } },
        });

        const orderId = uuidv4();
        const o = await tx.order.create({
          data: {
            orderNo: `NODE-${Date.now()}-${orderId.slice(0, 8)}`,
            userId: session.userId,
            productId,
            amount: finalPrice,
            status: 'PAID',
            paymentMethod: 'BALANCE',
          },
        });

        await tx.transactionHistory.create({
          data: {
            userId: session.userId,
            orderId: o.id,
            type: 'PURCHASE',
            walletType: 'BALANCE',
            amount: finalPrice,
            remark: `代理直购 ${product.title}`,
          },
        });

        // 分销返佣
        if (user.role === 'SUB_AGENT' && user.parentId) {
          const parent = await tx.user.findUnique({ where: { id: user.parentId } });
          if (parent && parent.role === 'AGENT') {
            const commission = finalPrice * 0.15;
            await tx.user.update({
              where: { id: parent.id },
              data: { commissionBalance: { increment: commission } },
            });
            await tx.transactionHistory.create({
              data: {
                userId: parent.id,
                orderId: o.id,
                type: 'DISTRIBUTE_REBATE',
                walletType: 'COMMISSION',
                amount: commission,
                remark: `分销返佣：子代理 ${user.username} 购买 ${product.title}`,
              },
            });
          }
        }

        return o;
      });

      // 自动分配节点
      const node = await autoAssignNode(productId, result.id, session.userId);

      return NextResponse.json({
        success: true,
        data: {
          orderNo: result.orderNo,
          status: 'PAID',
          payType: 'balance',
          node: node ? {
            id: node.id,
            host: node.host,
            port: node.port,
            protocol: node.protocol,
            password: node.password,
            expireAt: node.expireAt,
            productTitle: product.title,
          } : null,
        },
      });
    }

    /* ---- 普通用户：第三方支付 ---- */
    const payCfg = await prisma.paymentConfig.findFirst({ where: { status: true } });
    if (!payCfg) {
      return NextResponse.json({ success: false, error: '支付通道未配置' }, { status: 500 });
    }

    const orderId = uuidv4();
    const orderNo = `NODE-${Date.now()}-${orderId.slice(0, 8)}`;
    await prisma.order.create({
      data: {
        orderNo,
        userId: session.userId,
        productId,
        amount: finalPrice,
        status: 'PENDING',
        paymentMethod: paymentMethod || paymentType || 'alipay',
      },
    });

    const origin = request.headers.get('origin') || request.headers.get('host') || 'http://localhost:3000';
    const baseUrl = origin.startsWith('http') ? origin : `http://${origin}`;
    const notifyUrl = `${baseUrl}/api/pay-callback`;
    const returnUrl = `${baseUrl}/pay-success`;

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
    const qs = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    const paymentUrl = `${gateway}?${qs}`;

    return NextResponse.json({
      success: true,
      data: {
        orderNo,
        status: 'PENDING',
        payType: 'redirect',
        paymentUrl,
      },
    });
  } catch (err: any) {
    console.error('[orders POST]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/* ========== GET：订单查询 ========== */
export async function GET(request: Request) {
  try {
    const session = await requireAuth(request);
    if (!session) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const role = searchParams.get('role');

    const where: any =
      role === 'ADMIN' ? {} : { userId: session.userId };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          product: { select: { id: true, title: true } },
          user: { select: { id: true, username: true } },
          node: {
            select: {
              id: true,
              host: true,
              port: true,
              protocol: true,
              password: true,
              expireAt: true,
              trafficLimit: true,
              trafficUsed: true,
              productId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    const items = orders.map(o => ({
      id: o.id,
      orderNo: o.orderNo,
      amount: o.amount,
      status: o.status,
      paymentMethod: o.paymentMethod,
      createdAt: o.createdAt,
      productTitle: o.product?.title || '-',
      username: o.user?.username || '-',
      node: o.node ? {
        id: o.node.id,
        productId: o.node.productId,
        host: o.node.host,
        port: o.node.port,
        protocol: o.node.protocol,
        password: o.node.password,
        expireAt: o.node.expireAt,
        trafficLimit: o.node.trafficLimit,
        trafficUsed: o.node.trafficUsed,
        productTitle: o.product?.title || '',
        orderNo: o.orderNo,
      } : null,
    }));

    return NextResponse.json({
      success: true,
      data: { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err: any) {
    console.error('[orders GET]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}