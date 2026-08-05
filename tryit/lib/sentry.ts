/**
 * Sentry integration — safely initialized inside useEffect (NOT at module
 * top-level) to prevent launch crashes. If Sentry fails to init, the app
 * continues normally with no-op stubs.
 *
 * Re-enabled in Build 22 with:
 * - init deferred to useEffect (runs after app mounts)
 * - enableNative: false (no native module auto-init)
 * - enableAutoSessionTracking: false
 * - try/catch around everything
 */

import * as SentryLib from "@sentry/react-native";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  try {
    if (!dsn) {
      console.log("[sentry] DSN not configured, skipping initialization");
      return;
    }
    SentryLib.init({
      dsn,
      debug: false,
      enableNative: false,
      enableAutoSessionTracking: false,
      tracesSampleRate: 0.0,
      initialScope: {
        tags: {
          app: "tryit",
          platform: "react-native",
        },
      },
    });
    initialized = true;
  } catch (e) {
    console.log("[sentry] init failed", e);
  }
}

export const Sentry = {
  Native: {
    init: (opts?: Parameters<typeof SentryLib.init>[0]) => {
      try { SentryLib.init(opts ?? {}); } catch { /* ignore */ }
    },
    captureException: (err: unknown, opts?: Record<string, unknown>) => {
      try { SentryLib.captureException(err as any, opts as any); } catch { /* ignore */ }
    },
    captureMessage: (msg: string, opts?: Record<string, unknown>) => {
      try { SentryLib.captureMessage(msg, opts as any); } catch { /* ignore */ }
    },
    addBreadcrumb: (crumb: Record<string, unknown>) => {
      try { SentryLib.addBreadcrumb(crumb as any); } catch { /* ignore */ }
    },
    setUser: (user: { id: string } | null) => {
      try { SentryLib.setUser(user as any); } catch { /* ignore */ }
    },
    wrap: <T,>(component: T): T => component,
  },
} as const;
