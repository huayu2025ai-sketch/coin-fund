# Crypto2028 Portfolio

私人加密货币投资组合追踪器，支持 BTC、ETH 和 SOL 的持仓管理与盈亏分析。

## 功能特性

- **持仓追踪**：实时追踪 BTC、ETH、SOL 三种资产的持仓情况
- **交易记录**：支持两种交易类型
  - **DCA（定投）**：记录每月现金购买的数量、价格和手续费
  - **兑换（Conversion）**：记录山寨币兑换为主要资产的详细信息
- **盈亏分析**：自动计算成本基准、平均成本、盈亏和收益率
- **数据可视化**：使用图表展示资产配置和资金来源分布
- **价格监控**：通过 CoinGecko API 获取实时价格，每 30 秒自动刷新
- **用户认证**：基于 Supabase Auth 的邮箱密码登录，数据通过 RLS 隔离

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 14.2.24（App Router） |
| 语言 | TypeScript 5.7.3（严格模式） |
| UI | React 18.3.1、Tailwind CSS 3.4.17、Lucide React |
| 数据获取 | TanStack React Query 5.66.9 |
| 图表 | Recharts 2.15.1 |
| 后端 | Supabase（PostgreSQL + Auth + RLS） |
| 价格 API | CoinGecko（通过 Next.js API 路由代理） |

## 项目结构

```
├── src/
│   ├── app/
│   │   ├── layout.tsx          # 根布局，包含 React Query Providers
│   │   ├── page.tsx            # 落地页（重定向到 /dashboard）
│   │   ├── providers.tsx       # QueryClientProvider 配置
│   │   ├── globals.css         # Tailwind 指令 + 自定义 CSS 组件类
│   │   ├── login/page.tsx      # 邮箱/密码登录页面
│   │   ├── dashboard/page.tsx  # 投资组合仪表盘（图表、表格、录入表单）
│   │   └── api/prices/route.ts # CoinGecko 代理，带兜底价格
│   ├── components/
│   │   ├── auth-gate.tsx       # 认证守卫：未登录用户重定向到 /login
│   │   ├── configuration-notice.tsx  # Supabase 环境变量缺失时显示
│   │   └── transaction-entry-form.tsx # DCA/兑换录入表单，含校验
│   └── lib/
│       ├── supabase-client.ts  # 带类型的 Supabase 单例客户端
│       └── portfolio.ts        # 类型定义、计算逻辑（盈亏、收益率、平均成本）、格式化工具
├── supabase/
│   └── schema.sql              # 完整数据库结构：枚举、表、视图、触发器、RLS 策略
├── next.config.mjs             # Next.js 配置
├── tailwind.config.ts          # Tailwind 内容路径配置
├── postcss.config.mjs          # Tailwind + autoprefixer
├── tsconfig.json               # 严格模式 TypeScript，路径别名 `@/*` -> `./src/*`
├── run.sh                      # 进程管理脚本（启动/停止/重启/状态）
└── .env / .env.example         # Supabase 环境变量
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env.local`：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. 初始化数据库

在 Supabase SQL 编辑器中执行 `supabase/schema.sql`。

### 4. 启动开发服务器

```bash
npm run dev
```

或者使用进程管理脚本：

```bash
./run.sh start    # 后台启动开发服务器
./run.sh status   # 查看运行状态
./run.sh stop     # 停止服务器
./run.sh restart  # 重启服务器
```

### 5. 构建生产版本

```bash
npm run build
npm run start
```

## 数据库结构

### 枚举类型

- `crypto_asset`：BTC、ETH、SOL
- `transaction_kind`：DCA（定投）、CONVERSION（兑换）

### 数据表

**`portfolio_transactions`** —— 仅追加的交易记录表

| 字段 | 说明 |
|------|------|
| `id` | 主键 |
| `user_id` | 关联 `auth.users`，RLS 隔离 |
| `kind` | 交易类型：DCA 或 CONVERSION |
| `asset` | 目标资产：BTC / ETH / SOL |
| `quantity` | 获得数量 |
| `price_usd` | 成交价格（USD） |
| `fee_usd` | 手续费（USD） |
| `executed_at` | 成交时间 |
| `source_token` | 兑换来源代币（仅 CONVERSION） |
| `source_quantity` | 兑换来源数量（仅 CONVERSION） |
| `created_at` / `updated_at` | 自动时间戳 |

- RLS 已启用：用户只能操作自己的数据
- 检查约束：根据 `kind` 自动校验字段完整性
- 索引：`(user_id, asset, executed_at desc)`

### 数据库视图

**`portfolio_positions`** —— 按用户和资产汇总持仓

- `cost_basis_usd`：成本基准 = Σ(数量 × 价格 + 手续费)
- `avg_cost_usd`：平均成本 = 成本基准 / 数量
- `original_cash_usd`：原始现金投入（DCA 部分）
- `conversion_value_usd`：兑换价值（CONVERSION 部分）

## 认证与安全

- **认证方式**：Supabase Auth，邮箱密码登录（`signInWithPassword`）
- **路由保护**：`<AuthGate>` 组件在挂载时检查 `supabase.auth.getSession()`，未登录用户重定向到 `/login`
- **数据隔离**：所有数据库访问通过 RLS 策略绑定到 `auth.uid()`
- **注意**：API 路由和页面 RSC 中没有服务端认证检查，认证完全在客户端处理

## API 路由

### `GET /api/prices`

代理 CoinGecko 获取 BTC/ETH/SOL 的 USD 价格：

```json
{
  "BTC": 95000,
  "ETH": 3500,
  "SOL": 180,
  "stale": false,
  "updatedAt": "2026-05-12T14:00:00.000Z"
}
```

CoinGecko 请求失败时返回零价格并标记 `stale: true`。仪表盘每 30 秒轮询一次。

## 状态管理与数据获取

- **React Query** 处理所有服务端状态：
  - `["transactions"]` —— 从 `portfolio_transactions` 获取交易记录
  - `["prices"]` —— 从 `/api/prices` 获取价格，每 30 秒自动刷新
- **数据变更**：`transaction-entry-form.tsx` 使用 `useMutation`，成功时通过 `invalidateQueries({ queryKey: ["transactions"] })` 刷新列表
- **默认缓存时间**：30 秒

## 代码规范

- **严格 TypeScript**：`strict: true`、`noEmit: true`、`isolatedModules: true`
- **路径别名**：使用 `@/components/...` 和 `@/lib/...`，避免相对路径
- **客户端组件**：交互式页面和组件使用 `"use client"`，依赖浏览器 API（Supabase 认证、React Query Hooks）
- **Tailwind 模式**：优先使用 `globals.css` 中定义的自定义组件类：
  - `.ui-card`、`.ui-glass`、`.ui-chip`、`.ui-input`、`.ui-btn-primary`、`.ui-interactive`
- **格式化工具**：使用 `@/lib/portfolio` 中的 `usd`、`compactUsd`、`percent` 格式化器
- **语言**：所有面向用户的文本使用中文；代码（变量、类型、文件名）保持英文

## 部署

这是一个标准的 Next.js 应用，可部署到 Vercel 或任何支持 Next.js 的平台。

**部署前准备**：
1. 初始化 Supabase 项目并执行 `supabase/schema.sql`
2. 在构建时设置环境变量（`NEXT_PUBLIC_*` 变量会在构建时内联）
3. 项目无 CI/CD 配置，需手动部署

## 常见操作

### 添加新资产

1. 在 `supabase/schema.sql` 中更新 `crypto_asset` 枚举
2. 在 `src/lib/portfolio.ts` 中更新 `Asset` 类型和 `assets` 数组
3. 在 `src/app/api/prices/route.ts` 中更新 CoinGecko URL 和映射
4. 更新仪表盘 UI 标签

### 添加新图表或指标

- 使用 `recharts`（已在仪表盘中导入）
- 在 `dashboard/page.tsx` 中使用 `useMemo` 派生数据
- 使用 `usd` 或 `compactUsd` 格式化货币，`percent` 格式化百分比

### 修改认证行为

- 修改 `src/components/auth-gate.tsx` 调整路由守卫逻辑
- 修改 `src/app/login/page.tsx` 调整登录 UI 和登录方式
- 注意：Supabase 的 RLS 是真正的安全边界

## 许可证

私有项目，仅限内部使用。
