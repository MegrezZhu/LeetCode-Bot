import { getProgress, getSubmissions, Submission, getProblemMap, SUBMISSION_PAGE_SIZE } from '../lib/API';
import { getHistory as getHistoryLocal, SubmissionHistory } from '../lib/storage';
import { timeout } from '../lib/helper';
import { log } from '../lib/logger';
import assert from 'assert';
import { getMode } from '../config';
import { getHistory as getHistoryAWS } from '../lib/aws';


export const update = async (limit: number = 5): Promise<Submission[]> => {
    let progress = await getProgress();
    let history: SubmissionHistory;
    if (getMode() === 'AWS') {
        history = await getHistoryAWS();
    } else {
        history = await getHistoryLocal();
    }

    log.info('initializing problem set...');
    const problemMap = await getProblemMap();
    log.info('done.');

    const newSubmission: Submission[] = [];
    const seen: Set<number> = new Set(Object.keys(history).map(id => Number(id))); // id of seen submissions
    log.info(`${seen.size} submissions already cached, skipped.`);

    const REDUNDANCY = 1;
    while (seen.size < progress.submissions && limit--) {
        const skip = progress.submissions - seen.size - SUBMISSION_PAGE_SIZE + REDUNDANCY;

        const [submissions, hasNext] = await getSubmissions(skip);

        // make sure no new submission after getProgress, which makes some submission ignored
        if (seen.size === 0 && hasNext || seen.size !== 0 && !submissions.some(sub => seen.has(sub.id))) {
            const oldTotalSubmission = progress.submissions;
            progress = await getProgress();
            assert(
                oldTotalSubmission !== progress.submissions,
                'FATAL: no new submission but guard triggerd, something might have gone wrong.'
            );
            continue;
        }

        const filtered = submissions.filter(sub => !seen.has(sub.id));

        newSubmission.push(...filtered);
        filtered.forEach(o => seen.add(o.id));

        log.info(`new submissions: ${JSON.stringify(filtered.map(o => o.id))}`);
        log.info(`new accpeted submissions: ${JSON.stringify(filtered.filter(sub => sub.status === 'Accepted').map(o => o.id))}`);


        if (limit) {
            await timeout(2000); // avoid accessing APIs too frequently
        }
    }

    // populate problem id & category
    for (const sub of newSubmission) {
        sub.pid = problemMap.get(sub.title)?.id || 'UNK';
        sub.category = problemMap.get(sub.title)?.category || 'UNK';
    }

    log.info(`found ${newSubmission.length} new submissions in total.`);

    // assert new submission in order
    assert(
        newSubmission.slice(1).every((sub, i) => sub.id > newSubmission[i].id),
        'FATAL: new submission not in ascending order, something might have gone wrong.'
    );

    return newSubmission;
};
