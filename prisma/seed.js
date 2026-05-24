const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

function genPassword(len = 16) {
  return crypto.randomBytes(len).toString('hex').slice(0, len);
}

async function main() {
  // 清空旧数据
  await prisma.nodeInstance.deleteMany();
  await prisma.transactionHistory.deleteMany();
  await prisma.order.deleteMany();
  await prisma.agentPriceConfig.deleteMany();
  await prisma.paymentConfig.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  const hash = (pw) => bcrypt.hashSync(pw, 10);

  // 管理员
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      password: hash('admin123'),
      securityCode: hash('admin666'),
      role: 'ADMIN',
      status: 'ACTIVE',
      balance: 0,
      commissionBalance: 0,
      inviteCode: 'ADMIN001',
    },
  });

  // 一级代理
  const agent = await prisma.user.create({
    data: {
      username: 'agent01',
      password: hash('agent123'),
      securityCode: hash('agent666'),
      role: 'AGENT',
      status: 'ACTIVE',
      balance: 5000,
      commissionBalance: 750,
      inviteCode: 'AGENT001',
    },
  });

  // 子代理（agent01 的下级）
  const subagent = await prisma.user.create({
    data: {
      username: 'subagent01',
      password: hash('sub123'),
      securityCode: hash('sub666'),
      role: 'SUB_AGENT',
      status: 'ACTIVE',
      balance: 2000,
      commissionBalance: 0,
      inviteCode: 'SUB001',
      parentId: agent.id,
    },
  });

  // 普通用户
  const demo = await prisma.user.create({
    data: {
      username: 'demo',
      password: hash('demo123'),
      securityCode: hash('demo666'),
      role: 'USER',
      status: 'ACTIVE',
      balance: 0,
      commissionBalance: 0,
      inviteCode: 'DEMO001',
    },
  });

  // 被封禁用户（测试用）
  await prisma.user.create({
    data: {
      username: 'banned_user',
      password: hash('banned123'),
      securityCode: hash('banned666'),
      role: 'USER',
      status: 'BANNED',
      balance: 0,
      commissionBalance: 0,
      inviteCode: 'BANNED01',
    },
  });

  // 商品 + 节点池
  const nodeSpecs = [
    {
      product: { title: '新加坡高速节点', description: '低延迟 1Gbps 带宽，适合东南亚业务，解锁流媒体，支持 Trojan/VMess 协议', image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=500', price: 98, agentPrice: 49 },
      nodes: [
        { host: 'sg1.nodehub.pro', port: 443, protocol: 'trojan', remark: '新加坡 BGP 线路 01' },
        { host: 'sg2.nodehub.pro', port: 8443, protocol: 'vmess', remark: '新加坡 BGP 线路 02' },
        { host: 'sg3.nodehub.pro', port: 443, protocol: 'trojan', remark: '新加坡 CN2 优化' },
      ],
    },
    {
      product: { title: '日本东京精品线路', description: 'BGP 优化线路，延迟 <50ms，原生 IP，支持 Netflix/Disney+ 解锁', image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=500', price: 128, agentPrice: 64 },
      nodes: [
        { host: 'jp1.nodehub.pro', port: 443, protocol: 'trojan', remark: '东京 BGP 01' },
        { host: 'jp2.nodehub.pro', port: 8443, protocol: 'vmess', remark: '东京 BBtec 线路' },
        { host: 'jp3.nodehub.pro', port: 443, protocol: 'trojan', remark: '东京 IIJ 优化' },
      ],
    },
    {
      product: { title: '美国洛杉矶 CN2 GIA', description: '电信 CN2 GIA 回程优化，1Gbps 带宽，三网直连，稳定低丢包', image: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=500', price: 88, agentPrice: 44 },
      nodes: [
        { host: 'us1.nodehub.pro', port: 443, protocol: 'trojan', remark: '洛杉矶 CN2 GIA 01' },
        { host: 'us2.nodehub.pro', port: 8443, protocol: 'vmess', remark: '洛杉矶 CN2 GIA 02' },
      ],
    },
    {
      product: { title: '香港 HKT 家宽', description: 'HKT 家宽原生 IP，动态住宅，指纹纯净，适合电商/TK 运营', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500', price: 188, agentPrice: 94 },
      nodes: [
        { host: 'hk1.nodehub.pro', port: 443, protocol: 'trojan', remark: 'HKT 家宽 01' },
        { host: 'hk2.nodehub.pro', port: 8443, protocol: 'vmess', remark: 'HKT 家宽 02' },
      ],
    },
    {
      product: { title: '德国法兰克福 BGP', description: '欧洲核心节点，1Gbps 不限流量，适合外贸建站、数据中转', image: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=500', price: 78, agentPrice: 39 },
      nodes: [
        { host: 'de1.nodehub.pro', port: 443, protocol: 'trojan', remark: '法兰克福 BGP 01' },
        { host: 'de2.nodehub.pro', port: 8443, protocol: 'vmess', remark: '法兰克福 Hetzner' },
      ],
    },
    {
      product: { title: '韩国首尔 SK 宽带', description: 'SK 宽带原生 IP，延迟极低，适合游戏加速、直播推流', image: 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=500', price: 108, agentPrice: 54 },
      nodes: [
        { host: 'kr1.nodehub.pro', port: 443, protocol: 'trojan', remark: '首尔 SK 宽带 01' },
        { host: 'kr2.nodehub.pro', port: 8443, protocol: 'vmess', remark: '首尔 KT 线路' },
      ],
    },
  ];

  for (const spec of nodeSpecs) {
    const product = await prisma.product.create({ data: spec.product });
    for (const node of spec.nodes) {
      await prisma.nodeInstance.create({
        data: {
          productId: product.id,
          host: node.host,
          port: node.port,
          protocol: node.protocol,
          password: genPassword(16),
          remark: node.remark,
          status: 'AVAILABLE',
          trafficLimit: 500,
        },
      });
    }
  }

  console.log('✅ 种子数据重置完成（含节点池）');
  console.log('   管理员:  admin / admin123 / 安全码 admin666');
  console.log('   代理:    agent01 / agent123 / 安全码 agent666');
  console.log('   子代理:  subagent01 / sub123 / 安全码 sub666');
  console.log('   用户:    demo / demo123 / 安全码 demo666');
  console.log('   封禁用户: banned_user / banned123');
  // 站点设置
  console.log('⚙️ 初始化站点设置...');
  const defaultSettings = [
    { key: 'siteIntro', value: '维度光年科技致力于解决电商外贸传媒直播行业真实性问题以及网络账号体现等全流程服务' },
    { key: 'siteName', value: 'NodeHub' },
    { key: 'footerText', value: '© 2026 维度光年科技. All rights reserved.' },
  ];
  for (const s of defaultSettings) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    });
  }
  console.log('  ✅ 站点设置已初始化');

  console.log(`   节点池:  共 ${nodeSpecs.reduce((s, n) => s + n.nodes.length, 0)} 个节点实例`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
