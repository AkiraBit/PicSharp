import { Context } from 'hono';
import { Hook } from '@hono/zod-validator';

export const payloadValidator: Hook<any, any, any, any> = (result, c: Context) => {
  if (!result.success) {
    return c.json(
      {
        code: -1,
        err_msg: `Parameter verification failed`,
        errors: JSON.stringify(result.error.issues),
        status: 400,
      },
      400,
    );
  }
};
