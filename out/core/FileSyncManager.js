"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSyncManager = void 0;
const vscode_1 = require("vscode");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class FileSyncManager {
    constructor(logger, connectionManager, credentialManager) {
        this.config = null;
        this.syncInProgress = false;
        this.progressCallbacks = [];
        this.logger = logger;
        this.connectionManager = connectionManager;
        this.credentialManager = credentialManager;
    }
    static getInstance(logger, connectionManager, credentialManager) {
        if (!FileSyncManager.instance) {
            FileSyncManager.instance = new FileSyncManager(logger, connectionManager, credentialManager);
        }
        return FileSyncManager.instance;
    }
    setConfiguration(config) {
        this.config = config;
        if (config) {
            this.logger.info(`Configuration updated for ${config.host}:${config.port}`);
        }
    }
    onConfigurationChanged() {
        this.logger.info('Configuration changed event received');
    }
    async syncFileOnSave(event) {
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
        }
        catch (error) {
            this.logger.error(`Failed to sync file ${fileName}`, error);
        }
        finally {
            this.syncInProgress = false;
        }
    }
    async syncFilesOnDelete(event) {
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
        }
        catch (error) {
            this.logger.error('Failed to delete remote files', error);
        }
        finally {
            this.syncInProgress = false;
        }
    }
    async syncAllFiles() {
        if (!this.config) {
            vscode_1.window.showErrorMessage('No configuration found');
            return false;
        }
        const workspaceFolders = vscode_1.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode_1.window.showErrorMessage('No workspace folder found');
            return false;
        }
        this.syncInProgress = true;
        const progressOptions = {
            location: 15,
            title: 'Syncing files to remote server'
        };
        return await vscode_1.window.withProgress(progressOptions, async (progress) => {
            try {
                const rootPath = workspaceFolders[0].uri.fsPath;
                const connectionInfo = await this.credentialManager.getConnectionInfo(this.config);
                if (!connectionInfo.password && !connectionInfo.privateKey) {
                    throw new Error('No authentication credentials available');
                }
                const files = await this.collectFilesToSync(rootPath);
                const totalFiles = files.length;
                let processedFiles = 0;
                for (const file of files) {
                    if (!file.endsWith('/')) {
                        const relativePath = file.replace(rootPath, '').replace(/\\/g, '/');
                        const remotePath = path.posix.join(this.config.remotePath, relativePath);
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
                vscode_1.window.showInformationMessage(`Successfully synced ${processedFiles} files to remote server`);
                return true;
            }
            catch (error) {
                this.logger.error('Failed to sync files', error);
                vscode_1.window.showErrorMessage(`Sync failed: ${error.message}`);
                return false;
            }
            finally {
                this.syncInProgress = false;
            }
        });
    }
    async downloadFile(remotePath, localPath) {
        if (!this.config) {
            return { success: false, error: 'No configuration found', code: 0 };
        }
        try {
            const connectionInfo = await this.credentialManager.getConnectionInfo(this.config);
            const targetLocalPath = localPath || path.join(vscode_1.workspace.workspaceFolders[0].uri.fsPath, path.basename(remotePath));
            return await this.connectionManager.downloadFile(connectionInfo, remotePath, targetLocalPath);
        }
        catch (error) {
            this.logger.error(`Failed to download file ${remotePath}`, error);
            return { success: false, error: error.message, code: 1 };
        }
    }
    async uploadSingleFile(localPath) {
        if (!this.config) {
            return { success: false, error: 'No configuration found', code: 0 };
        }
        try {
            const connectionInfo = await this.credentialManager.getConnectionInfo(this.config);
            const relativePath = localPath.replace(vscode_1.workspace.workspaceFolders[0].uri.fsPath, '').replace(/\\/g, '/');
            const remotePath = path.posix.join(this.config.remotePath, relativePath);
            const remoteDir = path.posix.dirname(remotePath);
            await this.connectionManager.ensureRemoteDirectory(connectionInfo, remoteDir);
            const result = await this.connectionManager.uploadFile(connectionInfo, localPath, remotePath);
            if (result.success) {
                vscode_1.window.showInformationMessage(`Synced: ${relativePath}`);
            }
            else {
                vscode_1.window.showErrorMessage(`Sync failed: ${relativePath} - ${result.error}`);
            }
            return result;
        }
        catch (error) {
            this.logger.error(`Failed to upload file ${localPath}`, error);
            return { success: false, error: error.message, code: 1 };
        }
    }
    async deleteRemoteFile(localPath) {
        if (!this.config) {
            return { success: false, error: 'No configuration found', code: 0 };
        }
        try {
            const connectionInfo = await this.credentialManager.getConnectionInfo(this.config);
            const relativePath = localPath.replace(vscode_1.workspace.workspaceFolders[0].uri.fsPath, '').replace(/\\/g, '/');
            const remotePath = path.posix.join(this.config.remotePath, relativePath);
            return await this.connectionManager.deleteRemoteFile(connectionInfo, remotePath);
        }
        catch (error) {
            this.logger.error(`Failed to delete remote file ${localPath}`, error);
            return { success: false, error: error.message, code: 1 };
        }
    }
    shouldSyncFile(filePath) {
        if (!this.config) {
            return false;
        }
        const relativePath = filePath.replace(vscode_1.workspace.workspaceFolders[0].uri.fsPath, '').replace(/\\/g, '/');
        for (const ignorePattern of this.config.ignore) {
            if (relativePath.includes(ignorePattern) || filePath.includes(ignorePattern)) {
                return false;
            }
        }
        return true;
    }
    async collectFilesToSync(rootPath) {
        const files = [];
        const collectFiles = (dir) => {
            const items = fs.readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                if (this.shouldSyncFile(fullPath)) {
                    if (stat.isDirectory()) {
                        collectFiles(fullPath);
                    }
                    else {
                        files.push(fullPath);
                    }
                }
            }
        };
        collectFiles(rootPath);
        return files;
    }
    onProgress(callback) {
        this.progressCallbacks.push(callback);
    }
    notifyProgress(progress) {
        for (const callback of this.progressCallbacks) {
            callback(progress);
        }
    }
    isSyncInProgress() {
        return this.syncInProgress;
    }
    async testConnection() {
        if (!this.config) {
            return false;
        }
        try {
            const connectionInfo = await this.credentialManager.getConnectionInfo(this.config);
            return await this.connectionManager.testConnection(connectionInfo);
        }
        catch (error) {
            this.logger.error('Connection test failed', error);
            return false;
        }
    }
}
exports.FileSyncManager = FileSyncManager;
//# sourceMappingURL=FileSyncManager.js.map