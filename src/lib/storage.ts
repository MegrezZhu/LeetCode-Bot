import { Submission, SubmissionBrief } from './API';
import { promises as fs, constants } from 'fs';
import config from '../config';
import { omit } from 'lodash';
import { Config } from 'aws-sdk';
import { resolve } from 'path';

const isFileExist = async (path: string): Promise<boolean> => {
    try {
        await fs.access(path, constants.F_OK);
        return true;
    } catch (err) {
        return false;
    }
};

export interface SubmissionHistory { // history of all submissions, including WA, etc.
    [id: string]: SubmissionBrief;
}

export const getHistory = async (): Promise<SubmissionHistory> => {
    const historyPath = `${config.storageDir}/history.json`;
    if (await isFileExist(historyPath)) {
        const data = JSON.parse(await fs.readFile(historyPath, { encoding: 'utf-8' }));
        return data;
    } else {
        return {};
    }
};

export const updateHistory = async (newSubs: Submission[]): Promise<void> => {
    const historyPath = `${config.storageDir}/history.json`;
    const history = await getHistory();
    const breifed = newSubs.map(o => omit(o, 'code')) as SubmissionBrief[];
    for (const brief of breifed) {
        history[brief.id] = brief;
    }
    await fs.writeFile(
        historyPath,
        JSON.stringify(history, null, 2),
        { encoding: 'utf-8' }
    );
};

export const getConfig = async (path: string): Promise<Config> => {
    const config = JSON.parse(await fs.readFile(path, { encoding: 'utf-8' }));
    config.storageDir = resolve(path, '..', config.storageDir);
    config.git.localDir = resolve(path, '..', config.git.localDir);

    return config;
};

export const makeStorageDir = async () => {
    await fs.mkdir(config.storageDir, { recursive: true });
};
