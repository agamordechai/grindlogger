/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'web' builds the multi-user website; anything else is the local-first native app. */
  readonly VITE_TARGET?: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_AI_COACH_BASE_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_GITHUB_CLIENT_ID: string;
  readonly VITE_DISCORD_CLIENT_ID: string;
  readonly VITE_REDDIT_CLIENT_ID: string;
  /** Native app: the sync server (defaults to https://grindlogger.com/api). */
  readonly VITE_SYNC_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
