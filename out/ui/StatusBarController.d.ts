import { ExtensionState } from '../types';
import { Logger } from '../utils/Logger';
export declare class StatusBarController {
    private static instance;
    private statusBarItem;
    private connectionStatusBarItem;
    private logger;
    private currentState;
    private constructor();
    static getInstance(logger: Logger): StatusBarController;
    private setupStatusBar;
    updateConnectionStatus(isConnected: boolean, serverName?: string): void;
    updateSyncStatus(inProgress: boolean): void;
    updateLastSyncTime(): void;
    private updateMainStatusText;
    showSyncProgress(fileName: string, percentage: number): void;
    showError(error: string): void;
    showWarning(message: string): void;
    hide(): void;
    show(): void;
    getCurrentState(): ExtensionState;
    refresh(): void;
    dispose(): void;
}
//# sourceMappingURL=StatusBarController.d.ts.map