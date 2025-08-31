import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { parse } from 'node:path';
import { VALID_IMAGE_EXTS } from '../../constants';
import { jsonBigInt } from '../../utils';
import { watch, Event } from 'dirspy';

const app = new Hono();
let id = BigInt(0);

app.post('/new-images', (c) => {
  return streamSSE(c, async (stream) => {
    try {
      const { path, ignores = [] } = await c.req.json<{ path: string; ignores: string[] }>();
      let ready = false;
      let abort = false;
      const watcher = await watch(path, {
        ignore(path) {
          const ext = parse(path).ext;
          return ignores.some((ignore) => path.includes(ignore)) || !VALID_IMAGE_EXTS.includes(ext);
        },
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
          watcher.on(Event.READY, () => {
            stream.writeSSE({
              data: '',
              event: 'ready',
              id: id.toString(),
            });
            watcher
              .on(Event.ADD, (payload) => {
                stream.writeSSE({
                  data: JSON.stringify(payload, jsonBigInt),
                  event: 'add',
                  id: id.toString(),
                });
              })
              .on(Event.SELF_ENOENT, () => {
                stream.writeSSE({
                  data: '',
                  event: 'self-enoent',
                  id: id.toString(),
                });
              })
              .on(Event.ERROR, (error) => {
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
