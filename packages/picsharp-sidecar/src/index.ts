import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { startServer } from './server';

async function main() {
  const argv = yargs(hideBin(process.argv))
    .locale('en')
    .option('port', {
      alias: 'p',
      description: 'Server port',
      type: 'number',
      default: 3000,
    })
    .option('mode', {
      alias: 'm',
      description: 'Start mode: server | cli',
      type: 'string',
      choices: ['server', 'cli'] as const,
      default: 'server',
    })
    .help()
    .alias('help', 'h')
    .parseSync();

  if (argv.mode === 'cli') {
    console.log(
      JSON.stringify({
        mode: 'cli',
        message: 'PicSharp Sidecar CLI is under construction.',
      }),
    );
    return;
  }

  await startServer({
    port: argv.port,
  });
}

main();
