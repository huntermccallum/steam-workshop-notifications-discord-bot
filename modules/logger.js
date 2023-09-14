import { createLogger, format, transports } from 'winston'

const { combine, timestamp, label, printf } = format

const myFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`
})

export const logger = createLogger({
    level: 'debug',
    format: combine(label({ label: 'swndb' }), timestamp(), myFormat),
    transports: [new transports.Console(), new transports.File({ filename: './logs/error.log', level: 'error' }), new transports.File({ filename: './logs/combined.log' })],
})
