/** Structured logs without secrets. */

const SECRET_KEYS = /^(appsecret|secret|token|password|authorization|apikey|api_key|credential)$/i;
const SECRET_VALUE = /(?:sk-|cli_)[a-zA-Z0-9_\-]{8,}/g;

export type LogFields = Record<string, unknown>;

function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(SECRET_VALUE, "[redacted]");
  }
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEYS.test(k) ? "[redacted]" : redactValue(v);
    }
    return out;
  }
  return value;
}

function write(
  level: "info" | "warn" | "error",
  event: string,
  fields?: LogFields,
): void {
  const payload = {
    scope: "dsh-feishu-bridge",
    event,
    ...(fields ? (redactValue(fields) as LogFields) : {}),
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const log = {
  info: (event: string, fields?: LogFields) => write("info", event, fields),
  warn: (event: string, fields?: LogFields) => write("warn", event, fields),
  error: (event: string, fields?: LogFields) => write("error", event, fields),
};
