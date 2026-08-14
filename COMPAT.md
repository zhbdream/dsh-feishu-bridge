# Compatibility

| Plugin | `@deepseek-ai/dsh` | Notes |
|--------|-------------------|--------|
| `0.0.1` | `0.1.0-rc.6` | W1–W3 verified on Windows: `plugin add` + Feishu WS p2p text + Agent reply (`agentDefaultModel`) + `tools/pre-execute` deny gate + WS autoReconnect |

Pinned via `peerDependencies`: `@deepseek-ai/dsh@0.1.0-rc.6`.

## Known breaking / sticky points

| Area | Behavior | Mitigation |
|------|----------|------------|
| Dynamic `import('@deepseek-ai/dsh-*')` from linked plugin | Resolves against plugin `node_modules`, often missing | Avoid; use local helpers + `ctx.agents` / `ctx.agentDefaultModel` |
| `agents.create` without `agentOptions` | Turn ends `has no provider/model` | Always pass selection from `agentDefaultModel.currentSelection()` |
| Empty `allowOpenIds: []` in patch | Must not block env fallback | Resolver treats empty array as unset |
| Feishu event handler > ~3s | Platform retries | Ack fast; fire-and-forget Agent work |
| Dangerous tools over Feishu | Remote RCE risk | Default deny via `tools/pre-execute` (see SECURITY.md) |

Update this table on every release. Smoke-test at least one pinned RC before tagging.
