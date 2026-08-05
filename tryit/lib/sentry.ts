/**
 * Sentry stub — completely disabled to prevent launch crashes.
 * All exports are no-ops so existing imports (ErrorBoundary, AuthProvider,
 * index.tsx) keep working without any native Sentry code running.
 *
 * To re-enable safely in a future build, replace this file with a real
 * Sentry.init() called inside useEffect (NOT at module top-level) and
 * re-add the sentry-expo plugin in app.json.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export const Sentry = {
  Native: {
    init: (_opts?: any) => {},
    captureException: (_err: any, _opts?: any) => {},
    captureMessage: (_msg: string, _opts?: any) => {},
    addBreadcrumb: (_crumb: any) => {},
    setUser: (_user: any) => {},
    wrap: <T,>(component: T): T => component,
  },
} as const;

export function initSentry(): void {
  // No-op — Sentry removed to fix launch crash in Build 18.
}
