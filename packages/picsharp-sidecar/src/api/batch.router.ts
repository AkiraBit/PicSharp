import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { InMemoryJobQueue } from '../core/queue';
import { bindJobToStream } from '../core/streams';
import { randomUUID } from 'node:crypto';

const ItemSchema = z.object({
  client_id: z.string(),
  codec: z.union([
    z.literal('svg'),
    z.literal('jpeg'),
    z.literal('png'),
    z.literal('webp'),
    z.literal('gif'),
    z.literal('avif'),
    z.literal('tiff'),
    z.literal('tinify'),
  ]),
  input_path: z.string(),
  options: z.record(z.any()).optional().default({}),
  process_options: z.record(z.any()).optional().default({}),
});

const PayloadSchema = z.object({
  stream_id: z.string().optional(),
  items: z.array(ItemSchema).min(1),
});

export function createBatchRouter(queue: InMemoryJobQueue<any, any>) {
  const app = new Hono();

  // 批量提交：只需确认已接收；队列与事件绑定在后端处理
  app.post('/compress', zValidator('json', PayloadSchema), async (c) => {
    const { stream_id, items } = await c.req.json<z.infer<typeof PayloadSchema>>();
    const batchId = randomUUID();

    for (const it of items) {
      try {
        const { jobId } = await queue.add(
          'compress',
          {
            codec: it.codec,
            inputPath: it.input_path,
            options: it.options,
            processOptions: it.process_options,
          },
          {
            idempotencyKey: `${it.input_path}|${it.codec}|${JSON.stringify(it.options)}|${JSON.stringify(
              it.process_options,
            )}`,
          },
        );
        if (stream_id) {
          bindJobToStream(jobId, stream_id, it.client_id);
        }
      } catch {
        // 单项失败可忽略，让 SSE 在失败时回传详细错误；此处不阻断整个请求
      }
    }

    return c.json({ batch_id: batchId, accepted: items.length });
  });

  return app;
}
