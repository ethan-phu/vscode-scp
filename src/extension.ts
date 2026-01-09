import { ExtensionContext, commands, workspace, window, Disposable } from 'vscode';
import { Logger } from './utils/Logger';
import { ConfigManager } from './core/ConfigManager';
import { CredentialManager } from './security/CredentialManager';
import { FileSyncManager } from './core/FileSyncManager';
import { StatusBarController } from './ui/StatusBarController';
import { ConfigurationPanel } from './ui/ConfigurationPanel';
import { VisualConfigManager } from './ui/VisualConfigManager';
import { SCPConfig } from './types';

export class VSCodeSCPExtension {
    private static instance: VSCodeSCPExtension;
    private context: ExtensionContext;
    private logger!: Logger;
    private configManager!: ConfigManager;
    private credentialManager!: CredentialManager;
    private connectionManager!: ConnectionManager;
    private fileSyncManager!: FileSyncManager;
    private statusBarController!: StatusBarController;
    private configurationPanel!: ConfigurationPanel;
    private disposables: Disposable[] = [];

    private constructor(context: ExtensionContext) {
        this.context = context;
    }

    static getInstance(context: ExtensionContext): VSCodeSCPExtension {
        if (!VSCodeSCPExtension.instance) {
            VSCodeSCPExtension.instance = new VSCodeSCPExtension(context);
        }
        return VSCodeSCPExtension.instance;
    }

    async activate(): Promise<void> {
        this.initializeManagers();
        this.visualConfigManager = VisualConfigManager.getInstance(this.context, this.logger, this.configManager);
        this.visualConfigManager.activate(this.context);

        const deploy = new Deploy();
        let reload = vscode.workspace.onDidChangeConfiguration(deploy.readCfg);
        let save = vscode.workspace.onDidSaveTextDocument(deploy.syncToRemote);
        let deletes = vscode.workspace.onDidDeleteFiles(deploy.deleteFromRemote);
        context.subscriptions.push(reload);
        context.subscriptions.push(save);
        context.subscriptions.push(deletes);

        let configRegistry = vscode.commands.registerCommand('vscode-scp.config', deploy.newCfg);
        let allTrans = vscode.commands.registerCommand("vscode-scp.local2remote", deploy.syncAll);
        context.subscriptions.push(configRegistry);
        context.subscriptions.push(allTrans);
    }
    }

    private initializeManagers(): void {
        this.logger = Logger.getInstance(this.context);
        this.configManager = ConfigManager.getInstance(this.context, this.logger);
        this.credentialManager = CredentialManager.getInstance(this.context);
        this.connectionManager = ConnectionManager.getInstance(this.logger);
        this.fileSyncManager = FileSyncManager.getInstance(this.logger, this.connectionManager, this.credentialManager);
        this.statusBarController = StatusBarController.getInstance(this.logger);
        this.configurationPanel = ConfigurationPanel.getInstance(this.context, this.logger, this.configManager, this.credentialManager);
        this.visualConfigManager = VisualConfigManager.getInstance(this.context, this.logger, this.configManager);
    }

    private registerCommands(): void {
        const commandList = [
            commands.registerCommand('vscode-scp.config', this.createConfigurationCommand),
            commands.registerCommand('vscode-scp.local2remote', this.syncAllCommand),
            commands.registerCommand('vscode-scp.testConnection', this.testConnectionCommand),
            commands.registerCommand('vscode-scp.showLogs', this.showLogsCommand),
            commands.registerCommand('vscode-scp.downloadFile', this.downloadFileCommand),
            commands.registerCommand('vscode-scp.uploadFile', this.uploadFileCommand),
            commands.registerCommand('vscode-scp.toggleSync', this.toggleSyncCommand),
            commands.registerCommand('vscode-scp.showStatus', this.showStatusCommand)
        ];

        commandList.forEach((command: Disposable) => {
            this.disposables.push(command);
            this.context.subscriptions.push(command);
        });
    }

    private registerEventListeners(): void {
        const fileSaveWatcher = workspace.onDidSaveTextDocument(
            (event) => this.fileSyncManager.syncFileOnSave(event)
        );
        this.disposables.push(fileSaveWatcher);
        this.context.subscriptions.push(fileSaveWatcher);

        const fileDeleteWatcher = workspace.onDidDeleteFiles(
            (event) => this.fileSyncManager.syncFilesOnDelete(event)
        );
        this.disposables.push(fileDeleteWatcher);
        this.context.subscriptions.push(fileDeleteWatcher);

        const configChangeWatcher = workspace.onDidChangeConfiguration(
            () => {
                this.fileSyncManager.onConfigurationChanged();
                this.loadConfiguration();
            }
        );
        this.disposables.push(configChangeWatcher);
        this.context.subscriptions.push(configChangeWatcher);
    }

    private async loadConfiguration(): Promise<void> {
        try {
            const config = await this.configManager.loadConfig();
            this.fileSyncManager.setConfiguration(config);
            
            if (config) {
                const connectionValid = await this.testConnectionSilent();
                this.statusBarController.updateConnectionStatus(connectionValid, config.host);
            } else {
                this.statusBarController.updateConnectionStatus(false);
            }
        } catch (error) {
            this.logger.error('Failed to load configuration', error as Error);
            this.statusBarController.showError('Configuration load failed');
        }
    }

    private createConfigurationCommand = (): void => {
        this.configurationPanel.showConfigurationMenu();
    };

    private syncAllCommand = async (): Promise<void> => {
        if (this.fileSyncManager.isSyncInProgress()) {
            window.showInformationMessage('Sync already in progress');
            return;
        }

        this.statusBarController.updateSyncStatus(true);
        try {
            const success = await this.fileSyncManager.syncAllFiles();
            if (success) {
                this.statusBarController.updateLastSyncTime();
                window.showInformationMessage('All files synced successfully');
            }
        } finally {
            this.statusBarController.updateSyncStatus(false);
        }
    };

    private testConnectionCommand = async (): Promise<void> => {
        window.withProgress({
            location: 15,
            title: 'Testing connection'
        }, async () => {
            const isConnected = await this.fileSyncManager.testConnection();
            const config = await this.configManager.loadConfig();
            
            this.statusBarController.updateConnectionStatus(isConnected, config?.host);
            
            if (isConnected) {
                window.showInformationMessage('Connection test successful');
            } else {
                window.showErrorMessage('Connection test failed');
            }
        });
    };

    private showLogsCommand = (): void => {
        this.logger.show();
    };

    private downloadFileCommand = async (): Promise<void> => {
        const remotePath = await window.showInputBox({
            prompt: 'Enter remote file path to download',
            placeHolder: '/remote/path/to/file.txt'
        });

        if (!remotePath) {return;}

        const result = await this.fileSyncManager.downloadFile(remotePath);
        if (result.success) {
            window.showInformationMessage(`Downloaded ${remotePath}`);
        } else {
            window.showErrorMessage(`Download failed: ${result.error}`);
        }
    };

    private uploadFileCommand = async (): Promise<void> => {
        const fileUri = await window.showOpenDialog({
            canSelectMany: false,
            title: 'Select file to upload'
        });

        if (!fileUri || fileUri.length === 0) {return;}

        const config = await this.configManager.loadConfig();
        if (!config) {
            window.showErrorMessage('No configuration found');
            return;
        }

        const remotePath = await window.showInputBox({
            prompt: 'Enter remote destination path',
            value: `${config.remotePath}/${fileUri[0].path.split('/').pop()}`
        });

        if (!remotePath) {return;}

                const connectionInfo = await this.credentialManager.getConnectionInfo({
                    ...config,
                    id: this.generateServerId(config),
                    name: config.host
                } as any);

        const result = await this.connectionManager.uploadFile(connectionInfo, fileUri[0].fsPath, remotePath);
        if (result.success) {
            window.showInformationMessage(`Uploaded to ${remotePath}`);
        } else {
            window.showErrorMessage(`Upload failed: ${result.error}`);
        }
    };

    private toggleSyncCommand = async (): Promise<void> => {
        const config = await this.configManager.loadConfig();
        if (!config) {
            window.showErrorMessage('No configuration found');
            return;
        }

        const newUploadOnSave = !config.uploadOnSave;
        const updatedConfig = { ...config, uploadOnSave: newUploadOnSave };

        const success = await this.configManager.saveConfig(updatedConfig);
        if (success) {
            this.fileSyncManager.setConfiguration(updatedConfig);
            const status = newUploadOnSave ? 'enabled' : 'disabled';
            window.showInformationMessage(`Upload on save ${status}`);
        }
    };

    private showStatusCommand = async (): Promise<void> => {
        const state = this.statusBarController.getCurrentState();
        const config = await this.configManager.loadConfig();

        const statusMessage = `
VSCode SCP Extension Status:

Connection: ${state.isConnected ? 'Connected' : 'Disconnected'}
Sync in Progress: ${state.syncInProgress ? 'Yes' : 'No'}
Last Sync: ${state.lastSyncTime ? state.lastSyncTime.toLocaleString() : 'Never'}
Server: ${config?.host || 'Not configured'}
User: ${config?.user || 'Not configured'}
Remote Path: ${config?.remotePath || 'Not configured'}
        `.trim();

        window.showInformationMessage(statusMessage, 'OK');
    };

    private async testConnectionSilent(): Promise<boolean> {
        try {
            return await this.fileSyncManager.testConnection();
        } catch {
            return false;
        }
    }

    private generateServerId(config: SCPConfig): string {
        return `${config.user}@${config.host}:${config.port}`;
    }

    private showWelcomeMessage(): void {
        const config = workspace.getConfiguration('vscode-scp');
        const showWelcome = config.get('showWelcomeMessage', true);

        if (showWelcome) {
            window.showInformationMessage(
                'VSCode SCP Extension is now active! Use the command palette to configure servers.',
                'Configure Now',
                'Don\'t Show Again'
            ).then((choice) => {
                if (choice === 'Configure Now') {
                    this.createConfigurationCommand();
                } else if (choice === 'Don\'t Show Again') {
                    config.update('showWelcomeMessage', false, true);
                }
            });
        }
    }

    deactivate(): void {
        this.connectionManager.closeAllConnections();
        this.disposables.forEach(disposable => disposable.dispose());
        this.logger.dispose();
        this.statusBarController.dispose();
    }
}

let extensionInstance: VSCodeSCPExtension;

export function activate(context: ExtensionContext) {
    extensionInstance = VSCodeSCPExtension.getInstance(context);
    extensionInstance.activate();
}

export function deactivate() {
    if (extensionInstance) {
        extensionInstance.deactivate();
    }
}