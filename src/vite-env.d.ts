/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WS_URL?: string;
  readonly VITE_WS_TOKEN?: string;
  readonly VITE_WS_RECONNECT_BASE_MS?: string;
  readonly VITE_WS_RECONNECT_MAX_MS?: string;
  readonly VITE_WS_HEARTBEAT_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
