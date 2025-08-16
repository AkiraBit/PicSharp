import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { InMemoryJobQueue } from '../../core/queue';
import { bindJobToStream } from '../../core/streams';
import { Queue } from '../../types';
import { CodecType } from '../../constants';

const ItemSchema = z.object({
  codec: z.nativeEnum(CodecType),
  input_path: z.string(),
  options: z.record(z.any()).optional().default({}),
  process_options: z.record(z.any()).optional().default({}),
});

const PayloadSchema = z.object({
  batch_id: z.string(),
  items: z.array(ItemSchema).min(1),
});

export function createCompressRouter(queue: InMemoryJobQueue<any, any>) {
  const app = new Hono();

  app.post('/job/enqueue', zValidator('json', PayloadSchema), async (c) => {
    const { batch_id, items } = await c.req.json<z.infer<typeof PayloadSchema>>();

    for (const it of items) {
      try {
        const { jobId } = await queue.add(
          Queue.JobTaskType.Compress,
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
        if (batch_id) {
          bindJobToStream(jobId, batch_id, it.input_path);
        }
      } catch {
        // 单项失败可忽略，让 SSE 在失败时回传详细错误；此处不阻断整个请求
      }
    }

    return c.json({ batch_id, accepted: items.length });
  });

  return app;
}
