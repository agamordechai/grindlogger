/**
 * The API surface the whole UI imports.
 *
 * `@api-impl` is resolved at build time (see vite.config.ts) to either
 *  - ./local  — on-device SQLite + on-device AI coach (native iOS app), or
 *  - ./remote — the FastAPI backend over HTTP (website).
 * Both modules export the same names with compatible types; ./contract.ts enforces that at type-check time.
 */

export * from '@api-impl';
