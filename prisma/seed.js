const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 清空旧数据
  await prisma.transactionHistory.deleteMany();
  await prisma.order.deleteMany();
  await prisma.agentPriceConfig.deleteMany();
  await prisma.paymentConfig.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  // 管理员
  await prisma.user.create({
    data: {
      username: 'admin',
      password: 'admin123',
      securityCode: 'admin666',
      role: 'ADMIN',
      balance: 0,
      commissionBalance: 0,
      inviteCode: 'ADMIN001',
    },
  });

  // 一级代理
  const agent = await prisma.user.create({
    data: {
      username: 'agent01',
      password: 'agent123',
      securityCode: 'agent666',
      role: 'AGENT',
      balance: 5000,
      commissionBalance: 750,
      inviteCode: 'AGENT001',
    },
  });

  // 子代理
  await prisma.user.create({
    data: {
      username: 'subagent01',
      password: 'sub123',
      securityCode: 'sub666',
      role: 'SUB_AGENT',
      balance: 2000,
      commissionBalance: 0,
      inviteCode: 'SUB001',
      parentId: agent.id,
    },
  });

  // 普通用户
  await prisma.user.create({
    data: {
      username: 'demo',
      password: 'demo123',
      securityCode: 'demo666',
      role: 'USER',
      balance: 0,
      commissionBalance: 0,
      inviteCode: 'DEMO001',
    },
  });

  // 商品
  const products = [
    { title: '新加坡高速节点', description: '低延迟 1Gbps 带宽，适合东南亚业务，解锁流媒体，支持 Trojan/VMess 协议', image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=500', price: 98, agentPrice: 49 },
    { title: '日本东京精品线路', description: 'BGP 优化线路，延迟 <50ms，原生 IP，支持 Netflix/Disney+ 解锁', image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=500', price: 128, agentPrice: 64 },
    { title: '美国洛杉矶 CN2 GIA', description: '电信 CN2 GIA 回程优化，1Gbps 带宽，三网直连，稳定低丢包', image: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=500', price: 88, agentPrice: 44 },
    { title: '香港 HKT 家宽', description: 'HKT 家宽原生 IP，动态住宅，指纹纯净，适合电商/TK 运营', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500', price: 188, agentPrice: 94 },
    { title: '德国法兰克福 BGP', description: '欧洲核心节点，1Gbps 不限流量，适合外贸建站、数据中转', image: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=500', price: 78, agentPrice: 39 },
    { title: '韩国首尔 SK 宽带', description: 'SK 宽带原生 IP，延迟极低，适合游戏加速、直播推流', image: 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=500', price: 108, agentPrice: 54 },
  ];
  for (const p of products) await prisma.product.create({ data: p });

  console.log('✅ 种子数据重置完成');
  console.log('   管理员: admin / admin123 / 安全码 admin666');
  console.log('   代理:   agent01 / agent123 / 安全码 agent666');
  console.log('   子代理: subagent01 / sub123 / 安全码 sub666');
  console.log('   用户:   demo / demo123 / 安全码 demo666');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
