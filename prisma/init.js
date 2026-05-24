// 部署自动初始化脚本 — 幂等，确保管理员/admin + 种子产品始终存在
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

function genPassword(len = 16) {
  return crypto.randomBytes(len).toString('hex').slice(0, len);
}

const hash = (pw) => bcrypt.hashSync(pw, 10);

async function ensureAdmin() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const hashed = hash('admin');
  const hashedCode = hash('admin666');

  if (!admin) {
    await prisma.user.create({
      data: {
        username: 'admin', password: hashed, securityCode: hashedCode,
        role: 'ADMIN', status: 'ACTIVE', balance: 0, commissionBalance: 0, inviteCode: 'ADMIN001',
      },
    });
    console.log('  ✓ 管理员已创建: admin / admin');
  } else if (admin.username !== 'admin' || admin.password !== hashed) {
    await prisma.user.update({ where: { id: admin.id }, data: { username: 'admin', password: hashed } });
    console.log('  ✓ 管理员已更新: admin / admin');
  } else {
    console.log('  ✓ 管理员已就绪: admin / admin');
  }
}

async function ensureProducts() {
  const existing = await prisma.product.count();
  if (existing >= 6) { console.log('  ✓ 产品已就绪'); return; }

  console.log('  🔄 补充种子产品...');
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

  let nodeCount = 0;
  for (const spec of nodeSpecs) {
    let product = await prisma.product.findFirst({ where: { title: spec.product.title } });
    if (!product) {
      product = await prisma.product.create({ data: spec.product });
    }
    for (const node of spec.nodes) {
      const existingNode = await prisma.nodeInstance.findFirst({ where: { host: node.host, port: node.port, productId: product.id } });
      if (!existingNode) {
        await prisma.nodeInstance.create({
          data: { productId: product.id, host: node.host, port: node.port, protocol: node.protocol, password: genPassword(16), remark: node.remark, status: 'AVAILABLE', trafficLimit: 500 },
        });
        nodeCount++;
      }
    }
  }
  console.log(`  ✓ 产品: ${nodeSpecs.length} 个 / 新增节点: ${nodeCount} 个`);
}

async function main() {
  console.log('🔄 检查数据库状态...');
  await ensureAdmin();
  await ensureProducts();
  console.log('✅ 初始化完成');
}

main()
  .catch(e => { console.error('❌ 失败:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
