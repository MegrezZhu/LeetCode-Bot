import { update } from './task/update';
import { makeStorageDir, getConfig as getConfigLocal } from './lib/storage';
import { log } from './lib/logger';
import { setLeetCodeSession } from './lib/http';
import { checkLoginValidity } from './lib/API';
import { syncRepo } from './task/sync';
import { getMode, initConfigFromJson, getTmpDir } from './config';
import config from './config';
import { resolve } from 'path';
import assert from 'assert';
import dotenv from 'dotenv';
import yargs from 'yargs';
import { initAWS, initPrivateKeyForGit } from './lib/aws';

async function initialize () {
    try {
        const mode = getMode();
        log.info(`running in ${mode} mode.`);

        if (mode === 'AWS') {
            if (!process.env.CONFIG) {
                log.error('config not provided in env vars.');
                process.exit();
            }
            const envConfig = process.env.CONFIG;
            initConfigFromJson(JSON.parse(envConfig));
            config.git.localDir = resolve(getTmpDir(), 'git');

            log.info('initializing AWS services...');
            await initAWS();
            log.info('AWS services initialized.');

            // fetch SSH keys and store to /tmp
            initPrivateKeyForGit();
        } else {
            const argv = yargs.argv;
            if (!argv.config) {
                log.error('Usage: npm start -- --config=<path_to_config>');
                process.exit();
            }

            const configPath = resolve(process.cwd(), argv.config as any);
            initConfigFromJson(await getConfigLocal(configPath));

            await makeStorageDir();
        }

        const session = process.env.LEETCODE_SESSION;
        assert(session, 'LeetCode session not provided.');
        setLeetCodeSession({ cookie: session! });
        assert(await checkLoginValidity(), 'Invalid session provided, is it expired?');
        log.info('LeetCode session loaded.');
    } catch (err) {
        log.error(err);
        process.exit(1);
    }
}

dotenv.config();
export const run = async () => {
    log.info('----------------------------------------------');
    await initialize();

    const subs = await update(2);
    await syncRepo(subs);
    log.info('----------------------------------------------');
};
