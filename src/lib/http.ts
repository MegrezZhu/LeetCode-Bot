import axios from 'axios';
import axiosCookieJarSupport from 'axios-cookiejar-support';
import tough from 'tough-cookie';
import { log } from './logger';

// import config from './config';
// import { genProxyConfig } from './proxy';

axiosCookieJarSupport(axios);

const cookieJar = new tough.CookieJar();

declare module 'axios' {
    export interface AxiosRequestConfig {
        retry?: number;
        timeoutFlag?: NodeJS.Timeout;
    }
}

const ax = axios.create({
    timeout: 5000,
    withCredentials: true,
    jar: cookieJar,
    headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.97 Safari/537.36'
    }
});

ax.interceptors.request.use(async config => {
    // populate proxy config
    // config.proxy = await genProxyConfig();
    // console.log(`proxy-config: ${JSON.stringify(config.proxy)}`);

    const cancelSource = axios.CancelToken.source();
    const token = cancelSource.token;
    if (config.timeoutFlag) {
        clearTimeout(config.timeoutFlag);
    }
    const timeoutFlag = setTimeout(() => {
        // console.log('Hard timeout reached');
        cancelSource.cancel('Hard timeout reached.');
    }, (config.timeout || 5000) * 2);

    return {
        ...config,
        cancelToken: token,
        timeoutFlag
    };
});

// post-request check
ax.interceptors.response.use(
    res => {
        // clear hard timeout
        if (res.config.timeoutFlag) {
            clearTimeout(res.config.timeoutFlag);
        }

        // check file size
        if (res.config.responseType === 'arraybuffer') {
            const contentLength = Number(res.headers['content-length']);
            const fileBuffer = res.data;
            if (!isNaN(contentLength) && contentLength !== fileBuffer.length) {
                return Promise.reject(new Error(`Incomplete File (${fileBuffer.length} != ${contentLength})`));
            }
        }

        return res;
    },

    err => {
        if (err.message && err.message.includes('timeout') && err.config) { // timeout case
            const config = err.config;
            if (config.method !== 'get') {
                return Promise.reject(err); // only retry GET methods
            }

            if (config.retry) {
                config.retry--;
            } else if (config.retry === undefined) {
                config.retry = 3; // default retry limit
            }

            if (config.retry) {
                // console.log('retrying...');
                return ax(config);
            } else {
                return Promise.reject(err);
            }
        }
        return Promise.reject(err);
    }
);

export default ax;

const BASE = 'http://leetcode.com';

export interface Session {
    cookie: string;
}

export const setLeetCodeSession = (session: Session) => {
    const cookies = session.cookie.split('; ');
    cookies.forEach(cookie => cookieJar.setCookieSync(cookie, BASE));
};
