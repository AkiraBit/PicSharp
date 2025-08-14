import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { parse } from 'node:path';
import { VALID_IMAGE_EXTS, SaveMode } from '../../constants';
import { jsonBigInt } from '../../utils';
import { watch, Event } from 'dirspy';
import { InMemoryJobQueue } from '../../core/queue';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import readdirp from 'readdirp';

export function createWatchRouter(queue: InMemoryJobQueue<any, any>) {
  const app = new Hono();

  // v2 等效于旧的 /watch/new-images
  app.get('/new-images', (c) => {
    return streamSSE(c, async (stream) => {
      try {
        const { path } = c.req.query();
        let ready = false;
        let abort = false;
        const ignores = [
          '.pnpm',
          '.git',
          '.DS_Store',
          '.idea',
          '.vscode',
          '.gitignore',
          'node_modules',
          'target',
          'maven',
          'gradle',
          'build',
          'out',
          'bin',
          'obj',
          'lib',
        ];
        const watcher = await watch(path, {
          ignore(p) {
            const ext = parse(p).ext;
            return ignores.some((ig) => p.includes(ig)) || !VALID_IMAGE_EXTS.includes(ext);
          },
          fileFilter: (entry) => {
            if (ignores.some((ig) => entry.fullPath.includes(ig))) return false;
            return VALID_IMAGE_EXTS.includes(parse(entry.path).ext);
          },
          directoryFilter: (entry) => {
            return !ignores.includes(entry.basename);
          },
        });
        stream.onAbort(() => {
          watcher.close();
          stream.close();
          abort = true;
        });
        while (true) {
          if (abort) break;
          if (!ready) {
            ready = true;
            watcher.on(Event.READY, () => {
              stream.writeSSE({ data: '', event: 'ready' });
              watcher
                .on(Event.ADD, (payload) => {
                  stream.writeSSE({ data: JSON.stringify(payload, jsonBigInt), event: 'add' });
                })
                .on(Event.SELF_ENOENT, () => {
                  stream.writeSSE({ data: '', event: 'self-enoent' });
                })
                .on(Event.ERROR, (error) => {
                  stream.writeSSE({ data: String(error), event: 'fault' });
                });
            });
          }
          await stream.sleep(1000 * 10);
          await stream.writeSSE({ data: 'ping', event: 'ping' });
        }
      } catch (error: any) {
        await stream.writeSSE({ data: String(error), event: 'abort' });
        stream.close();
      }
    });
  });

  // 递归扫描目录并批量入队
  const EnqueueSchema = z.object({
    path: z.string(),
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
    options: z.record(z.any()).optional().default({}),
    process_options: z.record(z.any()).optional().default({}),
    recursive: z.boolean().optional().default(true),
    max_files: z.number().min(1).max(100000).optional().default(1000),
  });

  app.post('/enqueue', zValidator('json', EnqueueSchema), async (c) => {
    const { path, codec, options, process_options, recursive, max_files } =
      await c.req.json<z.infer<typeof EnqueueSchema>>();

    const jobIds: string[] = [];
    let scanned = 0;

    for await (const entry of readdirp(path, {
      fileFilter: [
        '*.png',
        '*.jpg',
        '*.jpeg',
        '*.webp',
        '*.avif',
        '*.svg',
        '*.gif',
        '*.tiff',
        '*.tif',
      ],
      directoryFilter: ['!*node_modules', '!*build', '!*dist'],
      depth: recursive ? undefined : 0,
    })) {
      const ext = parse(entry.fullPath).ext.toLowerCase();
      if (!VALID_IMAGE_EXTS.includes(ext)) continue;
      scanned++;
      const { jobId } = await queue.add(
        'compress',
        {
          codec,
          inputPath: entry.fullPath,
          options,
          processOptions: process_options,
        },
        {
          idempotencyKey: `${entry.fullPath}|${codec}|${JSON.stringify(options)}|${JSON.stringify(process_options)}`,
          priority: 0,
        },
      );
      jobIds.push(jobId);
      if (jobIds.length >= max_files) break;
    }

    return c.json({ scanned, enqueued: jobIds.length, job_ids: jobIds });
  });

  return app;
}
