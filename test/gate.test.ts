import { describe, expect, it } from "vitest";
import {
  decideToolCall,
  matchDeniedTool,
  resolveDenyPolicy,
  DEFAULT_DENY_NAMES,
} from "../src/safety/gate.js";
import { log } from "../src/log.js";
import { summarizeSessionEvents } from "../src/agent/driver.js";

describe("safety gate", () => {
  const policy = resolveDenyPolicy({});

  it("denies default dangerous tools", () => {
    for (const name of DEFAULT_DENY_NAMES) {
      expect(matchDeniedTool(name, policy).denied).toBe(true);
      expect(decideToolCall({ toolName: name, policy })).toBe("deny");
    }
  });

  it("allows read / search", () => {
    expect(matchDeniedTool("read", policy).denied).toBe(false);
    expect(matchDeniedTool("grep", policy).denied).toBe(false);
    expect(decideToolCall({ toolName: "read", policy })).toBe("allow");
  });

  it("merges extra deny names and prefixes", () => {
    const p = resolveDenyPolicy({
      denyToolNames: ["custom_rm"],
      denyToolPrefixes: ["job"],
    });
    expect(matchDeniedTool("custom_rm", p).denied).toBe(true);
    expect(matchDeniedTool("job_kill", p).denied).toBe(true);
    expect(matchDeniedTool("read", p).denied).toBe(false);
  });

  it("allowDangerousTools skips built-in defaults", () => {
    const p = resolveDenyPolicy({
      allowDangerousTools: true,
      denyToolNames: ["bash"],
    });
    expect(matchDeniedTool("write", p).denied).toBe(false);
    expect(matchDeniedTool("bash", p).denied).toBe(true);
  });
});

describe("summarizeSessionEvents", () => {
  it("extracts assistant text", () => {
    const outcome = summarizeSessionEvents(
      [
        { seq: 0, type: "turn/start", data: { turn: 1 } },
        {
          seq: 1,
          type: "assistant/message",
          data: {
            message: { content: [{ type: "text", text: "你好世界" }] },
          },
        },
        {
          seq: 2,
          type: "turn/end",
          data: { turn: 1, reason: { kind: "completed" } },
        },
      ],
      0,
    );
    expect(outcome.text).toBe("你好世界");
    expect(outcome.error).toBeUndefined();
  });

  it("surfaces turn/end error", () => {
    const outcome = summarizeSessionEvents(
      [
        { seq: 5, type: "turn/start", data: { turn: 1 } },
        {
          seq: 6,
          type: "turn/end",
          data: {
            turn: 1,
            reason: {
              kind: "error",
              error: { code: "UNKNOWN", message: "has no provider/model" },
            },
          },
        },
      ],
      5,
    );
    expect(outcome.text).toBe("");
    expect(outcome.error).toMatch(/has no provider\/model/);
  });
});

describe("log redact", () => {
  it("redacts secret-looking fields without throwing", () => {
    expect(() =>
      log.info("test_redact", {
        appSecret: "super-secret",
        token: "abc",
        note: "sk-abcdefghilmnopqrst",
      }),
    ).not.toThrow();
  });
});
