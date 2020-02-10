import AWS from 'aws-sdk';
import config, { Config, getTmpDir } from '../config';
import assert from 'assert';
import { omit } from 'lodash';
import { Submission, SubmissionBrief } from './API';
import { SubmissionHistory } from './storage';
import { resolve } from 'path';
import { log } from './logger';
import { promises as fs } from 'fs';

interface Services {
    S3: AWS.S3 | null;
}

const services: Services = {
    S3: null
};

export const initAWS = async () => {
    assert(config.AWS, 'AWS config not provided.');
    const AWSConfig = config.AWS!;

    const S3 = new AWS.S3({ region: AWSConfig.region });
    // checks to see if the bucket exists & we have the permissions
    await S3.headBucket({ Bucket: AWSConfig.S3.bucketName }).promise();

    services.S3 = S3;
};

const getJson = async <T> (key: string): Promise<T | null> => {
    const AWSConfig = config.AWS!;
    try {
        const { Body: data } = await services.S3!.getObject({
            Bucket: AWSConfig.S3.bucketName,
            Key: key
        }).promise();
        return data ? JSON.parse(data.toString()) : null;
    } catch (err) {
        return null; // key not exists, etc.
    }
};

export const getHistory = async (): Promise<SubmissionHistory> => {
    return await getJson('history.json') || {};
};

export const initPrivateKeyForGit = async () => {
    const AWSConfig = config.AWS!;
    const { Body } = await services.S3!.getObject({
        Bucket: AWSConfig.S3.bucketName,
        Key: 'id_rsa_git'
    }).promise();
    const data = Body?.toString();
    if (data) {
        const tmpdir = getTmpDir();
        const keyPath = resolve(tmpdir, '.ssh/id_rsa_git');
        await fs.mkdir(resolve(tmpdir, '.ssh'), { recursive: true });
        await fs.writeFile(keyPath, data);
        await fs.chmod(keyPath, 0o600);

        log.info(`credential for Git saved at ${keyPath}.`);
    }
};

export const updateHistory = async (newSubs: Submission[]): Promise<void> => {
    const AWSConfig = config.AWS!;
    const history = await getHistory();
    const breifed = newSubs.map(o => omit(o, 'code')) as SubmissionBrief[];
    for (const brief of breifed) {
        history[brief.id] = brief;
    }
    await services.S3!.putObject({
        Bucket: AWSConfig.S3.bucketName,
        Key: 'history.json',
        Body: JSON.stringify(history, null, 2)
    }).promise();
};
