/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API host including the `/api/` segment, e.g. `https://host/api/`. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
