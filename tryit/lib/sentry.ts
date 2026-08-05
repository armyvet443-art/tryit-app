import * as Sentry from "sentry-expo";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

// Placeholder DSN so Sentry is always wired in release builds, even before the
// user creates a real Sentry project. Events sent here are safely dropped by Sentry.
const PLACEHOLDER_DSN =
  "https://00000000000000000000000000000000@o000000.ingest.sentry.io/0000000";

export function initSentry(): void {
  const activeDsn = dsn || PLACEHOLDER_DSN;
  if (!activeDsn) {
    console.log("[sentry] DSN not configured, skipping initialization");
    return;
  }

  Sentry.init({
    dsn: activeDsn,
    enableInExpoDevelopment: false,
    debug: __DEV__,
    // Capture native crashes as well as JS errors
    enableNative: true,
    // Sample rate for performance monitoring (disabled by default to keep volume low)
    tracesSampleRate: 0.0,
    // Attach user context only when explicitly set
    initialScope: {
      tags: {
        app: "tryit",
        platform: "react-native",
      },
    },
  });
}

export { Sentry };
