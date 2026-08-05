import * as Sentry from "sentry-expo";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry(): void {
  if (!dsn) {
    console.log("[sentry] DSN not configured, skipping initialization");
    return;
  }

  Sentry.init({
    dsn,
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
