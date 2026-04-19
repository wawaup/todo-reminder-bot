# 飞书机器人优化说明

本次优化了飞书机器人的三个核心功能，提升用户体验和系统可靠性。

## 优化内容

### 1. 优化完成任务的回复卡片

**位置**：`supabase/functions/bot-webhook/index.ts`

**改进**：
- ✅ 完成任务后发送友好的绿色卡片，包含：
  - 标题："🎉 恭喜完成任务！"
  - 任务标题、时间、分类
  - 如果有感受，显示感受内容
  - 使用绿色模板（template: "green"）

- ✅ 接下来的任务列表优化：
  - 只显示接下来的 3 个未完成任务
  - 按时间排序
  - 标题改为"📋 接下来的任务"
  - 显示任务在今日列表中的序号

**效果对比**：

之前：
```
✅ 已标记「写周报」完成！
💭 感受：感觉很棒
```

现在：
```
┌─────────────────────────────┐
│ 🎉 恭喜完成任务！           │
├─────────────────────────────┤
│ 写周报                      │
│ 💼 工作 | 09:00 - 10:00     │
│ ─────────────────────────   │
│ 💭 感受： 感觉很棒          │
└─────────────────────────────┘
```

### 2. 提醒卡片添加快捷操作提示

**位置**：
- `supabase/functions/check-reminders/index.ts`
- `supabase/functions/daily-reminder/index.ts`

**改进**：
- ✅ 为每个任务计算在今日任务列表中的序号
- ✅ 在提醒卡片底部添加快捷操作提示
- ✅ 提示用户如何快速完成任务

**示例**：
```
┌─────────────────────────────┐
│ ⏰ 即将开始：团队会议       │
├─────────────────────────────┤
│ 💼 工作 | 14:00 - 15:00     │
│ ─────────────────────────   │
│ 💡 快捷操作：               │
│ 回复 `完成 3` 标记完成，    │
│ 或 `完成 3 你的感受` 记录感受│
└─────────────────────────────┘
```

**说明**：
- 由于飞书 API 限制，暂时使用文本提示代替交互按钮
- 用户可以直接回复"完成 x"或"完成 x 感受"
- 序号与今日任务列表保持一致，避免混淆

### 3. 自动定时执行 check-reminders

**问题**：check-reminders 不会自动运行

**解决方案**：提供三种定时任务配置方案

#### 方案 1：Supabase pg_cron（推荐）

**文件**：`supabase/migrations/002_setup_cron_job.sql`

**优点**：
- ✅ 原生集成，无需外部服务
- ✅ 可靠性高，延迟低（< 1 秒）
- ✅ 可以查看执行历史
- ✅ 配置简单

**使用方法**：
```sql
-- 在 Supabase SQL Editor 中执行
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'check-reminders-job',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

#### 方案 2：GitHub Actions

**文件**：`.github/workflows/check-reminders.yml`

**优点**：
- ✅ 免费
- ✅ 与代码仓库集成
- ✅ 可以手动触发

**缺点**：
- ⚠️ 可能有 5-10 分钟延迟
- ⚠️ 不适合需要精确时间的场景

**使用方法**：
1. 在 GitHub 仓库设置中添加 Secrets：
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
2. 启用 GitHub Actions

#### 方案 3：外部 Cron 服务

使用 cron-job.org、EasyCron 等服务。

**优点**：
- ✅ 简单易用
- ✅ 可视化配置
- ✅ 延迟低

**缺点**：
- ⚠️ 需要注册外部服务
- ⚠️ 免费版可能有限制

## 测试

使用提供的测试脚本验证配置：

```bash
# 设置环境变量
export SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
export SUPABASE_ANON_KEY=YOUR_ANON_KEY

# 运行测试
./test-cron.sh
```

测试脚本会：
1. 测试 check-reminders 函数
2. 测试 daily-reminder 函数
3. 显示测试结果

## 部署步骤

1. **部署 Edge Functions**：
   ```bash
   cd supabase
   supabase functions deploy bot-webhook
   supabase functions deploy check-reminders
   supabase functions deploy daily-reminder
   ```

2. **配置定时任务**（选择一种方案）：
   - 方案 1：在 Supabase SQL Editor 执行 `002_setup_cron_job.sql`
   - 方案 2：启用 GitHub Actions
   - 方案 3：配置外部 Cron 服务

3. **测试**：
   ```bash
   ./test-cron.sh
   ```

## 文件清单

### 修改的文件
- `supabase/functions/bot-webhook/index.ts` - 优化完成任务回复
- `supabase/functions/check-reminders/index.ts` - 添加快捷操作提示
- `supabase/functions/daily-reminder/index.ts` - 添加快捷操作提示
- `DEPLOYMENT.md` - 更新部署文档

### 新增的文件
- `supabase/migrations/002_setup_cron_job.sql` - pg_cron 配置
- `.github/workflows/check-reminders.yml` - GitHub Actions 配置
- `test-cron.sh` - 测试脚本
- `OPTIMIZATION.md` - 本文档

## 技术细节

### 任务序号计算

为了保证序号一致性，所有函数都使用相同的逻辑：

```typescript
// 获取今日所有任务
const { data: allTodayTodos } = await supabase
  .from("todos")
  .select("*")
  .gte("start_time", start.toISOString())
  .lt("start_time", end.toISOString())
  .order("start_time", { ascending: true });

// 计算序号
const taskIndex = allTodayTodos.findIndex(t => t.id === todo.id) + 1;
```

### 飞书卡片格式

使用飞书的 Interactive Card 格式：

```typescript
{
  config: { wide_screen_mode: true },
  header: {
    title: { tag: "plain_text", content: "标题" },
    template: "green" // 颜色：green, blue, red, orange
  },
  elements: [
    {
      tag: "div",
      text: { tag: "lark_md", content: "**Markdown 内容**" }
    },
    { tag: "hr" }, // 分隔线
  ]
}
```

### 定时任务原理

**pg_cron**：
- 使用 PostgreSQL 的 pg_cron 扩展
- 通过 `net.http_post` 调用 Edge Function
- 每分钟执行一次，检查 5-10 分钟内的任务

**GitHub Actions**：
- 使用 cron 表达式定义执行时间
- 通过 curl 调用 Edge Function
- 可能有延迟，不适合精确时间要求

## 注意事项

1. **时区处理**：所有时间计算都使用北京时间（UTC+8）
2. **避免重复提醒**：使用 `reminder_sent` 字段防止重复
3. **序号一致性**：所有函数使用相同的排序逻辑
4. **错误处理**：定时任务失败不会影响其他功能

## 后续优化建议

1. **交互按钮**：如果飞书 API 支持，可以添加真正的交互按钮
2. **提醒时间自定义**：允许用户自定义提醒时间窗口
3. **任务分组**：按分类或优先级分组显示任务
4. **统计功能**：添加任务完成统计和分析
