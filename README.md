# Crypto2028 Portfolio

私人加密货币投资组合追踪器，支持 BTC、ETH、SOL、ATOM 的定投买入与卖出记录、持仓管理与盈亏分析。

## 功能特性

- **持仓追踪**：实时追踪 BTC、ETH、SOL、ATOM 四种资产；持仓明细表展示「数量 > 0 或有过交易」的资产（零持仓但有交易历史仍会显示），图表仅展示仍有持仓的资产
- **交易录入**：单一 DCA 表单（资产、数量、价格、手续费、现金投入、成交日期、备注），默认折叠
  - **买入**：数量与现金投入填正数
  - **卖出**：数量与现金投入填负数，两者必须同号，前端校验后写入
  - 数据库层仍保留 `CONVERSION`（兑换）枚举与约束，但界面未提供兑换录入入口
- **盈亏分析**：自动计算成本基准、平均成本、市值、盈亏和收益率；数量接近 0（绝对值 < 1e-8）时平均成本按 0 处理
- **KPI 指标**：市值、成本基准、总盈亏、ROI、原始现金投入
- **交易记录**：可折叠区块内以表格展示，支持按币种与起止日期过滤（可一键重置）、每页 5/10/20 条分页、逐条删除（删除前二次确认）
- **数据可视化**：资产分布柱状图（成本基准 vs 市值），自定义中文 Tooltip，适配深色模式
- **价格监控**：通过 CoinGecko API 获取实时价格，仪表盘每 30 秒自动刷新，顶部价格条带「数据正常 / 价格过期」状态
- **用户认证**：基于 Supabase Auth 的邮箱密码登录，数据通过 RLS 隔离
- **切换用户**：仪表盘一键全局登出并清空 React Query 缓存，跳回登录页
- **主题切换**：next-themes 支持浅色 / 深色 / 跟随系统，仪表盘右上角按钮切换
- **错误边界**：`error.tsx` 与 `global-error.tsx` 提供中文错误页与重试入口

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 14（App Router） |
| 语言 | TypeScript 5.7+（严格模式） |
| UI | React 18.3、Tailwind CSS 3.4（`darkMode: "class"`）、lucide-react |
| 数据获取 | TanStack React Query 5 |
| 图表 | Recharts 2.15 |
| 主题 | next-themes 0.4 |
| 后端 | Supabase 2（PostgreSQL + Auth + RLS） |
| 价格 API | CoinGecko（通过 Next.js API 路由代理） |

## 项目结构

```
├── src/
│   ├── app/
│   │   ├── layout.tsx               # 根布局（zh-CN），挂载 Providers
│   │   ├── providers.tsx            # next-themes ThemeProvider + QueryClientProvider
│   │   ├── page.tsx                 # 落地页（重定向到 /dashboard）
│   │   ├── error.tsx                # 路由级错误边界（中文错误页 + 重试）
│   │   ├── global-error.tsx         # 全局错误边界（含 error.message 展示）
│   │   ├── globals.css              # Tailwind 指令 + 亮/暗 CSS 变量 + 自定义组件类
│   │   ├── login/page.tsx           # 邮箱/密码登录页面
│   │   ├── dashboard/page.tsx       # 投资组合仪表盘（KPI、图表、持仓表、录入表单、交易记录）
│   │   └── api/prices/route.ts      # CoinGecko 代理，带兜底价格
│   ├── components/
│   │   ├── auth-gate.tsx            # 认证守卫：未登录用户重定向到 /login
│   │   ├── configuration-notice.tsx # Supabase 环境变量缺失时显示配置引导
│   │   ├── transaction-entry-form.tsx # DCA 买入/卖出录入表单，含前端校验
│   │   ├── theme-toggle.tsx         # 亮/暗主题切换按钮
│   │   └── switch-user-button.tsx   # 全局登出并清空缓存后回到 /login
│   └── lib/
│       ├── supabase-client.ts       # 带类型的 Supabase 单例客户端 + 配置检测
│       └── portfolio.ts             # 类型定义、持仓/汇总计算、格式化工具
├── supabase/
│   └── schema.sql                   # 完整数据库结构：枚举、表、约束、触发器、RLS 策略、视图
├── next.config.mjs                  # Next.js 配置（当前为空配置）
├── tailwind.config.ts               # 内容路径 + darkMode: "class"
├── postcss.config.mjs               # Tailwind + autoprefixer
├── tsconfig.json                    # 严格模式 TypeScript，路径别名 `@/*` -> `./src/*`
├── run.sh                           # 开发服务器进程管理脚本
└── .env / .env.example              # Supabase 环境变量
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local` 并填写：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

两个变量任一缺失时，`/login` 和 `/dashboard` 会显示「尚未配置 Supabase」的引导页（`configuration-notice.tsx`），而不是报错。

### 3. 初始化数据库

在 Supabase SQL 编辑器中执行 `supabase/schema.sql`。

### 4. 启动开发服务器

```bash
npm run dev
```

或者使用进程管理脚本（后台运行 `npm run dev`，PID 写入 `.run.pid`，日志写入 `.run.log`）：

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

其他脚本：`npm run lint`（ESLint，`eslint-config-next`）。

## 配置说明

| 环境变量 | 用途 |
|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目地址，`src/lib/supabase-client.ts` 读取 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名 key，`src/lib/supabase-client.ts` 读取 |

- `hasSupabaseConfig()` 用于判断配置是否齐全，决定展示引导页还是正常流程
- `getSupabaseClient()` 创建带数据库类型定义的单例客户端，缺失配置时抛错
- `NEXT_PUBLIC_*` 变量在构建时内联，修改后需重新构建
- `.gitignore` 已忽略 `.env` 与 `.env*.local`

## 数据库结构

### 枚举类型

- `crypto_asset`：BTC、ETH、SOL、ATOM
- `transaction_kind`：DCA（定投）、CONVERSION（兑换）

> **卖出**：通过 `quantity < 0` 且 `cash_amount_usd < 0` 的 DCA 交易实现，不占用独立枚举值。
> **兑换**：枚举与校验约束仍在，但当前 UI 只写入 DCA 记录。

### 数据表

**`portfolio_transactions`** —— 交易记录表

| 字段 | 说明 |
|------|------|
| `id` | 主键，`gen_random_uuid()` |
| `user_id` | 关联 `auth.users(id)`，级联删除，RLS 隔离 |
| `kind` | 交易类型：DCA 或 CONVERSION |
| `asset` | 目标资产：BTC / ETH / SOL / ATOM |
| `quantity` | 数量 `numeric(28,12)`，卖出时为负数 |
| `price_usd` | 成交价格（USD） |
| `fee_usd` | 手续费（USD），默认 0 |
| `cash_amount_usd` | 现金金额（DCA），卖出时为负数 |
| `conversion_value_usd` | 兑换价值（CONVERSION），默认 0 |
| `source_altcoin_symbol` | 兑换来源代币符号（仅 CONVERSION） |
| `source_altcoin_quantity` | 兑换来源数量（仅 CONVERSION） |
| `source_altcoin_cost_usd` | 兑换来源成本（仅 CONVERSION） |
| `note` | 交易备注 |
| `executed_at` | 成交时间，默认 `now()` |
| `created_at` / `updated_at` | 自动时间戳，`updated_at` 由触发器维护 |

- 检查约束：`quantity <> 0`；`dca_requires_cash` 要求 DCA 记录现金投入非 0、数量与现金投入同号、兑换字段为空；`conversion_requires_source` 要求 CONVERSION 记录必须带来源币信息
- 索引：`(user_id, asset, executed_at desc)`
- RLS 已启用，含 select / insert / update / delete 四条策略，均绑定 `auth.uid() = user_id`（delete 策略支撑界面上的删除功能）

### 数据库视图

**`portfolio_positions`**（`security_invoker = true`）—— 按用户和资产汇总持仓

- `cost_basis_usd`：成本基准 = Σ(数量 × 价格 + 手续费)
- `avg_cost_usd`：平均成本 = 成本基准 / 数量，数量为 0 时取 0
- `original_cash_usd`：原始现金投入（DCA 部分）
- `conversion_value_usd`：兑换价值（CONVERSION 部分）
- `first_entry_at` / `last_entry_at`：首次与最近成交时间

## 认证与安全

- **认证方式**：Supabase Auth，邮箱密码登录（`signInWithPassword`）
- **路由保护**：`<AuthGate>` 在挂载时调用 `supabase.auth.getSession()`，未登录重定向到 `/login`；并通过 `onAuthStateChange` 监听登出事件
- **数据隔离**：所有数据库访问通过 RLS 策略绑定到 `auth.uid()`
- **注意**：API 路由和页面 RSC 中没有服务端认证检查，认证完全在客户端处理，RLS 是真正的安全边界

## API 路由

### `GET /api/prices`

代理 CoinGecko 获取 BTC/ETH/SOL/ATOM 的 USD 价格（`dynamic = "force-dynamic"`，不做缓存）：

```json
{
  "BTC": 95000,
  "ETH": 3500,
  "SOL": 180,
  "ATOM": 4.5,
  "stale": false,
  "updatedAt": "2026-05-12T14:00:00.000Z"
}
```

CoinGecko 请求失败或返回非 2xx 时返回零价格并标记 `stale: true`，仪表盘会显示「价格过期」。仪表盘每 30 秒轮询一次。

## 状态管理与数据获取

- **React Query** 处理所有服务端状态，全局 `staleTime: 30_000`、`refetchOnWindowFocus: false`：
  - `["auth-user"]` —— 当前登录用户 ID
  - `["transactions", currentUserId]` —— 从 `portfolio_transactions` 获取交易记录（按 `executed_at` 倒序），用户 ID 解析完成后才发起请求
  - `["prices"]` —— 从 `/api/prices` 获取价格，`refetchInterval: 30_000`
- **数据变更**：
  - `transaction-entry-form.tsx` 使用 `useMutation` 插入记录，成功后 `invalidateQueries({ queryKey: ["transactions"] })`
  - 仪表盘删除交易后 `invalidateQueries({ queryKey: ["transactions", currentUserId] })`，保证切换账户后数据隔离

## 代码规范

- **严格 TypeScript**：`strict: true`、`noEmit: true`、`isolatedModules: true`
- **路径别名**：使用 `@/components/...` 和 `@/lib/...`，避免相对路径
- **客户端组件**：交互式页面和组件使用 `"use client"`，依赖浏览器 API（Supabase 认证、React Query Hooks）
- **Tailwind 模式**：优先使用 `globals.css` 中基于 CSS 变量定义的自定义组件类：
  - `.ui-title`、`.ui-subtitle`、`.ui-label`、`.ui-card`、`.ui-glass`、`.ui-chip`、`.ui-input`、`.ui-btn-primary`、`.ui-interactive`
- **深色模式**：`darkMode: "class"` + `globals.css` 中的 `.dark` CSS 变量；页面内也有少量 `dark:` 原子类
- **格式化工具**：使用 `@/lib/portfolio` 中的 `usd`、`compactUsd`、`percent` 格式化器
- **语言**：所有面向用户的文本使用中文；代码（变量、类型、文件名）保持英文

## 部署

这是一个标准的 Next.js 应用，可部署到 Vercel 或任何支持 Next.js 的平台（`npm run build && npm run start`）。仓库中没有 Docker、CI/CD 配置。

**部署前准备**：
1. 初始化 Supabase 项目并执行 `supabase/schema.sql`
2. 在构建时设置环境变量（`NEXT_PUBLIC_*` 变量会在构建时内联）
3. 手动部署

`run.sh` 仅用于本地/服务器上托管开发服务器（`npm run dev`），不是生产部署方案。

## 常见操作

### 添加新资产

1. 在 `supabase/schema.sql` 中更新 `crypto_asset` 枚举（`ALTER TYPE ... ADD VALUE`）
2. 在 `src/lib/portfolio.ts` 中更新 `Asset` 类型和 `calculatePositions` 中的资产列表
3. 在 `src/app/api/prices/route.ts` 中更新 CoinGecko URL 的 `ids` 参数与响应映射
4. 更新仪表盘 UI：价格条、过滤下拉框、`AssetBadge` 配色

### 添加新图表或指标

- 使用 `recharts`（已在仪表盘中导入）
- 在 `dashboard/page.tsx` 中使用 `useMemo` 派生数据
- 使用 `usd` 或 `compactUsd` 格式化货币，`percent` 格式化百分比

### 修改认证行为

- 修改 `src/components/auth-gate.tsx` 调整路由守卫逻辑
- 修改 `src/app/login/page.tsx` 调整登录 UI 和登录方式
- 修改 `src/components/switch-user-button.tsx` 调整登出/切换账户行为

### 调整主题

- 默认主题、跟随系统由 `src/app/providers.tsx` 中的 `ThemeProvider` 控制
- 亮/暗配色变量集中在 `src/app/globals.css` 的 `:root` 与 `.dark`

## 许可证

私有项目，仅限内部使用。
