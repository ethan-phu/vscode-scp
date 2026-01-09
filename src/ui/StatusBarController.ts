import { StatusBarAlignment, window, StatusBarItem, ExtensionContext } from 'vscode';
import { ExtensionState } from '../types';
import { Logger } from '../utils/Logger';

export class StatusBarController {
    private static instance: StatusBarController;
    private statusBarItem: StatusBarItem;
    private connectionStatusBarItem: StatusBarItem;
    private logger: Logger;
    private currentState: ExtensionState;

    private constructor(logger: Logger) {
        this.logger = logger;
        this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 100);
        this.connectionStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 1);
        
        this.currentState = {
            isConnected: false,
            syncInProgress: false
        };

        this.setupStatusBar();
    }

    static getInstance(logger: Logger): StatusBarController {
        if (!StatusBarController.instance) {
            StatusBarController.instance = new StatusBarController(logger);
        }
        return StatusBarController.instance;
    }

    private setupStatusBar(): void {
        this.statusBarItem.text = '$(sync~spin) VSCode SCP';
        this.statusBarItem.tooltip = 'VSCode SCP Extension';
        this.statusBarItem.command = 'vscode-scp.showLogs';
        this.statusBarItem.show();

        this.connectionStatusBarItem.text = '$(plug) Disconnected';
        this.connectionStatusBarItem.tooltip = 'SCP Connection Status';
        this.connectionStatusBarItem.command = 'vscode-scp.testConnection';
        this.connectionStatusBarItem.show();
    }

    updateConnectionStatus(isConnected: boolean, serverName?: string): void {
        this.currentState.isConnected = isConnected;
        
        if (isConnected && serverName) {
            this.connectionStatusBarItem.text = `$(plug) Connected to ${serverName}`;
            this.connectionStatusBarItem.backgroundColor = undefined;
            this.logger.info(`Status bar: Connected to ${serverName}`);
        } else if (isConnected) {
            this.connectionStatusBarItem.text = '$(plug) Connected';
            this.connectionStatusBarItem.backgroundColor = undefined;
        } else {
            this.connectionStatusBarItem.text = '$(plug) Disconnected';
            (this.connectionStatusBarItem.backgroundColor as any) = 'statusBarItem.warningBackground';
            this.logger.info('Status bar: Disconnected');
        }

        this.updateMainStatusText();
    }

    updateSyncStatus(inProgress: boolean): void {
        this.currentState.syncInProgress = inProgress;
        this.updateMainStatusText();
        
        if (inProgress) {
            this.logger.info('Status bar: Sync in progress');
        } else {
            this.logger.info('Status bar: Sync completed');
        }
    }

    updateLastSyncTime(): void {
        this.currentState.lastSyncTime = new Date();
        this.updateMainStatusText();
    }

    private updateMainStatusText(): void {
        if (this.currentState.syncInProgress) {
            this.statusBarItem.text = '$(sync~spin) Syncing...';
            (this.statusBarItem.backgroundColor as any) = 'statusBarItem.prominentBackground';
            this.statusBarItem.tooltip = 'VSCode SCP - Sync in progress';
        } else if (this.currentState.isConnected) {
            this.statusBarItem.text = '$(check) VSCode SCP';
            this.statusBarItem.backgroundColor = undefined;
            const lastSyncText = this.currentState.lastSyncTime 
                ? `Last sync: ${this.currentState.lastSyncTime.toLocaleTimeString()}`
                : 'Ready to sync';
            this.statusBarItem.tooltip = `VSCode SCP Extension - ${lastSyncText}`;
        } else {
            this.statusBarItem.text = '$(warning) VSCode SCP';
            (this.statusBarItem.backgroundColor as any) = 'statusBarItem.warningBackground';
            this.statusBarItem.tooltip = 'VSCode SCP Extension - Not connected';
        }
    }

    showSyncProgress(fileName: string, percentage: number): void {
        this.statusBarItem.text = `$(sync~spin) Syncing ${fileName}: ${percentage}%`;
        this.statusBarItem.tooltip = `Syncing ${fileName} - ${percentage}% complete`;
    }

    showError(error: string): void {
        this.statusBarItem.text = '$(error) VSCode SCP Error';
        (this.statusBarItem.backgroundColor as any) = 'statusBarItem.errorBackground';
        this.statusBarItem.tooltip = `VSCode SCP Error: ${error}`;
        this.connectionStatusBarItem.text = '$(plug) Error';
        (this.connectionStatusBarItem.backgroundColor as any) = 'statusBarItem.errorBackground';
        
        this.logger.error(`Status bar error: ${error}`);
    }

    showWarning(message: string): void {
        this.statusBarItem.text = '$(warning) VSCode SCP';
        (this.statusBarItem.backgroundColor as any) = 'statusBarItem.warningBackground';
        this.statusBarItem.tooltip = `VScode SCP Warning: ${message}`;
        
        this.logger.warn(`Status bar warning: ${message}`);
    }

    hide(): void {
        this.statusBarItem.hide();
        this.connectionStatusBarItem.hide();
    }

    show(): void {
        this.statusBarItem.show();
        this.connectionStatusBarItem.show();
    }

    getCurrentState(): ExtensionState {
        return { ...this.currentState };
    }

    refresh(): void {
        this.updateMainStatusText();
    }

    dispose(): void {
        this.statusBarItem.dispose();
        this.connectionStatusBarItem.dispose();
    }
}