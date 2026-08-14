# dsh-feishu-bridge

**在飞书里发一句话，本机 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 开始干活并回帖。**

企业自建应用即可，**不需要**飞书企业认证或付费版（本组织内使用）。长连接收事件，本机也**不需要**公网 IP / 反向隧道。

[English](./README.en.md) · [安全模型](./SECURITY.md) · [兼容版本](./COMPAT.md) · [配置详解](./docs/local-config.md) · [飞书权限](./docs/feishu-scopes.md)

> **免责声明**：本项目为独立社区插件，与 DeepSeek、飞书官方**无隶属或授权关系**；名称仅用于描述兼容目标。远程消息会驱动本机 Agent（可读文件等），变更与安全后果由**操作者自行承担**。

---

## 和其他方案比什么

| | 官方 Web UI | 桌面套壳 | **本插件** |
|--|-------------|---------|------------|
| 入口 | 本机浏览器 | 本机窗口 | **飞书手机 / 桌面** |
| 驱动本机 Agent | 是 | 是（壳） | **是** |
| 额外 UI | 官方维护 | 高 | **无** |
| 典型场景 | 坐在电脑前 | 坐在电脑前 | **路上发一句，本机开干** |

## 它怎么工作

```text
飞书单聊文本
  → 长连接事件 im.message.receive_v1
  → 白名单校验 + message_id 去重
  → 本机 dsh Agent（followup）
  → 回帖「处理中」→ 回合结束再回全文
```

- 配置：`appId` / `appSecret` / `allowOpenIds` / `workspace` …
- 安全：空白名单拒绝全部；`bash` / `write` / `edit` 等高危工具默认 **deny**
- 命令：`/status`、`/cancel`

---

## 约 30 分钟上手

### 0. 前置

| 项 | 要求 |
|----|------|
| Node.js | ≥ 22 |
| dsh | `npx @deepseek-ai/dsh@0.1.0-rc.6`（钉版本见 [COMPAT.md](./COMPAT.md)） |
| 模型 | 已配置 `~/.dsh/settings.yaml` 的 `agent-default-model`，以及对应 API Key（`~/.dsh/.credentials.yaml`） |
| 飞书 | 能登录[开发者后台](https://open.feishu.cn/app) 的企业/团队 |

可先确认：

```bash
node -v
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 --version
```

### 1. 飞书自建应用（约 10–15 分钟）

1. 打开[飞书开发者后台](https://open.feishu.cn/app) → 创建 **企业自建应用**
2. 开通权限（完整说明：[docs/feishu-scopes.md](./docs/feishu-scopes.md)）：
   - `im:message`
   - `im:message.p2p_msg:readonly`
   - `im:message:send_as_bot`
3. **事件与回调** → 订阅方式选 **长连接** → 添加 `im.message.receive_v1`
4. 启用**机器人**能力 → 创建版本并**发布** → 把自己加入可用成员
5. 记下 **App ID** / **App Secret**（Secret 勿提交 git、勿贴进 Issue）

### 2. 获取本插件并安装到 profile

**从源码（当前推荐）：**

码云：[gitee.com/zhbdream/dsh-feishu-bridge](https://gitee.com/zhbdream/dsh-feishu-bridge) · GitHub：[github.com/zhbdream/-dsh-feishu-bridge](https://github.com/zhbdream/-dsh-feishu-bridge)

```bash
# 任选其一
git clone https://gitee.com/zhbdream/dsh-feishu-bridge.git
# 或
git clone https://github.com/zhbdream/-dsh-feishu-bridge.git

cd dsh-feishu-bridge   # GitHub 仓克隆后目录名可能是 -dsh-feishu-bridge
npm install
npm run build
```

创建（或复用）profile，再把插件加进去：

```bash
# 若还没有 feishu-dev profile，可先复制 web 或按 dsh 文档创建
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 plugin --profile feishu-dev add .
```

期望：`dsh --profile feishu-dev --dump-config` 能看到 `# == dsh-feishu-bridge` 一层。

> 以后 npm 发布后可用：`dsh plugin --profile feishu-dev add dsh-feishu-bridge`

### 3. 配置

**推荐（长期）**：编辑用户目录下

- Windows：`%USERPROFILE%\.dsh\profiles\feishu-dev\cordis.patch.yml`
- macOS / Linux：`~/.dsh/profiles/feishu-dev/cordis.patch.yml`

覆盖本插件 `config`（字段表见 [docs/local-config.md](./docs/local-config.md)）。

**本地最快（环境变量）**，模板见 [.env.example](./.env.example)：

PowerShell：

```powershell
$env:FEISHU_APP_ID="cli_xxx"
$env:FEISHU_APP_SECRET="你的Secret"
$env:FEISHU_ALLOW_OPEN_IDS="ou_xxx"   # 第一次可先空，让机器人回帖 open_id
# 可选：$env:DSH_WORKSPACE="D:\path\to\workspace"
```

bash：

```bash
export FEISHU_APP_ID="cli_xxx"
export FEISHU_APP_SECRET="your_secret"
export FEISHU_ALLOW_OPEN_IDS="ou_xxx"
# export DSH_WORKSPACE="$HOME/projects/my-workspace"
```

### 4. 启动与验证

```bash
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 --profile feishu-dev
```

终端期望出现 JSON 日志：`plugin_loaded`、`ws_ready`（或 SDK 的 `ws client ready`）。

在飞书搜索你的机器人，**单聊**发送：

| 你发 | 期望 |
|------|------|
| `你好` | 先「处理中…」，再模型回复 |
| `用 bash 执行 echo hi` | 「安全闸已拒绝…」，终端有 `tool_denied` |
| `/status` | 空闲 / 忙碌 |
| `/cancel` | 取消当前任务 |

若提示未授权：把回帖里的 `open_id` 写入 `allowOpenIds` / `FEISHU_ALLOW_OPEN_IDS` 后**重启**进程。

---

## MVP 边界

- 仅 **单聊 + 纯文本**（群聊 @、富文本、卡片 → 后续）
- 高危工具默认 **deny**（可追加黑名单；**不做**飞书点选批准）
- 同一会话上一条未完成 → 提示忙碌（不排队）
- 进程重启后会话不恢复（新会话）
- 兼容以 [COMPAT.md](./COMPAT.md) 为准；Harness 仍为 Preview，可能破兼容

## 常见问题

| 现象 | 排查 |
|------|------|
| 没有 `ws_ready` / 收不到消息 | 事件是否选**长连接**；是否已**发布**版本；是否只有一个客户端在连（多开会抢消息） |
| 「未授权」+ open_id | 把 open_id 加入白名单后重启 |
| 「has no provider/model」 | 配置 `agent-default-model`，或设 `DSH_PROVIDER` + `DSH_MODEL` |
| 模型 / 401 / Key | 检查 `~/.dsh/.credentials.yaml` 与 provider 环境变量 |
| 一直「处理中」 | 看终端是否有 `agent_turn_error`；试 `/status`、`/cancel` |
| 想临时放开 shell/写文件 | `FEISHU_ALLOW_DANGEROUS_TOOLS=1`（**极不安全**，仅本机实验） |

更多配置项：[docs/local-config.md](./docs/local-config.md)。

## 开发

```bash
npm install
npm run build
npm test
npm run typecheck
```

插件入口：`src/index.ts`（Cordis bundle + `cordis.patch.yml`）。

## License

MIT
