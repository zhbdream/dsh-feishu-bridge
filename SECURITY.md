# Security

This plugin can let **Feishu messages drive a local agent** that may edit files and run shell commands.

## Defaults (must keep)

- Empty `allowOpenIds` → **deny all** inbound commands
- Dangerous tools → **deny** via `tools/pre-execute` (Feishu ask-to-approve is M2)
  - Built-in names: `bash`, `pwsh`, `write`, `edit`, `str_replace_editor`, `run_code`
  - Built-in prefixes: `bash`, `shell`, `terminal`, `write`, `edit`, `remove`, `delete`, `str_replace`, `pwsh`
  - Still allowed: `read` and other non-matching tools
- Denied tools: structured log + Feishu notify (throttled)
- Deduplicate Feishu `message_id`; support `/status` and `/cancel`; timeout must reply
- Secrets (`appSecret`) never logged; configure via profile `cordis.patch.yml` (see [docs/local-config.md](./docs/local-config.md))
- `.env` is local-dev optional only — not the sole config source

## Config knobs

| Field / env | Effect |
|-------------|--------|
| `denyToolNames` / `FEISHU_DENY_TOOLS` | Extra exact names (merged with defaults) |
| `denyToolPrefixes` / `FEISHU_DENY_TOOL_PREFIXES` | Extra prefixes (merged with defaults) |
| `allowDangerousTools` / `FEISHU_ALLOW_DANGEROUS_TOOLS=1` | Skip built-in defaults (**unsafe**) |

## Operator checklist

1. Create Feishu app only in a tenant you control
2. Publish with least-privilege IM scopes
3. Fill allowlist before testing with real users
4. Prefer a dedicated workspace directory, not `$HOME`
5. Keep `allowDangerousTools` false unless you intentionally accept remote shell/write risk

Report issues privately if they enable remote code execution bypass.
