import { ExtensionContext, window, OutputChannel } from 'vscode';
import { LogEntry, LogLevel } from '../types';

export class Logger {
    private static instance: Logger;
    private outputChannel: OutputChannel;
    private logs: LogEntry[] = [];
    private readonly MAX_LOGS = 1000;

    private constructor(context: ExtensionContext) {
        this.outputChannel = window.createOutputChannel('VSCode SCP');
    }

    static getInstance(context: ExtensionContext): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger(context);
        }
        return Logger.instance;
    }

    private log(level: LogLevel, message: string, error?: Error): void {
        const logEntry: LogEntry = {
            timestamp: new Date(),
            level,
            message,
            error
        };

        this.logs.push(logEntry);

        if (this.logs.length > this.MAX_LOGS) {
            this.logs.shift();
        }

        const timestamp = logEntry.timestamp.toISOString();
        const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;

        this.outputChannel.appendLine(logMessage);

        if (error) {
            this.outputChannel.appendLine(`Error: ${error.message}`);
            if (error.stack) {
                this.outputChannel.appendLine(`Stack: ${error.stack}`);
            }
        }

        if (level === 'error') {
            window.showErrorMessage(`VSCode SCP Error: ${message}`);
        }
    }

    debug(message: string, error?: Error): void {
        this.log('debug', message, error);
    }

    info(message: string, error?: Error): void {
        this.log('info', message, error);
    }

    warn(message: string, error?: Error): void {
        this.log('warn', message, error);
    }

    error(message: string, error?: Error): void {
        this.log('error', message, error);
    }

    show(): void {
        this.outputChannel.show();
    }

    hide(): void {
        this.outputChannel.hide();
    }

    clear(): void {
        this.outputChannel.clear();
        this.logs = [];
    }

    getRecentLogs(count: number = 100): LogEntry[] {
        return this.logs.slice(-count);
    }

    getLogsByLevel(level: LogLevel): LogEntry[] {
        return this.logs.filter(log => log.level === level);
    }

    dispose(): void {
        this.outputChannel.dispose();
    }
}