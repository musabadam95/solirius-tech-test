import { createLogger, format, transports } from 'winston';
const logger = createLogger({
    level: "debug || info || warn || error || fatal",
    format: format.combine(
        format.colorize(),
        format.timestamp(),
        format.printf(({ timestamp, level, message }) => {
        return `${timestamp} ${level}: ${message}`;
        })
    ),
    transports: [
        new transports.Console({
        level: 'info',
        format: format.combine(
            format.colorize(),
            format.simple()
        )
        }),
        new transports.File({ filename: 'error.log', level: 'error' }),
        new transports.File({ filename: 'combined.log' })
    ]
    });
            
    export default logger;