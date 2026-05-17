import * as Sentry from "@sentry/react";

import { env } from "../config/env";

let initialized = false;

export function initSentry() {
  if (initialized) return;
  if (!env.sentryDsn) return;

  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.sentryEnvironment,
    tracesSampleRate: env.sentryEnvironment === "production" ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  });

  initialized = true;
}

export { Sentry };
