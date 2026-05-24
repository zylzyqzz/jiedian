# 🚀 NodeHub Platform — 节点聚合分销管理系统

全栈代理分销管理系统，支持多级代理、节点自动分配、佣金自动结算。

基于 **Next.js 14 + TypeScript + Prisma + SQLite + Tailwind CSS** 构建。

---

## ✨ 功能特性

### 用户系统
- 🔐 注册 / 登录 / 修改密码
- 👥 四种角色：普通用户（USER）、子代理（SUB_AGENT）、代理（AGENT）、管理员（ADMIN）
- 💰 余额 + 佣金余额双钱包体系
- 🔗 邀请码绑定上下级关系（ref 参数注册）
- 🚫 封禁 / 解封管理

### 产品管理
- 📦 产品 CRUD（管理员）
- 💵 售价 + 代理价双价格体系
- 🔄 上架 / 下架控制
- 🎨 Unsplash 图片展示

### 代理分销
- 🏢 代理专属控制台（数据看板）
- 👥 查看下级代理列表与佣金记录
- 💲 为下级设置自定义产品拿货价（75 折红线保护）
- 💸 分销返佣自动结算（15% 消费返佣 + 25% 招商返佣）
- 🏧 佣金提现申请

### 订单系统
- 🛒 产品下单 → 支付确认 → 节点自动分配
- 📋 订单状态流：待支付 → 已支付 → 已完成
- 🔌 第三方支付集成（易支付 MD5 签名 + 异步回调验签）
- 💳 代理余额直扣（跳过第三方支付）
- 📊 完整交易流水记录

### 节点管理
- 🖥️ 节点实例 CRUD（管理员）
- ⚡ 批量生成节点（主机名前缀 + 端口递增）
- 📡 购买后自动分配可用节点（FIFO）
- ♻️ 节点回收、维护模式切换
- 📈 流量限额与用量追踪
- 📋 用户「我的服务」面板（连接信息展示 + 一键复制）

### 管理后台
- 📊 数据看板：总用户/代理/订单/营收/节点统计
- 🏆 Top 代理排行
- 👤 用户管理：搜索/筛选/封禁/解封/手动充值（余额/佣金）
- 💳 支付配置：多平台管理、启用/停用切换

### 安全
- 🔑 JWT 认证（7 天有效期）
- 🔒 bcrypt 密码哈希
- ✅ Zod 请求参数校验
- 🛡️ 角色守卫中间件
- 🔐 修改密码需 JWT 认证（不可伪造 userId）

---

## 🛠️ 技术栈

| 层次 | 技术 |
|------|------|
| 框架 | Next.js 14 (App Router) |
| 语言 | TypeScript (strict mode) |
| 样式 | Tailwind CSS |
| ORM | Prisma + SQLite |
| 认证 | jose (JWT HS256) |
| 密码 | bcryptjs |
| 校验 | Zod |
| 支付 | 易支付 MD5 签名 |
| 部署 | Vercel / Node.js 服务器 |

---

## 📁 项目结构

```
jiedian/
├── prisma/
│   ├── schema.prisma      # 数据模型定义
│   └── seed.js            # 种子数据脚本
├── src/
│   ├── app/
│   │   ├── page.tsx       # 主入口（视图路由）
│   │   ├── layout.tsx     # 根布局
│   │   ├── globals.css    # 全局样式
│   │   ├── pay-success/   # 支付成功页
│   │   └── api/           # API 路由
│   │       ├── users/     # 注册/登录/改密/充值
│   │       ├── products/  # 商品 CRUD + 代理设价
│   │       ├── orders/    # 下单 + 支付
│   │       ├── agent/     # 代理控制台 + 提现
│   │       ├── me/        # 个人中心
│   │       ├── services/  # 已购节点服务
│   │       ├── payment/   # 支付配置管理
│   │       ├── pay-callback/ # 支付异步回调
│   │       ├── dashboard/ # 管理看板
│   │       ├── nodes/     # 节点管理
│   │       └── admin/     # 管理员用户管理
│   ├── components/
│   │   ├── NavBar.tsx     # 导航栏
│   │   ├── AuthView.tsx   # 登录/注册
│   │   ├── HomeView.tsx   # 首页（商品+订单）
│   │   ├── ProfileView.tsx # 个人中心
│   │   ├── AdminView.tsx  # 管理后台（编排）
│   │   ├── AgentView.tsx  # 代理控制台
│   │   ├── ServicesView.tsx # 我的服务
│   │   └── admin/         # 管理子组件
│   │       ├── AdminDashboard.tsx
│   │       ├── AdminProducts.tsx
│   │       ├── AdminPayment.tsx
│   │       ├── AdminUsers.tsx
│   │       └── AdminNodes.tsx
│   ├── lib/
│   │   ├── auth.ts        # JWT 签发/验证/守卫
│   │   ├── prisma.ts      # Prisma 单例
│   │   └── validators.ts  # Zod 校验 schema
│   └── types/
│       └── index.ts       # 统一类型定义
├── .env.example           # 环境变量模板
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 🚀 快速开始

### 前置要求

- Node.js 18+
- npm 9+

### 安装与运行

```bash
# 1. 克隆仓库
git clone https://github.com/zylzyqzz/jiedian.git
cd jiedian

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，将 JWT_SECRET 替换为随机字符串

# 4. 初始化数据库
npx prisma db push
npx prisma generate

# 5. (可选) 导入种子数据
node prisma/seed.js

# 6. 启动开发服务器
npm run dev
# → http://localhost:3000
```

### 种子数据默认账号

| 角色 | 用户名 | 密码 | 安全码 |
|------|--------|------|--------|
| 管理员 | admin | admin123 | admin666 |
| 代理 | agent01 | agent123 | agent666 |
| 子代理 | subagent01 | sub123 | sub666 |
| 用户 | demo | demo123 | demo666 |

---

## 🔧 常用命令

```bash
npm run dev          # 开发模式 (localhost:3000)
npm run build        # 生产构建
npm run start        # 启动生产服务
npm run db:push      # 同步数据库结构
npm run db:generate  # 生成 Prisma Client
npm run db:studio    # 数据库管理 GUI (localhost:5555)
```

---

## 📊 数据模型

```
User ──┬── Order ──── Product
       ├── TransactionHistory
       ├── AgentPriceConfig
       └── NodeInstance
PaymentConfig
```

- **User**: 用户、角色、状态、余额、佣金、邀请码、上级
- **Product**: 商品、售价、代理价、上下架
- **Order**: 订单号、金额、状态、支付方式
- **AgentPriceConfig**: 代理为下级设置的拿货价
- **TransactionHistory**: 交易流水（充值/消费/返佣/提现）
- **NodeInstance**: 节点实例（地址/端口/协议/密码/状态/流量）
- **PaymentConfig**: 支付平台配置

---

## 🔐 安全注意事项

1. **生产环境务必修改 `JWT_SECRET`**：在 `.env` 中设置为强随机字符串
2. **不要将 `.env` 提交到 Git**：已在 `.gitignore` 中排除
3. **支付回调验签**：POST 异步回调会验证 MD5 签名
4. **角色守卫**：所有管理接口均通过 JWT + 角色中间件保护
5. **密码使用 bcrypt 哈希**（cost=10），不存储明文

---

## 📄 许可协议

MIT License — 详见 [LICENSE](./LICENSE)
