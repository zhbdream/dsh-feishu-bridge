# 本地联调配置

**不要把 App Secret / open_id 提交到 git。**

配置优先级：

1. **推荐**：profile 的 `cordis.patch.yml` / 插件 `config`
2. **本地可选**：环境变量（对照仓库根目录 [.env.example](../.env.example)）
3. 二者都缺 → 启动警告；无凭证则不连飞书

## 方式 A：profile config（推荐）

编辑 `%USERPROFILE%\.dsh\profiles\feishu-dev\cordis.patch.yml`，用 Cordis patch 覆盖 `dsh-feishu-bridge` 的 config，例如字段：

| 字段 | 说明 |
|------|------|
| `appId` / `appSecret` | 飞书应用凭证 |
| `allowOpenIds` | 白名单；**空 = 拒绝全部** |
| `workspace` | Agent `cwd` |
| `taskTimeoutMs` | 超时提醒（默认 600000） |
| `denyToolNames` / `denyToolPrefixes` | 追加黑名单 |
| `allowDangerousTools` | `true` 跳过内置高危默认（不安全） |

改完后重启：`npx @deepseek-ai/dsh --profile feishu-dev`。

## 方式 B：环境变量（最快联调）

```powershell
$env:FEISHU_APP_ID="cli_xxx"
$env:FEISHU_APP_SECRET="你的Secret"
$env:FEISHU_ALLOW_OPEN_IDS="ou_xxx"
$env:DSH_WORKSPACE="D:\path\to\workspace"   # 可选
# $env:FEISHU_DENY_TOOLS="job_kill"
# $env:FEISHU_DENY_TOOL_PREFIXES="job"

cd path\to\dsh-feishu-bridge
npm run build
npx --yes @deepseek-ai/dsh --profile feishu-dev
```

看到 JSON 日志：`plugin_loaded`、`ws_ready`；发消息后有 `agent_create`。

## 飞书侧

权限与事件：[feishu-scopes.md](./feishu-scopes.md)

## 命令与提示

| 命令 / 场景 | 行为 |
|-------------|------|
| `/status` | 空闲 / 忙碌 |
| `/cancel` | 取消当前任务 |
| 未在白名单 | 回帖 `open_id` |
| 高危工具 | 回帖拒绝 + `tool_denied` |
| 缺模型 / Key | 中文错误含排查提示 |

验安全闸：发「用 bash 执行 echo hi」。

## 注意

- 事件处理须约 3 秒内返回；先回「处理中」，Agent 后台跑完再回帖。
- 同一应用不要多个长连接客户端抢消息。
- WS 默认重连；日志 `ws_reconnecting` / `ws_reconnected`。
- 兼容版本见 [COMPAT.md](../COMPAT.md)。
