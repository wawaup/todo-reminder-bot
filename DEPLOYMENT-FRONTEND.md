# 前端部署指南 - GitHub Pages

本文档说明如何将 React + Vite 前端应用部署到 GitHub Pages。

## 前置要求

- GitHub 仓库已创建
- 前端代码已推送到 `main` 分支
- Supabase 后端已部署并获取了 API 凭证

## 部署步骤

### 1. 配置 GitHub Secrets

在 GitHub 仓库中配置环境变量：

1. 进入仓库页面：`https://github.com/wawaup/todo-reminder-bot`
2. 点击 **Settings** > **Secrets and variables** > **Actions**
3. 点击 **New repository secret** 添加以下 secrets：

| Secret 名称 | 值 | 说明 |
|------------|-----|------|
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | Supabase 项目 URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` | Supabase 匿名密钥 |

### 2. 启用 GitHub Pages

1. 进入仓库 **Settings** > **Pages**
2. 在 **Source** 部分，选择 **GitHub Actions**
3. 保存设置

### 3. 触发部署

部署会在以下情况自动触发：

- 推送代码到 `main` 分支且 `frontend/` 目录有变化
- 手动触发工作流

#### 自动部署
```bash
git add .
git commit -m "Update frontend"
git push origin main
```

#### 手动触发部署
1. 进入仓库 **Actions** 标签页
2. 选择 **Deploy Frontend to GitHub Pages** 工作流
3. 点击 **Run workflow** > **Run workflow**

### 4. 查看部署状态

1. 进入仓库 **Actions** 标签页
2. 查看最新的工作流运行状态
3. 点击工作流查看详细日志

部署成功后，可以在工作流日志中看到部署 URL。

## 访问应用

部署成功后，应用将在以下 URL 可访问：

```
https://wawaup.github.io/todo-reminder-bot/
```

URL 格式：`https://<username>.github.io/<repository-name>/`

## 本地开发

### 安装依赖
```bash
cd frontend
pnpm install
```

### 配置环境变量
复制 `.env.example` 为 `.env` 并填入实际值：
```bash
cp .env.example .env
```

### 启动开发服务器
```bash
pnpm dev
```

### 构建生产版本
```bash
pnpm build:prod
```

### 预览生产构建
```bash
pnpm preview
```

## 技术细节

### Vite 配置

`vite.config.ts` 中配置了基础路径：

```typescript
export default defineConfig({
  base: isProd ? '/todo-reminder-bot/' : '/',
  // ...
})
```

- 开发环境：`base: '/'`
- 生产环境：`base: '/todo-reminder-bot/'`

### GitHub Actions 工作流

工作流文件：`.github/workflows/deploy-frontend.yml`

主要步骤：
1. 检出代码
2. 设置 pnpm 和 Node.js
3. 安装依赖
4. 构建应用（使用 `pnpm build:prod`）
5. 上传构建产物
6. 部署到 GitHub Pages

### 环境变量

构建时需要的环境变量：
- `VITE_SUPABASE_URL`：Supabase 项目 URL
- `VITE_SUPABASE_ANON_KEY`：Supabase 匿名密钥
- `BUILD_MODE=prod`：触发生产构建模式

## 故障排查

### 部署失败

1. 检查 GitHub Actions 日志
2. 确认 Secrets 配置正确
3. 确认 GitHub Pages 已启用并设置为 GitHub Actions

### 页面 404

1. 确认 `vite.config.ts` 中的 `base` 路径正确
2. 确认仓库名称与配置一致
3. 等待几分钟让 GitHub Pages 生效

### 资源加载失败

1. 检查浏览器控制台错误
2. 确认资源路径包含正确的 base 路径
3. 检查 Vite 构建输出

### API 连接失败

1. 确认 Supabase URL 和密钥正确
2. 检查 Supabase 项目是否正常运行
3. 检查浏览器控制台网络请求

## 更新部署

修改前端代码后：

```bash
git add frontend/
git commit -m "Update: description of changes"
git push origin main
```

GitHub Actions 会自动检测 `frontend/` 目录的变化并触发部署。

## 回滚

如需回滚到之前的版本：

1. 找到之前成功的 commit
2. 回滚代码：
   ```bash
   git revert <commit-hash>
   git push origin main
   ```
3. 或者手动触发之前成功的工作流

## 自定义域名（可选）

如需使用自定义域名：

1. 在仓库根目录创建 `frontend/public/CNAME` 文件
2. 文件内容为你的域名，如：`todo.example.com`
3. 在域名 DNS 设置中添加 CNAME 记录指向 `wawaup.github.io`
4. 在 GitHub Pages 设置中配置自定义域名

## 安全注意事项

- ✅ Supabase 匿名密钥可以安全地暴露在前端代码中
- ✅ 使用 GitHub Secrets 管理敏感配置
- ⚠️ 不要将 `.env` 文件提交到 Git
- ⚠️ 定期更新依赖以修复安全漏洞

## 性能优化

- 使用 `pnpm build:prod` 构建生产版本
- Vite 自动进行代码分割和压缩
- 静态资源通过 GitHub Pages CDN 分发
- 考虑添加 Service Worker 实现离线支持

## 监控和分析

建议添加：
- Google Analytics 或其他分析工具
- Sentry 或其他错误追踪工具
- 性能监控工具

## 相关文档

- [GitHub Pages 文档](https://docs.github.com/en/pages)
- [Vite 部署指南](https://vitejs.dev/guide/static-deploy.html)
- [Supabase 文档](https://supabase.com/docs)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
