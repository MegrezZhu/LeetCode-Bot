import { promises as fs } from 'fs';
import { assign } from 'lodash';
import { resolve } from 'path';
import { tmpdir } from 'os';

export interface Config {
    storageDir: string;
    git: {
        localDir: string;
        remotePath: string;
        relCodeDir: string;
        username: string;
        email: string;
        branch?: string
    };
    AWS?: {
        region: string;
        S3: {
            bucketName: string;
        };
        Lambda: {};
    };
}

const config: Config = {} as any; // dumb

export const initConfigFromJson = (data: any): Config => {
    assign(config, data);
    return config;
};

type Mode = 'AWS' | 'local';

export const getMode = (): Mode => {
    return process.env.MODE === 'AWS' ? 'AWS' : 'local';
};

export const getTmpDir = () => {
    return resolve(tmpdir(), 'leetcode-bot');
};

export default config;
