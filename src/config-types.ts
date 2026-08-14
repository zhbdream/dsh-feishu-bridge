export interface FeishuBridgeConfig {
  appId?: string;
  appSecret?: string;
  workspace?: string;
  allowOpenIds?: string[] | string;
  taskTimeoutMs?: number;
  /** Extra exact tool names to deny (merged with defaults). */
  denyToolNames?: string[] | string;
  /** Extra tool-name prefixes to deny (merged with defaults). */
  denyToolPrefixes?: string[] | string;
  /**
   * Skip built-in dangerous defaults. Still applies denyToolNames/Prefixes.
   * Unsafe — local experiments only.
   */
  allowDangerousTools?: boolean;
}
