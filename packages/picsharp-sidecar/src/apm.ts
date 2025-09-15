import Sentry from '@sentry/node';
import { machineId } from 'node-machine-id';

Sentry.init({
  environment: process.env.NODE_ENV || 'development',
  dsn: process.env.PICSHARP_SIDECAR_SENTRY_DSN,
  enableLogs: true,
  tracesSampleRate: 0.05,
  profileSessionSampleRate: 0.01,
  profileLifecycle: 'trace',
  sendDefaultPii: true,
});

machineId(true).then((id) => {
  Sentry.setUser({
    id: process.env.PICSHARP_SIDECAR_USER_ID || id,
  });
});
