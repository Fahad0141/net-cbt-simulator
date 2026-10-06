/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public GitHub repository of this deployment (see src/config/site.ts). */
  readonly VITE_REPO_URL?: string;
  /** Public address of the website, for links shared from the Android app (see src/config/site.ts). */
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
