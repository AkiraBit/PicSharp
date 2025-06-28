import { Hono } from 'hono';
import { stream, streamText, streamSSE } from 'hono/streaming';
import { parse } from 'node:path';
import { VALID_IMAGE_EXTS } from '../../constants';
import { watch, EventType } from '../../lib/dir-watcher';

const app = new Hono();
let id = BigInt(0);

const ignores = [
  '.pnpm',
  '.git',
  '.DS_Store',
  '.idea',
  '.vscode',
  '.gitignore',
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

app.get('/new-images', (c) => {
  return streamSSE(c, async (stream) => {
    const { path } = c.req.query();
    let ready = false;
    let abort = false;
    const watcher = await watch(path, {
      fileFilter: (entry) => {
        if (ignores.some((ignore) => entry.fullPath.includes(ignore))) return false;
        return VALID_IMAGE_EXTS.includes(parse(entry.path).ext);
      },
      directoryFilter: (entry) => {
        return !ignores.includes(entry.basename);
      },
    });
    stream.onAbort(() => {
      console.log('abort');
      watcher.close();
      stream.close();
      abort = true;
    });
    while (true) {
      if (abort) break;
      if (!ready) {
        ready = true;
        watcher.on(EventType.READY, () => {
          stream.writeSSE({
            data: '',
            event: 'ready',
            id: String(++id),
          });
          watcher
            .on(EventType.ADD, (payload) => {
              stream.writeSSE({
                data: JSON.stringify(payload),
                event: 'add',
                id: String(++id),
              });
            })
            .on(EventType.SELF_ENOENT, () => {
              stream.writeSSE({
                data: '',
                event: 'self-enoent',
                id: String(++id),
              });
            });
        });
      }
      await stream.sleep(1000 * 10);
      await stream.writeSSE({
        data: 'ping',
        event: 'ping',
        id: String(++id),
      });
    }
  });
});

export default app;
