import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { parse } from 'node:path';
import { VALID_IMAGE_EXTS } from '../../constants';
import { watch, EventType } from '../../lib/dir-watcher';
import { jsonBigInt } from '../../utils';

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
    try {
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
        console.log(`Watch <${path}> aborted`);
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
              id: id.toString(),
            });
            watcher
              .on(EventType.ADD, (payload) => {
                stream.writeSSE({
                  data: JSON.stringify(payload, jsonBigInt),
                  event: 'add',
                  id: id.toString(),
                });
              })
              .on(EventType.SELF_ENOENT, () => {
                stream.writeSSE({
                  data: '',
                  event: 'self-enoent',
                  id: id.toString(),
                });
              })
              .on(EventType.ERROR, (error) => {
                stream.writeSSE({
                  data: error.toString(),
                  event: 'fault',
                  id: id.toString(),
                });
              });
          });
        }
        await stream.sleep(1000 * 10);
        await stream.writeSSE({
          data: 'ping',
          event: 'ping',
          id: id.toString(),
        });
      }
    } catch (error: any) {
      await stream.writeSSE({
        data: error.toString(),
        event: 'abort',
        id: id.toString(),
      });
      stream.close();
    }
  });
});

export default app;
