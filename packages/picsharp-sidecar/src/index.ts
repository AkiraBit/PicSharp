import { startServer } from './server';
import { loadConfig } from './config';

async function main() {
  const config = await loadConfig();
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
}

main();
