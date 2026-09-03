// The API client now lives in `src/lib/api.ts` (adds a normalized ApiError
// type and a global 401 handler). This module is kept as a thin re-export so
// existing `@/config/api` imports keep working unchanged; new code should
// import from `@/lib/api` directly.
export * from '@/lib/api';
