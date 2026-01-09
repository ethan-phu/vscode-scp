import { ExtensionContext } from 'vscode';
import { LogEntry, LogLevel } from '../types';
export declare class Logger {
    private static instance;
    private outputChannel;
    private logs;
    private readonly MAX_LOGS;
    private constructor();
    static getInstance(context: ExtensionContext): Logger;
    private log;
    debug(message: string, error?: Error): void;
    info(message: string, error?: Error): void;
    warn(message: string, error?: Error): void;
    error(message: string, error?: Error): void;
    show(): void;
    hide(): void;
    clear(): void;
    getRecentLogs(count?: number): LogEntry[];
    getLogsByLevel(level: LogLevel): LogEntry[];
    dispose(): void;
}
//# sourceMappingURL=Logger.d.ts.map