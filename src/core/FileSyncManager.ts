import { workspace, window, commands, FileChangeEvent, FileDeleteEvent } from 'vscode';
import { SCPConfig, SyncProgress, TransferResult, FileOperation } from '../types';
import { Logger } from '../utils/Logger';
import { ConnectionManager } from './ConnectionManager';
import { CredentialManager } from '../security/CredentialManager';
import { PathValidator } from '../security/PathValidator';
import * as path from 'path';
import * as fs from 'fs';

export class FileSyncManager {
    private static instance: FileSyncManager;
    private logger: Logger;
    private connectionManager: ConnectionManager;
    private credentialManager: CredentialManager;
    private config: SCPConfig | null = null;
    private syncInProgress: boolean = false;
    private progressCallbacks: ((progress: SyncProgress) => void)[] = [];

    private constructor(logger: Logger, connectionManager: ConnectionManager, credentialManager: CredentialManager) {
        this.logger = logger;
        this.connectionManager = connectionManager;
        this.credentialManager = credentialManager;
    }

    static getInstance(logger: Logger, connectionManager: ConnectionManager, credentialManager: CredentialManager): FileSyncManager {
        if (!FileSyncManager.instance) {
            FileSyncManager.instance = new FileSyncManager(logger, connectionManager, credentialManager);
        }
        return FileSyncManager.instance;
    }

    setConfiguration(config: SCPConfig | null): void {
        this.config = config;
        if (config) {
            this.logger.info(`Configuration updated for ${config.host}:${config.port}`);
        }
    }

    onConfigurationChanged(): void {
        this.logger.info('Configuration changed event received');
    }

    async syncFileOnSave(event: any): Promise<void> {
        if (!this.config?.uploadOnSave || this.syncInProgress) {
            return;
        }

        const document = event.document;
        const fileName = document.fileName;

        if (!this.shouldSyncFile(fileName)) {
            return;
        }

        this.syncInProgress = true;
        try {
            await this.uploadSingleFile(fileName);
        } catch (error) {
            this.logger.error(`Failed to sync file ${fileName}`, error as Error);
        } finally {
            this.syncInProgress = false;
        }
    }

    async syncFilesOnDelete(event: FileDeleteEvent): Promise<void> {
        if (!this.config || this.syncInProgress) {
            return;
        }

        this.syncInProgress = true;
        try {
            for (const file of event.files) {
                const filePath = file.fsPath;
                if (this.shouldSyncFile(filePath)) {
                    await this.deleteRemoteFile(filePath);
                }
            }
        } catch (error) {
            this.logger.error('Failed to delete remote files', error as Error);
        } finally {
            this.syncInProgress = false;
        }
    }

    async syncAllFiles(): Promise<boolean> {
        if (!this.config) {
            window.showErrorMessage('No configuration found');
            return false;
        }

        const workspaceFolders = workspace.workspaceFolders;
        if (!workspaceFolders) {
            window.showErrorMessage('No workspace folder found');
            return false;
        }

        this.syncInProgress = true;
        const progressOptions = {
            location: 15,
            title: 'Syncing files to remote server'
        };

        return await window.withProgress(progressOptions, async (progress) => {
            try {
                const rootPath = workspaceFolders[0].uri.fsPath;
                const connectionInfo = await this.credentialManager.getConnectionInfo(this.config!);
                
                if (!connectionInfo.password && !connectionInfo.privateKey) {
                    throw new Error('No authentication credentials available');
                }

                const files = await this.collectFilesToSync(rootPath);
                const totalFiles = files.length;
                let processedFiles = 0;

                for (const file of files) {
                    if (!file.endsWith('/')) {
                        const relativePath = file.replace(rootPath, '').replace(/\\/g, '/');
                        const remotePath = path.posix.join(this.config!.remotePath, relativePath);

                        const remoteDir = path.posix.dirname(remotePath);
                        await this.connectionManager.ensureRemoteDirectory(connectionInfo, remoteDir);

                        const result = await this.connectionManager.uploadFile(connectionInfo, file, remotePath);
                        
                        if (!result.success) {
                            this.logger.error(`Failed to upload ${file}: ${result.error}`);
                        }

                        processedFiles++;
                        const percentage = Math.round((processedFiles / totalFiles) * 100);
                        progress.report({
                            increment: 100 / totalFiles,
                            message: `${processedFiles}/${totalFiles} files`
                        });

                        this.notifyProgress({
                            fileName: path.basename(file),
                            bytesTransferred: 0,
                            totalBytes: 0,
                            percentage,
                            operation: 'upload'
                        });
                    }
                }

                window.showInformationMessage(`Successfully synced ${processedFiles} files to remote server`);
                return true;
            } catch (error) {
                this.logger.error('Failed to sync files', error as Error);
                window.showErrorMessage(`Sync failed: ${(error as Error).message}`);
                return false;
            } finally {
                this.syncInProgress = false;
            }
        });
    }

    async downloadFile(remotePath: string, localPath?: string): Promise<TransferResult> {
        if (!this.config) {
            return { success: false, error: 'No configuration found', code: 0 };
        }

        try {
            const connectionInfo = await this.credentialManager.getConnectionInfo(this.config);
            const targetLocalPath = localPath || path.join(workspace.workspaceFolders![0].uri.fsPath, path.basename(remotePath));

            return await this.connectionManager.downloadFile(connectionInfo, remotePath, targetLocalPath);
        } catch (error) {
            this.logger.error(`Failed to download file ${remotePath}`, error as Error);
            return { success: false, error: (error as Error).message, code: 1 };
        }
    }

    private async uploadSingleFile(localPath: string): Promise<TransferResult> {
        if (!this.config) {
            return { success: false, error: 'No configuration found', code: 0 };
        }

        try {
            const connectionInfo = await this.credentialManager.getConnectionInfo(this.config);
            const relativePath = localPath.replace(workspace.workspaceFolders![0].uri.fsPath, '').replace(/\\/g, '/');
            const remotePath = path.posix.join(this.config.remotePath, relativePath);

            const remoteDir = path.posix.dirname(remotePath);
            await this.connectionManager.ensureRemoteDirectory(connectionInfo, remoteDir);

            const result = await this.connectionManager.uploadFile(connectionInfo, localPath, remotePath);

            if (result.success) {
                window.showInformationMessage(`Synced: ${relativePath}`);
            } else {
                window.showErrorMessage(`Sync failed: ${relativePath} - ${result.error}`);
            }

            return result;
        } catch (error) {
            this.logger.error(`Failed to upload file ${localPath}`, error as Error);
            return { success: false, error: (error as Error).message, code: 1 };
        }
    }

    private async deleteRemoteFile(localPath: string): Promise<TransferResult> {
        if (!this.config) {
            return { success: false, error: 'No configuration found', code: 0 };
        }

        try {
            const connectionInfo = await this.credentialManager.getConnectionInfo(this.config);
            const relativePath = localPath.replace(workspace.workspaceFolders![0].uri.fsPath, '').replace(/\\/g, '/');
            const remotePath = path.posix.join(this.config.remotePath, relativePath);

            return await this.connectionManager.deleteRemoteFile(connectionInfo, remotePath);
        } catch (error) {
            this.logger.error(`Failed to delete remote file ${localPath}`, error as Error);
            return { success: false, error: (error as Error).message, code: 1 };
        }
    }

    private shouldSyncFile(filePath: string): boolean {
        if (!this.config) {
            return false;
        }

        const relativePath = filePath.replace(workspace.workspaceFolders![0].uri.fsPath, '').replace(/\\/g, '/');
        
        for (const ignorePattern of this.config.ignore) {
            if (relativePath.includes(ignorePattern) || filePath.includes(ignorePattern)) {
                return false;
            }
        }

        return true;
    }

    private async collectFilesToSync(rootPath: string): Promise<string[]> {
        const files: string[] = [];

        const collectFiles = (dir: string): void => {
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (this.shouldSyncFile(fullPath)) {
                    if (stat.isDirectory()) {
                        collectFiles(fullPath);
                    } else {
                        files.push(fullPath);
                    }
                }
            }
        };

        collectFiles(rootPath);
        return files;
    }

    onProgress(callback: (progress: SyncProgress) => void): void {
        this.progressCallbacks.push(callback);
    }

    private notifyProgress(progress: SyncProgress): void {
        for (const callback of this.progressCallbacks) {
            callback(progress);
        }
    }

    isSyncInProgress(): boolean {
        return this.syncInProgress;
    }

    async testConnection(): Promise<boolean> {
        if (!this.config) {
            return false;
        }

        try {
            const connectionInfo = await this.credentialManager.getConnectionInfo(this.config);
            return await this.connectionManager.testConnection(connectionInfo);
        } catch (error) {
            this.logger.error('Connection test failed', error as Error);
            return false;
        }
    }
}