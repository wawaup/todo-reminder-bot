

# 🌸 小管家 Todo

一个温暖的每日安排预览系统，支持多视图展示（单日/周/月），可与飞书群机器人实时互动，完成任务后记录感受。

## 功能特性

### Web 端

- **多视图切换**：日视图、周视图、月视图
- **新建日程**：支持标题、描述、精确到分钟的时间段、四种分类
- **完成记录**：点击完成按钮，弹出感受选择（😊很棒/😐一般/😔沮丧/💪能量/🎉超额）
- **任务管理**：编辑、删除日程

### 飞书机器人

- **每日定时提醒**：每天早上 8:30 自动推送日程到飞书群
- **交互式回复**：
  - `完成 1` - 标记第1项完成
  - `完成 1 感觉很棒` - 标记完成并记录感受
  - `取消 1` - 取消完成标记

## 技术栈

- **前端**：React 18 + Vite + TypeScript + TailwindCSS
- **后端**：Supabase (PostgreSQL + Edge Functions)
- **机器人**：飞书开放平台
- **自动化**：GitHub Actions

## 快速开始

### 1. 配置 Supabase

1. 在 [Supabase](https://supabase.com) 创建项目
2. 运行数据库迁移脚本 `backend/supabase/migrations/001_init_schema.sql`
3. 部署 Edge Functions：
   ```bash
   supabase functions deploy bot-webhook
   supabase functions deploy daily-reminder
   ```

### 2. 配置飞书机器人

1. 在[飞书开放平台](https://open.feishu.cn)创建企业自建应用
2. 开启机器人能力
3. 配置消息事件订阅
4. 获取 App ID 和 App Secret

### 3. 配置 GitHub Secrets

在 GitHub 仓库 Settings > Secrets 中添加：

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ACCESS_TOKEN`
- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `FEISHU_CHAT_ID` (飞书群 ID)

### 4. 部署前端

```bash
cd todo-reminder-frontend
pnpm install
pnpm build
# 部署 dist 目录到任意静态托管服务
```

## 项目结构

```
todo-reminder-bot/
├── SPEC.md                          # 项目规格说明书
├── frontend/                        # React 前端
│   ├── src/
│   │   ├── components/             # UI 组件
│   │   ├── hooks/                  # 自定义 Hooks
│   │   ├── lib/                    # 工具库
│   │   ├── types/                  # TypeScript 类型
│   │   └── App.tsx                 # 主应用
│   └── .env                        # 环境变量
└── backend/                         # 后端配置
    ├── supabase/
    │   ├── migrations/             # 数据库迁移
    │   └── functions/              # Edge Functions
    └── .github/
        └── workflows/              # GitHub Actions
```

## 设计风格

采用**温暖清新**的视觉风格：

- 主色：珊瑚橙 `#FF8A65`
- 辅色：薄荷绿 `#81C784`
- 强调色：阳光金黄 `#FFD54F`
- 背景色：奶白色 `#FFF8F0`

## 许可证

MIT License
