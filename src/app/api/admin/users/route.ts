import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

/* ========== GET：用户列表（分页） ========== */
export async function GET(request: Request) {
  try {
    const session = await requireAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search');
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    const where: any = {};
    if (search) {
      where.OR = [
        { username: { contains: search } },
        { inviteCode: { contains: search } },
      ];
    }
    if (role) where.role = role;
    if (status) where.status = status;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          role: true,
          status: true,
          balance: true,
          commissionBalance: true,
          inviteCode: true,
          createdAt: true,
          _count: {
            select: {
              orders: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    // 补充子代理数量统计
    const items = await Promise.all(
      users.map(async (u) => {
        let subAgentCount = 0;
        if (u.role === 'AGENT') {
          subAgentCount = await prisma.user.count({ where: { parentId: u.id } });
        }
        return {
          id: u.id,
          username: u.username,
          role: u.role,
          status: u.status,
          balance: u.balance,
          commissionBalance: u.commissionBalance,
          inviteCode: u.inviteCode,
          createdAt: u.createdAt,
          subAgentCount,
          orderCount: u._count.orders,
        };
      })
    );

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
    console.error('[admin/users GET]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/* ========== POST：充值 / 封禁 / 解封 ========== */
export async function POST(request: Request) {
  try {
    const session = await requireAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    /* --- 手动充值（余额或佣金） --- */
    if (action === 'RECHARGE') {
      const { userId, amount, walletType } = body;
      if (!userId || !amount || amount <= 0) {
        return NextResponse.json({ success: false, error: '参数错误' }, { status: 400 });
      }

      const target = await prisma.user.findUnique({ where: { id: userId } });
      if (!target) {
        return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
      }

      if (walletType === 'COMMISSION') {
        await prisma.user.update({
          where: { id: userId },
          data: { commissionBalance: { increment: amount } },
        });
        await prisma.transactionHistory.create({
          data: {
            userId,
            type: 'AGENT_REWARD',
            walletType: 'COMMISSION',
            amount,
            remark: `管理员手动充值佣金 ￥${amount}`,
          },
        });
      } else {
        await prisma.user.update({
          where: { id: userId },
          data: { balance: { increment: amount } },
        });
        await prisma.transactionHistory.create({
          data: {
            userId,
            type: 'RECHARGE',
            walletType: 'BALANCE',
            amount,
            remark: `管理员手动充值 ￥${amount}`,
          },
        });
      }

      return NextResponse.json({ success: true, message: '充值成功' });
    }

    /* --- 封禁用户 --- */
    if (action === 'BAN') {
      const { userId } = body;
      if (!userId) {
        return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { status: 'BANNED' },
      });

      return NextResponse.json({ success: true, message: '用户已封禁' });
    }

    /* --- 解封用户 --- */
    if (action === 'UNBAN') {
      const { userId } = body;
      if (!userId) {
        return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { status: 'ACTIVE' },
      });

      return NextResponse.json({ success: true, message: '用户已解封' });
    }

    /* --- 修改角色 --- */
    if (action === 'CHANGE_ROLE') {
      const { userId, role } = body;
      if (!userId || !role) {
        return NextResponse.json({ success: false, error: '参数错误' }, { status: 400 });
      }

      const validRoles = ['USER', 'AGENT', 'ADMIN'];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ success: false, error: '无效角色' }, { status: 400 });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { role },
      });

      return NextResponse.json({ success: true, message: '角色已更新' });
    }

    return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
  } catch (err: any) {
    console.error('[admin/users POST]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
