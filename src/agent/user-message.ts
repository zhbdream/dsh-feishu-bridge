/** Build a user message compatible with dsh Agent.followup without importing @deepseek-ai/dsh-llm. */
export function createUserMessage(input: {
  content: Array<{ type: string; text: string }>;
  source: { kind: string };
}): Readonly<{
  id: string;
  role: "user";
  content: Array<{ type: string; text: string }>;
  source: { kind: string };
}> {
  const message = {
    id: crypto.randomUUID(),
    role: "user" as const,
    content: structuredClone(input.content),
    source: structuredClone(input.source),
  };
  return deepFreeze(message);
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    Object.freeze(value);
    for (const v of Object.values(value as object)) {
      deepFreeze(v);
    }
  }
  return value;
}
