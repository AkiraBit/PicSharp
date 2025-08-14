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
    .help()
    .alias('help', 'h')
    .parseSync();

  await startServer(argv.port);
}

main();
