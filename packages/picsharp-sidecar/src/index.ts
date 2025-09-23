import 'dotenv/config';
import './apm';
import { startServer } from './server';
import { loadConfig } from './config';
import { captureError } from './utils';

async function main() {
  try {
    const config = await loadConfig();
    if (!config.enable) {
      process.exit(0);
    }
    if (config.mode === 'cli') {
      console.log(
        JSON.stringify({
          mode: 'cli',
          message: 'PicSharp Sidecar CLI is under construction.',
        }),
      );
      return;
    } else {
      await startServer(config);
    }
  } catch (error: any) {
    captureError(error);
    process.exit(1);
  }
}

main();
