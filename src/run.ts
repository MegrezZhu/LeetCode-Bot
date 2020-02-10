import { run } from '.';
import { log } from './lib/logger';

(async () => {
    run();
})()
    .catch(err => log.error(err));

process.on('unhandledRejection', (err) => log.error(err));
