# 旅游分账 · 明信片账本

多人旅游实时记账分账工具，复古旅行明信片主题，mobile-first，PWA 可安装到主屏幕。

## 核心功能

### 记账分账
- 多人实时同步记账（Supabase Realtime）
- 6 位加入码邀请同伴，无密码无注册
- 三种分摊方式：平均 / 自定义金额 / 付款人独担
- 自动计算每人净额、最少转账方案、消费矩阵

### 账单 OCR 识别
- 上传账单截图（记账 App / Excel / 微信群收款）
- GLM-4V-Plus 多模态 AI 自动识别金额、目的、日期、付款人
- 每项可单独选择付款人，支持批量导入

### 账本管理
- 编辑账本名称和成员（改名/添加/移除）
- 消费记录支持编辑/复制/删除
- 账本可一键删除（级联清理）

### 旅游辅助
- 行程规划：按天安排景点/餐饮/交通
- 行李清单：分类勾选，实时同步
- 共享信息板：航班/酒店/联系人/紧急信息
- 投票功能：多人投票决策

### 体验增强
- PWA 可安装到主屏幕（适配微信/QQ/UC/小米/华为/OPPO/vivo 等浏览器）
- 深色模式（手动切换 + 跟随系统）
- 数据导出（图片 + 文本）
- 消费记录快速复制
- 离线访问壳层

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
- Next.js 14.2.x (App Router) + TypeScript
- Tailwind CSS v3（复古明信片主题）
- Supabase（PostgreSQL + Realtime）
- GLM-4V-Plus（账单 OCR 识别）
- Cloudflare Pages（静态导出 + Functions）
- PWA（manifest + service worker）

## 部署到 Cloudflare Pages
```bash
npm run build     # 输出到 out/
npx wrangler pages deploy out --project-name=travel-split
```

部署时在 Cloudflare Pages 后台设置环境变量：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

如需账单 OCR 功能，还需配置：
- `GLM_API_KEY`（在 Cloudflare Pages → Settings → Environment variables）

## 文档
- [产品需求文档 PRD](./.trae/documents/PRD.md)
- [技术架构文档](./.trae/documents/TechArch.md)
- [文件架构详解](./.trae/documents/TechArch.md#8-文件架构详解)
