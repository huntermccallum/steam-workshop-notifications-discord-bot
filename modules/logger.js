import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const { combine, timestamp, label, printf, colorize } = format;

const consoleFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${colorize().colorize(level, level)}: ${message}`;
});

const fileFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
});

const environment = process.env.NODE_ENV || 'development';
const isDevelopment = environment === 'development';

const errorTransport = new DailyRotateFile({
    filename: './logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'error',
    format: combine(fileFormat),
    handleExceptions: true
});

const combinedTransport = new DailyRotateFile({
    filename: './logs/combined-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: combine(fileFormat),
    handleExceptions: true
});

const consoleTransport = new transports.Console({
    format: combine(consoleFormat),
    level: isDevelopment ? 'debug' : 'warn',
    handleExceptions: true
});

// Handle transport errors
[errorTransport, combinedTransport, consoleTransport].forEach(transport => {
    transport.on('error', (err) => {
        console.error(`Error occurred in ${transport.name} transport:`, err);
    });
});

export const logger = createLogger({
    level: isDevelopment ? 'debug' : 'info',
    format: combine(label({ label: 'swndb' }), timestamp()),
    transports: [errorTransport, combinedTransport, consoleTransport],
    exitOnError: false // Do not exit on handled exceptions
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
