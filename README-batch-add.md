# 批量添加 TODO 任务

这个脚本可以让你从 JSON 文件批量添加任务到数据库。

## 使用步骤

### 1. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填写你的 Supabase 配置：

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

你可以在 Supabase Dashboard → Settings → API 中找到这些信息。

**注意**：`.env` 文件包含敏感信息，不要提交到 Git 仓库。

### 2. 准备 JSON 文件

复制 `todos-template.json` 并修改为你的任务列表：

```bash
cp todos-template.json my-todos.json
```

编辑 `my-todos.json`，按照以下格式添加任务：

```json
{
  "todos": [
    {
      "title": "任务标题",
      "description": "任务描述（可选）",
      "start_time": "2026-04-20T09:00:00+08:00",
      "end_time": "2026-04-20T10:00:00+08:00",
      "category": "学习"
    }
  ]
}
```

**字段说明：**
- `title`：任务标题（必填）
- `description`：任务描述（可选）
- `start_time`：开始时间，ISO 8601 格式（必填）
- `end_time`：结束时间，ISO 8601 格式（必填）
- `category`：分类，必须是以下之一（必填）：
  - `日常`
  - `学习`
  - `工作`
  - `运动`
  - `其他`

**时间格式示例：**
- `2026-04-20T09:00:00+08:00`（北京时间 2026年4月20日 09:00）
- `2026-04-21T14:30:00+08:00`（北京时间 2026年4月21日 14:30）

### 3. 运行脚本

```bash
deno run --allow-net --allow-read --allow-env scripts/batch-add-todos.ts my-todos.json
```

或者使用模板文件测试：

```bash
deno run --allow-net --allow-read --allow-env scripts/batch-add-todos.ts todos-template.json
```

### 4. 查看结果

脚本会输出添加的任务列表，例如：

```
✅ 成功添加 4 个任务！

1. 晨跑
   分类：运动
   时间：2026/4/20 07:00:00 - 2026/4/20 08:00:00
   描述：去公园跑步 5 公里

2. 阅读《深入理解计算机系统》
   分类：学习
   时间：2026/4/20 09:00:00 - 2026/4/20 10:30:00
   描述：读完第三章：程序的机器级表示

...
```

## 常见问题

### Q: 如何快速生成多天的任务？

A: 你可以复制 JSON 中的任务对象，然后修改日期。例如：

```json
{
  "todos": [
    {
      "title": "晨跑",
      "start_time": "2026-04-20T07:00:00+08:00",
      "end_time": "2026-04-20T08:00:00+08:00",
      "category": "运动"
    },
    {
      "title": "晨跑",
      "start_time": "2026-04-21T07:00:00+08:00",
      "end_time": "2026-04-21T08:00:00+08:00",
      "category": "运动"
    },
    {
      "title": "晨跑",
      "start_time": "2026-04-22T07:00:00+08:00",
      "end_time": "2026-04-22T08:00:00+08:00",
      "category": "运动"
    }
  ]
}
```

### Q: 如何验证 JSON 格式是否正确？

A: 脚本会自动验证数据格式，如果有错误会显示详细的错误信息。你也可以使用在线 JSON 验证工具检查语法。

### Q: 可以添加已完成的任务吗？

A: 当前脚本默认添加未完成的任务。如果需要添加已完成的任务，可以修改脚本中的 `is_completed` 字段。

### Q: 时间格式必须是 ISO 8601 吗？

A: 是的，建议使用 ISO 8601 格式（`YYYY-MM-DDTHH:mm:ss+08:00`），这样可以确保时区正确。

## 技巧

### 使用 VS Code 编辑 JSON

在 VS Code 中编辑 JSON 文件时，可以使用以下快捷键：
- `Ctrl/Cmd + D`：选中下一个相同的文本
- `Alt + Shift + 下箭头`：复制当前行到下一行
- `Ctrl/Cmd + /`：注释/取消注释（JSON 不支持注释，但可以临时使用）

### 批量修改日期

你可以使用文本编辑器的查找替换功能批量修改日期：
1. 查找：`2026-04-20`
2. 替换为：`2026-04-21`

这样可以快速将所有任务的日期改为第二天。
