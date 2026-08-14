import { describe, expect, it } from "vitest";
import { parseInboxText, rememberMessageId } from "../src/agent/inbox.js";
import { parseMessageText } from "../src/feishu/types.js";
import { SessionRouter } from "../src/agent/session-router.js";

describe("inbox", () => {
  it("parses slash commands", () => {
    expect(parseInboxText("/status")).toEqual({ kind: "status" });
    expect(parseInboxText("/cancel")).toEqual({ kind: "cancel" });
    expect(parseInboxText("你好")).toEqual({ kind: "prompt", text: "你好" });
  });

  it("dedupes message ids", () => {
    expect(rememberMessageId("m1")).toBe(true);
    expect(rememberMessageId("m1")).toBe(false);
    expect(rememberMessageId("m2")).toBe(true);
  });
  it("parses fullwidth slash commands", () => {
    expect(parseInboxText("／status")).toEqual({ kind: "status" });
    expect(parseInboxText("／cancel")).toEqual({ kind: "cancel" });
  });

  it("trims prompt text", () => {
    expect(parseInboxText("  你好  ")).toEqual({ kind: "prompt", text: "你好" });
  });
});

describe("feishu types", () => {
  it("parses text content json", () => {
    expect(parseMessageText('{"text":"hi"}')).toBe("hi");
    expect(parseMessageText("not-json")).toBeNull();
  });
});

describe("session router", () => {
  it("maps chat+user to session", () => {
    const r = new SessionRouter();
    r.set({ openId: "ou_a", chatId: "oc_b" }, "sess-1");
    expect(r.get({ openId: "ou_a", chatId: "oc_b" })).toBe("sess-1");
  });
});
