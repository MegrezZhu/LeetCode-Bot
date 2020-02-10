import { from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

export const timeout = async (millisecond: number): Promise<void> => {
    await new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, millisecond);
    });
};

// concurrent map with concurrency limit
// the result order is not gurranteed
export const conMap = async <T> (fs: (() => Promise<T>)[], concurrency: number = 5): Promise<T[]> => {
    const obs = from(fs)
        .pipe(
            mergeMap(f => f(), concurrency)
        );
    let _resolve: (t: T[]) => void;
    let _reject: (...args: any) => any;
    const proxy = new Promise<T[]>((resolve, reject) => {
        _resolve = resolve;
        _reject = reject;
    });

    const result: T[] = [];
    obs.subscribe({
        next: t => {
            result.push(t);
        },
        complete: () => _resolve(result),
        error: (err) => _reject(err)
    });

    return proxy;
};

// ext name that needs to modify. TODO
const extDict: { [v: string]: string } = {
    'javascript': 'js',
    'mysql': 'sql',
    'python': 'py'
};

export const getExt = (language: string): string => {
    return extDict[language] || language;
};
