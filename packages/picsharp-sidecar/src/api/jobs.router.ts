import { Hono } from 'hono';
import { InMemoryJobQueue } from '../core/queue';

export function createJobsRouter(queue: InMemoryJobQueue<any, any>) {
  const app = new Hono();

  app.get('/:jobId', (c) => {
    const jobId = c.req.param('jobId');
    const state = queue.getState(jobId);
    if (!state) {
      return c.json({ status: 404, message: 'job not found' }, 404);
    }
    return c.json(state);
  });

  app.post('/:jobId/cancel', (c) => {
    const jobId = c.req.param('jobId');
    const ok = queue.cancel(jobId);
    if (!ok) {
      return c.json({ status: 409, message: 'job not cancellable or not found' }, 409);
    }
    return c.json({ status: 'cancelled', job_id: jobId });
  });

  return app;
}
