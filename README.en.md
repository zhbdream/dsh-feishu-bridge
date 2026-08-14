# dsh-feishu-bridge

Drive a **local** [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Agent from **Feishu / Lark** chat — no public URL required (long connection).

This is an independent community `dsh-plugin`. It is **not** affiliated with DeepSeek or Feishu/Lark. Remote messages can drive a local Agent; you own the risk. See [SECURITY.md](./SECURITY.md).

Repos: [Gitee](https://gitee.com/zhbdream/dsh-feishu-bridge) · [GitHub](https://github.com/zhbdream/-dsh-feishu-bridge)

Full setup guide (Chinese): **[README.md](./README.md)** · Config: [docs/local-config.md](./docs/local-config.md) · Pin: [COMPAT.md](./COMPAT.md) (`@deepseek-ai/dsh@0.1.0-rc.6`)

## Why this vs shells / Web UI

| | Official Web | Desktop shell | **This plugin** |
|--|--------------|---------------|-----------------|
| Entry | Browser on PC | Window on PC | **Feishu mobile/desktop** |
| Local Agent | Yes | Yes | **Yes** |
| Extra UI | Official | High | **None** |

## Quick path

1. Feishu custom app: long connection + `im.message.receive_v1` + IM scopes in `docs/feishu-scopes.md`
2. `npm install && npm run build`
3. `npx @deepseek-ai/dsh@0.1.0-rc.6 plugin --profile feishu-dev add .`
4. Configure via profile `cordis.patch.yml` (preferred) or env vars from `.env.example`
5. `npx @deepseek-ai/dsh@0.1.0-rc.6 --profile feishu-dev` and DM the bot

MVP: p2p text only; empty allowlist denies all; dangerous tools (`bash` / `write` / …) denied by default. Commands: `/status`, `/cancel`.

## License

MIT
