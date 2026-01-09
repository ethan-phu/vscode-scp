"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const vscode_1 = require("vscode");
class Logger {
    constructor(context) {
        this.logs = [];
        this.MAX_LOGS = 1000;
        this.outputChannel = vscode_1.window.createOutputChannel('VSCode SCP');
    }
    static getInstance(context) {
        if (!Logger.instance) {
            Logger.instance = new Logger(context);
        }
        return Logger.instance;
    }
    log(level, message, error) {
        const logEntry = {
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
            vscode_1.window.showErrorMessage(`VSCode SCP Error: ${message}`);
        }
    }
    debug(message, error) {
        this.log('debug', message, error);
    }
    info(message, error) {
        this.log('info', message, error);
    }
    warn(message, error) {
        this.log('warn', message, error);
    }
    error(message, error) {
        this.log('error', message, error);
    }
    show() {
        this.outputChannel.show();
    }
    hide() {
        this.outputChannel.hide();
    }
    clear() {
        this.outputChannel.clear();
        this.logs = [];
    }
    getRecentLogs(count = 100) {
        return this.logs.slice(-count);
    }
    getLogsByLevel(level) {
        return this.logs.filter(log => log.level === level);
    }
    dispose() {
        this.outputChannel.dispose();
    }
}
exports.Logger = Logger;
//# sourceMappingURL=Logger.js.map