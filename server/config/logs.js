const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, json } = format;

const logger = createLogger({
    transports: [
        new transports.Console({
            level: 'info',
            format: combine(
                timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                printf(({ level, message, timestamp, ...rest }) => {
                    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
                }),
            ),
        }),
        new transports.Console({
            level: 'error',
            format: combine(
                timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                printf(({ level, message, timestamp, ...rest }) => {
                    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
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
