import { FileDeleteEvent } from 'vscode';
import { SCPConfig, SyncProgress, TransferResult } from '../types';
import { Logger } from '../utils/Logger';
import { ConnectionManager } from './ConnectionManager';
import { CredentialManager } from '../security/CredentialManager';
export declare class FileSyncManager {
    private static instance;
    private logger;
    private connectionManager;
    private credentialManager;
    private config;
    private syncInProgress;
    private progressCallbacks;
    private constructor();
    static getInstance(logger: Logger, connectionManager: ConnectionManager, credentialManager: CredentialManager): FileSyncManager;
    setConfiguration(config: SCPConfig | null): void;
    onConfigurationChanged(): void;
    syncFileOnSave(event: any): Promise<void>;
    syncFilesOnDelete(event: FileDeleteEvent): Promise<void>;
    syncAllFiles(): Promise<boolean>;
    downloadFile(remotePath: string, localPath?: string): Promise<TransferResult>;
    private uploadSingleFile;
    private deleteRemoteFile;
    private shouldSyncFile;
    private collectFilesToSync;
    onProgress(callback: (progress: SyncProgress) => void): void;
    private notifyProgress;
    isSyncInProgress(): boolean;
    testConnection(): Promise<boolean>;
}
//# sourceMappingURL=FileSyncManager.d.ts.map