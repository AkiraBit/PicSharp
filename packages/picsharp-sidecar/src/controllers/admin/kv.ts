import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { createWorkerIpcClient } from '../../ipc/client';

const client = createWorkerIpcClient();

const SetSchema = z.object({
  key: z.string(),
  value: z.any(),
  ttl_ms: z.number().int().positive().optional(),
});
const DelSchema = z.object({ key: z.string() });

export default function createKvAdminRouter() {
  const app = new Hono();

  app.post('/set', zValidator('json', SetSchema), async (c) => {
    const body = await c.req.json<z.infer<typeof SetSchema>>();
    await client.kvSet(body.key, body.value, body.ttl_ms);
    return c.json({ ok: true });
  });

  app.get('/get', async (c) => {
    const key = c.req.query('key');
    if (!key) return c.json({ error: 'key is required' }, 400);
    const value = await client.kvGet(key);
    return c.json({ key, value });
  });

  app.delete('/del', zValidator('json', DelSchema), async (c) => {
    const body = await c.req.json<z.infer<typeof DelSchema>>();
    await client.kvDel(body.key);
    return c.json({ ok: true });
  });

  return app;
}
