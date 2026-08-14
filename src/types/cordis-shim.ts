/** Local stub so the plugin builds without installing @deepseek-ai/* from npm. */
export type Context = {
  effect: (factory: () => void | (() => void) | Promise<void | (() => void)>) => void;
  on?: (
    event: string,
    listener: (...args: any[]) => any,
    options?: { prepend?: boolean },
  ) => void | (() => void);
  get?: (name: string) => unknown;
  agents?: unknown;
  agentDefaultModel?: {
    currentSelection: () => { provider: string; model: string };
  };
  [key: string]: unknown;
};
