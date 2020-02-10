import { git } from '../lib/git';
import config, { getMode } from '../config';
import { log } from '../lib/logger';
import { Submission } from '../lib/API';
import { resolve } from 'path';
import { conMap, getExt } from '../lib/helper';
import { promises as fs } from 'fs';
import { updateHistory as updateHistoryLocal } from '../lib/storage';
import { updateHistory as updateHistoryAWS } from '../lib/aws';


const saveSubmission = async (sub: Submission, dir: string): Promise<void> => {
    const path = `${dir}/${sub.category!}/${sub.pid}. ${sub.title}.${getExt(sub.language)}`;

    await fs.mkdir(`${dir}/${sub.category!}`, { recursive: true });

    await fs.writeFile(path, sub.code, { encoding: 'utf-8' });
    await fs.utimes(path, new Date(), sub.timestamp);

    log.info(`new code file: ${path}`);
};

export const syncRepo = async (subs: Submission[]) => {
    const repoDir = config.git.localDir;
    const codeDir = resolve(repoDir, config.git.relCodeDir || '.');

    if (subs.length === 0) {
        log.info('no new submission found, skipped.');
        return;
    }

    const ac = subs.filter(sub => sub.status === 'Accepted');
    if (ac.length !== 0) {
        // clone repo
        log.info('preparing git repo...');
        await fs.rmdir(repoDir, { recursive: true });
        await fs.mkdir(repoDir, { recursive: true }); // git clone error if not mkdir first?
        log.info(`cloning ${config.git.remotePath} into ${repoDir}`);
        await git.clone(config.git.remotePath, repoDir);
        log.info('done.');

        await conMap(ac.map(sub => () => saveSubmission(sub, codeDir)), 1);
        log.info('all new code files moved into local repo.');


        // add new files & push
        await git.cwd(config.git.localDir);
        await git.addConfig('user.name', config.git.username);
        await git.addConfig('user.email', config.git.email);
        await git.add('./*');
        await git.commit('updated by Leetcode-Bot.', []);
        log.info('pushing...');
        await git.push('origin', 'master');
        log.info('completed.');
    } else {
        log.info('no new accepted submission, skipped repository sync.');
    }

    log.info('updating cache info...');
    if (getMode() === 'AWS') {
        await updateHistoryAWS(subs);
    } else {
        await updateHistoryLocal(subs);
    }
    log.info('done.');
};
