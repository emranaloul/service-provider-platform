/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API host including the `/api/` segment, e.g. `https://host/api/`. */
  readonly VITE_API_BASE_URL?: string;
  /** Optional prefix for every endpoint path. */
  readonly VITE_API_ROOT?: string;
  /** Origin of static files (icons, logos, attachments); API paths are relative to it. */
  readonly VITE_MEDIA_BASE_URL?: string;
  /** localStorage key of the stored session (default `sp-auth`). */
  readonly VITE_AUTH_LOCAL_STORAGE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
