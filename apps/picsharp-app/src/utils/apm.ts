import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: __PICSHARP_SENTRY_DSN__,
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
  integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  // Tracing
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ['localhost'],
  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.,
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
  // Enable logs to be sent to Sentry
  enableLogs: true,
});
