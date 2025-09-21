import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: __PICSHARP_SENTRY_DSN__,
  sendDefaultPii: true,
  integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  tracesSampleRate: 0.1,
  tracePropagationTargets: ['localhost'],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 0.1, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.,
  beforeSend(event, hint) {
    const error = hint.originalException;
    if (
      error instanceof Error &&
      (error.message.includes('window[') || error.message.includes('validateDOMNesting'))
    ) {
      return null;
    }
    return event;
  },
  enableLogs: true,
});
