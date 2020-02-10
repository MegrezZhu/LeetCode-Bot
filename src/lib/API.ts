import ax from './http';
import { CookieJar } from 'tough-cookie';
import assert from 'assert';
import { conMap } from './helper';
import { flatten } from 'lodash';

// export const login = async (username: string, password: string) => {
//     await ax.get('https://leetcode.com/accounts/login/');

//     const jar = ax.defaults.jar as CookieJar;
//     const csrftoken = jar
//         .getCookiesSync('https://leetcode.com/accounts/login/')
//         .map(o => o.toJSON())
//         .find(o => o.key === 'csrftoken')!.value;

//     const form = new FormData();
//     form.append('csrfmiddlewaretoken', csrftoken);
//     form.append('login', username);
//     form.append('password', password);

//     // console.log(form.getHeaders());

//     try {

//         const { data } = await ax.post(
//             'https://leetcode.com/accounts/login/',
//             form.getBuffer(),
//             {
//                 headers: {
//                     origin: 'https://leetcode.com',
//                     referer: 'https://leetcode.com/accounts/login/',
//                     ...form.getHeaders()
//                 }
//             }
//         );
//         console.log(data);
//     } catch (err) {
//         console.log(err.response.data);
//     }
// };

export const checkLoginValidity = async () => {
    try {
        await ax.get('https://leetcode.com/api/progress/all/');
        return true;
    } catch (err) {
        return false;
    }
};

export const getProgress = async () => {
    const { data }: { data: string } = await ax.get('https://leetcode.com/progress/');
    const match1 = data.match(/total_submissions: (?<submissions>\d+)/);
    const match2 = data.match(/ac_total: (?<ac>\d+)/);

    assert(match1 && match2, 'progress data not found.');

    return {
        submissions: Number(match1!.groups!.submissions),
        ac: Number(match2!.groups!.ac)
    };
};

export interface Problem {
    id: number;
    title: string;
    titleSlug: string;
    category: string;
}

export type ProblemMap = Map<string, Problem>;

const categories = {
    'Algorithms': 'https://leetcode.com/api/problems/algorithms/',
    'Database': 'https://leetcode.com/api/problems/database/',
    'Shell': 'https://leetcode.com/api/problems/shell/',
    'Concurrency': 'https://leetcode.com/api/problems/concurrency/'
};

const getProblemList = async (category: string, url: string): Promise<Problem[]> => {
    const { data } = await ax.get(url);
    const problems: Problem[] = data.stat_status_pairs.map((o: any) => ({
        id: Number(o.stat.frontend_question_id),
        title: o.stat.question__title,
        titleSlug: o.stat.question__title_slug,
        category
    }));
    return problems;
};

export const getProblemMap = async (): Promise<ProblemMap> => {
    const list = await conMap(Object.entries(categories).map(([name, url]) => async () => getProblemList(name, url)));

    const problemMap = new Map<string, Problem>(
        flatten(list).map((o: Problem) => [o.title, o])
    );

    return problemMap;
};

export interface SubmissionBrief {
    id: number;
    language: string;
    timestamp: Date;
    status: string;
    runtime: string;
    url: string;
    isPending: string;
    title: string;
    memory: string;
    // code: string;
    pid?: number | 'UNK'; // problem id
    category?: string | 'UNK';
}

export interface Submission extends SubmissionBrief {
    code: string;
}


export const SUBMISSION_PAGE_SIZE = 20;

export const getSubmissions = async (skip: number, pageSize: number = SUBMISSION_PAGE_SIZE): Promise<[Submission[], boolean]> => {
    const offset = Math.max(0, skip);
    const { data } = await ax.get(`https://leetcode.com/api/submissions/?offset=${offset}&limit=${pageSize}`);
    const submissions = data.submissions_dump
        .map((o: any) => ({
            id: Number(o.id),
            language: o.lang,
            timestamp: new Date(o.timestamp * 1000),
            status: o.status_display,
            runtime: o.runtime,
            url: o.url,
            isPending: o.is_pending,
            title: o.title,
            memory: o.memory,
            code: o.code
        }))
        .sort((a: Submission, b: Submission): number => a.id < b.id ? -1 : 1);// oldest to latest, so that older AC submission to the same problem will be over-written

    return [submissions, data.has_next];
};
