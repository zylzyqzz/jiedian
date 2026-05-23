# 节点管理平台 · NodeHub Platform

全栈代理分销管理系统，基于 Next.js 14 + TypeScript + Prisma + SQLite + Tailwind CSS 构建。

## 功能概览

### 用户系统
- 注册 / 登录
- 三种角色：普通用户（USER）、代理（AGENT）、管理员（ADMIN）
- 余额 + 佣金余额双钱包
- 邀请码上下级绑定

### 产品管理
- 产品 CRUD（管理员）
- 售价 + 代理价双价格体系
- 上架 / 下架控制

### 代理分销
- 代理专属控制台
- 查看下级代理列表与佣金记录
- 为下级设置自定义产品代理价
- 分销返佣自动结算

### 订单系统
- 产品下单 → 支付确认
- 订单状态：待支付 → 已支付 → 已完成
- 交易流水完整记录

### 支付配置
- 多平台支付配置（商户号 / API Key / 密钥 / 回调地址）
- 开关控制

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 14 (App Router) |
| 语言 | TypeScript |
| 样式 | Tailwind CSS |
| 数据库 | Prisma ORM + SQLite |
| 部署 | Vercel / 任意 Node.js 服务器 |

## 项目结构

```
src/
├── app/
│   ├── page.tsx              # 主入口（登录/首页/代理/管理统一路由）
│   ├── layout.tsx            # 根布局
│   ├── globals.css           # 全局样式
│   ├── admin/page.tsx        # 管理后台（产品 CRUD）
│   ├── agent/page.tsx        # 代理控制台
│   └── api/
│       ├── users/route.ts    # 用户注册/登录
│       ├── products/route.ts # 产品列表/CRUD
│       ├── orders/route.ts   # 下单/支付
│       ├── agent/route.ts    # 代理数据
│       ├── payment/route.ts  # 支付配置
│       └── me/route.ts       # 用户信息
├── lib/                      # 工具库
prisma/
├── schema.prisma             # 数据模型
└── seed.js                   # 种子数据
```

## 数据模型

```
User ──┬── Order ──── Product
       ├── TransactionHistory
       └── AgentPriceConfig
PaymentConfig
```

- **User**: 用户、角色、余额、佣金、邀请码
- **Product**: 商品、售价、代理价
- **Order**: 订单、状态、支付方式
- **AgentPriceConfig**: 代理自定义价格
- **TransactionHistory**: 交易流水
- **PaymentConfig**: 支付平台配置

## 快速开始

```bash
# 安装依赖
npm install

# 初始化数据库
npx prisma db push
npx prisma generate

# 启动开发服务器
npm run dev
# → http://localhost:3000
```

## 常用命令

```bash
npm run dev          # 开发模式
npm run build        # 生产构建
npm run start        # 启动生产服务
npm run db:push      # 同步数据库结构
npm run db:generate  # 生成 Prisma Client
npm run db:studio    # 数据库管理界面
```

## 许可

MIT
