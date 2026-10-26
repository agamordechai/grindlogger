/**
 * Build target. The same code base ships twice:
 *  - `native` (default): the local-first iOS app (on-device SQLite, on-device AI coach, no login).
 *  - `web`: the multi-user website, which talks to the FastAPI backend and requires sign-in.
 *
 * Set with `VITE_TARGET=web`. Vite replaces the env lookup with a literal at build time, so branches on
 * IS_WEB are dead-code eliminated and the other target's code never reaches the bundle.
 */
export const IS_WEB = import.meta.env.VITE_TARGET === 'web';
