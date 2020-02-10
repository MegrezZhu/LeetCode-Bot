import { getLogger, configure } from 'log4js';
import { getMode } from '../config';

const createLogger = () => {
    const appenders: any = {
        out: { type: 'stdout' }
    };
    if (getMode() === 'local') {
        appenders.file = {
            type: 'dateFile',
            filename: './logs/log'
        };
    } else {
        appenders.out.layout = { type: 'basic' };
    }

    configure({
        appenders,
        categories: {
            default: {
                appenders: Object.keys(appenders),
                level: 'debug'
            }
        }
    });

    const logger = getLogger();
    logger.level = 'debug';

    return logger;
};

export const log = createLogger();
