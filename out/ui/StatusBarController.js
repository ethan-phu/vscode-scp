"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusBarController = void 0;
const vscode_1 = require("vscode");
class StatusBarController {
    constructor(logger) {
        this.logger = logger;
        this.statusBarItem = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Right, 100);
        this.connectionStatusBarItem = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left, 1);
        this.currentState = {
            isConnected: false,
            syncInProgress: false
        };
        this.setupStatusBar();
    }
    static getInstance(logger) {
        if (!StatusBarController.instance) {
            StatusBarController.instance = new StatusBarController(logger);
        }
        return StatusBarController.instance;
    }
    setupStatusBar() {
        this.statusBarItem.text = '$(sync~spin) VSCode SCP';
        this.statusBarItem.tooltip = 'VSCode SCP Extension';
        this.statusBarItem.command = 'vscode-scp.showLogs';
        this.statusBarItem.show();
        this.connectionStatusBarItem.text = '$(plug) Disconnected';
        this.connectionStatusBarItem.tooltip = 'SCP Connection Status';
        this.connectionStatusBarItem.command = 'vscode-scp.testConnection';
        this.connectionStatusBarItem.show();
    }
    updateConnectionStatus(isConnected, serverName) {
        this.currentState.isConnected = isConnected;
        if (isConnected && serverName) {
            this.connectionStatusBarItem.text = `$(plug) Connected to ${serverName}`;
            this.connectionStatusBarItem.backgroundColor = undefined;
            this.logger.info(`Status bar: Connected to ${serverName}`);
        }
        else if (isConnected) {
            this.connectionStatusBarItem.text = '$(plug) Connected';
            this.connectionStatusBarItem.backgroundColor = undefined;
        }
        else {
            this.connectionStatusBarItem.text = '$(plug) Disconnected';
            this.connectionStatusBarItem.backgroundColor = 'statusBarItem.warningBackground';
            this.logger.info('Status bar: Disconnected');
        }
        this.updateMainStatusText();
    }
    updateSyncStatus(inProgress) {
        this.currentState.syncInProgress = inProgress;
        this.updateMainStatusText();
        if (inProgress) {
            this.logger.info('Status bar: Sync in progress');
        }
        else {
            this.logger.info('Status bar: Sync completed');
        }
    }
    updateLastSyncTime() {
        this.currentState.lastSyncTime = new Date();
        this.updateMainStatusText();
    }
    updateMainStatusText() {
        if (this.currentState.syncInProgress) {
            this.statusBarItem.text = '$(sync~spin) Syncing...';
            this.statusBarItem.backgroundColor = 'statusBarItem.prominentBackground';
            this.statusBarItem.tooltip = 'VSCode SCP - Sync in progress';
        }
        else if (this.currentState.isConnected) {
            this.statusBarItem.text = '$(check) VSCode SCP';
            this.statusBarItem.backgroundColor = undefined;
            const lastSyncText = this.currentState.lastSyncTime
                ? `Last sync: ${this.currentState.lastSyncTime.toLocaleTimeString()}`
                : 'Ready to sync';
            this.statusBarItem.tooltip = `VSCode SCP Extension - ${lastSyncText}`;
        }
        else {
            this.statusBarItem.text = '$(warning) VSCode SCP';
            this.statusBarItem.backgroundColor = 'statusBarItem.warningBackground';
            this.statusBarItem.tooltip = 'VSCode SCP Extension - Not connected';
        }
    }
    showSyncProgress(fileName, percentage) {
        this.statusBarItem.text = `$(sync~spin) Syncing ${fileName}: ${percentage}%`;
        this.statusBarItem.tooltip = `Syncing ${fileName} - ${percentage}% complete`;
    }
    showError(error) {
        this.statusBarItem.text = '$(error) VSCode SCP Error';
        this.statusBarItem.backgroundColor = 'statusBarItem.errorBackground';
        this.statusBarItem.tooltip = `VSCode SCP Error: ${error}`;
        this.connectionStatusBarItem.text = '$(plug) Error';
        this.connectionStatusBarItem.backgroundColor = 'statusBarItem.errorBackground';
        this.logger.error(`Status bar error: ${error}`);
    }
    showWarning(message) {
        this.statusBarItem.text = '$(warning) VSCode SCP';
        this.statusBarItem.backgroundColor = 'statusBarItem.warningBackground';
        this.statusBarItem.tooltip = `VScode SCP Warning: ${message}`;
        this.logger.warn(`Status bar warning: ${message}`);
    }
    hide() {
        this.statusBarItem.hide();
        this.connectionStatusBarItem.hide();
    }
    show() {
        this.statusBarItem.show();
        this.connectionStatusBarItem.show();
    }
    getCurrentState() {
        return { ...this.currentState };
    }
    refresh() {
        this.updateMainStatusText();
    }
    dispose() {
        this.statusBarItem.dispose();
        this.connectionStatusBarItem.dispose();
    }
}
exports.StatusBarController = StatusBarController;
//# sourceMappingURL=StatusBarController.js.map