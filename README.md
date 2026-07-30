# 旅游分账 · 明信片账本

多人旅游实时记账分账工具，复古旅行明信片主题，mobile-first。

## 功能
- 多人实时同步记账（Supabase Realtime）
- 6 位加入码邀请同伴，无密码无注册
- 自定义数字键盘快速输入金额
- 付款人/分摊人员可视化选择
- 自动计算每人净额、最少转账方案、消费矩阵

## 快速开始

### 1. 初始化 Supabase 后端
1. 访问 https://supabase.com 注册并新建项目
2. 进入项目 → **SQL Editor** → New query
3. 粘贴 [`supabase_schema.sql`](./supabase_schema.sql) 全部内容 → **Run**
4. 进入 **Settings → API**，复制：
   - Project URL（形如 `https://xxxx.supabase.co`）
   - anon public key

### 2. 配置环境变量
在项目根目录创建 `.env.local`：

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
```

### 3. 安装与运行
```bash
npm install
npm run dev
# 打开 http://localhost:3000
```

### 4. 使用流程
1. 一人创建账本（输入名称 + 至少 2 位成员姓名）
2. 系统生成 6 位加入码，分享给同伴
3. 同伴打开网址 → 加入 → 输入加入码
4. 任何人都可以添加消费（输入金额/选付款人/选分摊人/选目的）
5. 实时同步到所有成员手机
6. 旅游结束 → 进入结算页 → 查看转账方案

## 技术栈
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS v3
- Supabase（PostgreSQL + Realtime + Auth）
- 部署：Cloudflare Pages（静态导出 `output: 'export'`）

## 部署到 Cloudflare Pages
```bash
npm run build     # 输出到 out/
npx wrangler pages deploy out --project-name=travel-split
```
部署时在 Cloudflare Pages 后台设置环境变量：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 文档
- [PRD](./.trae/documents/PRD.md)
- [技术架构](./.trae/documents/TechArch.md)
