/** User-facing Chinese copy (Feishu replies + operator hints). */

export const MSG = {
  processing: "收到，本机 Agent 处理中…",
  busy: "上一条任务还在跑，请稍候或发送 /cancel。",
  textOnly: "MVP 仅支持纯文本，请发送文字或 /status /cancel。",
  noCancel: "没有可取消的任务。",
  cancelRequested: "已请求取消。",
  timeout:
    "仍在运行（已超时提醒）。可发 /status 查看，或 /cancel 取消。",
  emptyModelReply: "（模型未返回可见文本，请到本机终端的 dsh 日志查看）",
  noSession: "当前无会话。直接发任务即可开始。",
  agentUnavailable:
    "Agent 服务未就绪。请用包含 @deepseek-ai/dsh-base 的 profile 启动（推荐 feishu-dev），并确认已安装兼容版本的 @deepseek-ai/dsh（见 COMPAT.md）。",
  missingCredentials:
    "未配置飞书凭证。请在 profile 的 cordis.patch.yml 填写 appId/appSecret，或设置环境变量 FEISHU_APP_ID / FEISHU_APP_SECRET 后重启。",
  emptyAllowlist:
    "allowOpenIds 为空：将拒绝全部入站。收到消息时机器人会回帖 open_id，复制进白名单后重启。",
} as const;

export function statusBusy(agentStatus: string): string {
  return `忙碌中（agent=${agentStatus}）。可发 /cancel。`;
}

export function statusIdle(agentStatus: string): string {
  return `空闲（agent=${agentStatus}）。`;
}

export function unauthorized(openId: string): string {
  return `未授权。你的 open_id 是：\n${openId}\n请加入 allowOpenIds（profile config 或 FEISHU_ALLOW_OPEN_IDS）后重启再试。`;
}

export function toolDeniedNotify(toolName: string, reason: string): string {
  return `安全闸已拒绝工具「${toolName}」。\n${reason}`;
}

export function createAgentFailed(detail: string): string {
  return `无法创建 Agent：${humanizeError(detail)}`;
}

export function turnFailed(detail: string, partialText?: string): string {
  const tip = humanizeError(detail);
  if (partialText?.trim()) return `${partialText.trim()}\n\n（回合异常：${tip}）`;
  return `处理失败：${tip}`;
}

/** Map known harness errors to actionable Chinese tips. */
export function humanizeError(raw: string): string {
  const s = raw.trim();
  if (!s) return "未知错误";

  if (/has no provider\/model/i.test(s)) {
    return `${s}\n→ 请在 ~/.dsh/settings.yaml 配置 agent-default-model（provider/model），或设置 DSH_PROVIDER + DSH_MODEL 后重启。`;
  }
  if (/api.?key|unauthorized|401|invalid.?key/i.test(s)) {
    return `${s}\n→ 请检查 ~/.dsh/.credentials.yaml 或对应 provider 的 API Key（勿把密钥发给他人或写入 git）。`;
  }
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|fetch failed|network/i.test(s)) {
    return `${s}\n→ 网络连不上模型服务，请检查代理 / 内网地址 / 防火墙。`;
  }
  if (/compat|peer|dsh.*version|unsupported/i.test(s)) {
    return `${s}\n→ 请对照 COMPAT.md 安装匹配的 @deepseek-ai/dsh 版本（当前钉 0.1.0-rc.6）。`;
  }
  if (/allowlist|allowOpenIds|未授权/i.test(s)) {
    return `${s}\n→ 把飞书回帖里的 open_id 加入白名单后重启。`;
  }
  return s;
}
