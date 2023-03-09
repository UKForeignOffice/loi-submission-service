const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, json } = format;

const logger = createLogger({
    transports: [
        new transports.Console({
            level: 'info',
            format: combine(
                timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                printf(({ level, message, timestamp, ...rest }) => {
                    const meta = Object.keys(rest).length ? JSON.stringify(rest, null, 2) : '';
                    return `[${timestamp}] ${level.toUpperCase()}: ${message} ${meta}`;
                }),
            ),
        }),
        new transports.Console({
            level: 'error',
            format: combine(
                timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                printf(({ level, message, timestamp, ...rest }) => {
                    const meta = Object.keys(rest).length ? JSON.stringify(rest, null, 2) : '';
                    return `[${timestamp}] ${level.toUpperCase()}: ${message} ${meta}`;
                }),
            ),
        }),
    ]
});

console.error = logger.error.bind(logger);
console.log = logger.info.bind(logger);
console.info = logger.info.bind(logger);
console.debug = logger.debug.bind(logger);
console.warn = logger.warn.bind(logger);
