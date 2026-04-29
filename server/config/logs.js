import { createLogger, format, transports } from 'winston'

const { combine, timestamp, printf } = format

export const logger = createLogger({
  transports: [
    new transports.Console({
      level: 'info',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        printf(({ level, message, timestamp, ..._rest }) => {
          return `${level.toUpperCase()}: ${message}`
        }),
      ),
    }),
    new transports.Console({
      level: 'error',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        printf(({ level, message, timestamp, ..._rest }) => {
          return `${level.toUpperCase()}: ${message}`
        }),
      ),
    }),
  ],
})
