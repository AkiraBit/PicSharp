import Sentry from '@sentry/node';
import { machineId } from 'node-machine-id';

Sentry.init({
  dsn: process.env.PICSHARP_SIDECAR_SENTRY_DSN,
  enableLogs: true,
  tracesSampleRate: 1.0,
  profileSessionSampleRate: 1.0,
  profileLifecycle: 'trace',
  sendDefaultPii: true,
});

machineId(true).then((id) => {
  Sentry.setUser({
    id: process.env.PICSHARP_SIDECAR_USER_ID || id,
  });
});
