import { ExtensionContext, window, TreeDataProvider, TreeItem, TreeItemCollapsibleState, commands, Event, EventEmitter } from 'vscode';
import { SCPConfig, ServerConfig } from '../types';
import { ConfigManager } from '../core/ConfigManager';
import { CredentialManager } from '../security/CredentialManager';
import { Logger } from '../utils/Logger';

export class ServerConfigItem extends TreeItem {
    constructor(
        public readonly config: ServerConfig,
        public readonly collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.None
    ) {
        super(config.name);
        this.tooltip = `${config.name} (${config.host}:${config.port})`;
        this.contextValue = config.id;
        this.description = `User: ${config.user}`;
        
        this.iconPath = new ThemeIcon('server');
    }
}

export class RemoteFileItem extends TreeItem {
    constructor(
        public readonly fileName: string,
        public readonly remotePath: string,
        public readonly collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.None
    ) {
        super(fileName);
        this.tooltip = `${fileName} → ${remotePath}`;
        this.contextValue = 'file';
        this.iconPath = new ThemeIcon('file');
    }
}

export class RemoteFolderItem extends TreeItem {
    constructor(
        public readonly folderName: string,
        public readonly remotePath: string,
        public readonly collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.Expanded
    ) {
        super(folderName);
        this.tooltip = folderName;
        this.contextValue = 'folder';
        this.iconPath = new ThemeIcon('folder');
    }
}

export class VisualConfigManagerProvider implements TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData: EventEmitter<TreeItem | undefined | null | void> = new EventEmitter<TreeItem | undefined | null>();
    readonly onDidChangeTreeData: Event<TreeItem | undefined | null> = this._onDidChangeTreeData.event;
    
    private configs: ServerConfig[] = [];
    private logger: Logger;
    private configManager: ConfigManager;

    constructor(logger: Logger, configManager: ConfigManager) {
        this.logger = logger;
        this.configManager = configManager;
    }

    getTreeItem(element?: TreeItem): TreeItem {
        if (!element) {
            return new TreeItem('Remote Servers', TreeItemCollapsibleState.Expanded);
        }

        if (element instanceof ServerConfigItem) {
            return this.createServerItemChildren(element.config);
        }

        if (element instanceof RemoteFolderItem) {
            return this.createFolderChildren(element);
        }

        return element;
    }

    private createServerItemChildren(config: ServerConfig): TreeItem[] {
        const items: TreeItem[] = [];
        
        // Connection status item
        const statusItem = new TreeItem('Status: Connecting...', TreeItemCollapsibleState.None);
        statusItem.contextValue = 'status';
        statusItem.iconPath = new ThemeIcon('sync');
        statusItem.description = 'Checking connection...';
        items.push(statusItem);

        // File browser item
        const browserItem = new TreeItem('📁 Browse Files', TreeItemCollapsibleState.None);
        browserItem.contextValue = 'browser';
        browserItem.iconPath = new ThemeIcon('folder-opened');
        browserItem.command = {
            command: 'vscode-scp.browseRemoteFiles',
            title: 'Browse Remote Files',
            arguments: [config]
        };
        items.push(browserItem);

        // Quick actions
        const actionsItem = new TreeItem('⚡ Actions', TreeItemCollapsibleState.None);
        actionsItem.contextValue = 'actions';
        actionsItem.iconPath = new ThemeIcon('gear');
        items.push(actionsItem);

        // Configuration item
        const configItem = new ServerConfigItem(config);
        items.push(configItem);

        return items;
    }

    private createFolderChildren(folder: RemoteFolderItem): TreeItem[] {
        const items: TreeItem[] = [];
        
        // Add a back button
        const backButton = new TreeItem('⬅ Back', TreeItemCollapsibleState.None);
        backButton.contextValue = 'back';
        backButton.command = {
            command: 'vscode-scp.refreshConfigTree',
            title: 'Back to Servers'
        };
        items.push(backButton);

        // Add sample files
        const sampleFiles = [
            { name: 'index.html', path: '/index.html', type: 'file' },
            { name: 'README.md', path: '/README.md', type: 'file' },
            { name: 'css', path: '/css', type: 'file' },
            { name: 'js', path: '/js', type: 'file' },
            { name: 'images', path: '/images', type: 'folder' }
        ];

        for (const file of sampleFiles) {
            if (file.type === 'folder') {
                const folderItem = new RemoteFolderItem(
                    file.name,
                    `${folder.remotePath}/${file.path}`,
                    TreeItemCollapsibleState.Collapsed
                );
                folderItem.command = {
                    command: 'vscode-scp.browseRemoteFolder',
                    arguments: [folder]
                };
                items.push(folderItem);
            } else {
                const fileItem = new RemoteFileItem(
                    file.name,
                    `${folder.remotePath}/${file.path}`
                );
                items.push(fileItem);
            }
        }

        return items;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getChildren(element?: TreeItem): Thenable<TreeItem[]> {
        if (!element) {
            return this.loadConfigs();
        }

        if (element instanceof ServerConfigItem) {
            return Promise.resolve(this.createServerItemChildren(element.config));
        }

        if (element instanceof RemoteFolderItem) {
            return Promise.resolve(this.createFolderChildren(element));
        }

        return Promise.resolve([]);
    }

    private async loadConfigs(): Promise<TreeItem[]> {
        try {
            const config = await this.configManager.loadConfig();
            if (config) {
                this.configs = [{
                    ...config,
                    id: this.generateServerId(config),
                    name: config.host
                }];
            } else {
                this.configs = [];
            }
        } catch (error) {
            this.logger.error('Failed to load configs', error as Error);
            this.configs = [];
        }

        return this.configs.map(config => new ServerConfigItem(config));
    }

    private generateServerId(config: SCPConfig): string {
        return `${config.user}@${config.host}:${config.port}`;
    }
}

export class VisualConfigManager {
    private static instance: VisualConfigManager;
    private provider: VisualConfigManagerProvider;
    private logger: Logger;
    private configManager: ConfigManager;
    private context: ExtensionContext;

    private constructor(
        context: ExtensionContext,
        logger: Logger,
        configManager: ConfigManager
    ) {
        this.context = context;
        this.logger = logger;
        this.configManager = configManager;
        this.provider = new VisualConfigManagerProvider(logger, configManager);
    }

    static getInstance(
        context: ExtensionContext,
        logger: Logger,
        configManager: ConfigManager
    ): VisualConfigManager {
        if (!VisualConfigManager.instance) {
            VisualConfigManager.instance = new VisualConfigManager(context, logger, configManager);
        }
        return VisualConfigManager.instance;
    }

    activate(context: ExtensionContext): void {
        window.registerTreeDataProvider('vscode-scp-config', this.provider);
        
        commands.registerCommand('vscode-scp.refreshConfigTree', () => {
            this.provider.refresh();
        });

        commands.registerCommand('vscode-scp.browseRemoteFiles', async (config: ServerConfig) => {
            this.browseRemoteFiles(config);
        });

        commands.registerCommand('vscode-scp.browseRemoteFolder', async (folder: RemoteFolderItem) => {
            this.browseRemoteFolder(folder);
        });

        commands.registerCommand('vscode-scp.addServer', async () => {
            await this.addNewServer();
        });

        commands.registerCommand('vscode-scp.editServer', async (config: ServerConfigItem) => {
            await this.editServerConfig(config);
        });

        commands.registerCommand('vscode-scp.deleteServer', async (config: ServerConfigItem) => {
            await this.deleteServerConfig(config);
        });

        commands.registerCommand('vscode-scp.testConnection', async (config: ServerConfigItem) => {
            await this.testServerConnection(config);
        });

        this.provider.refresh();
    }

    private async browseRemoteFiles(config: ServerConfig): Promise<void> {
        window.showInformationMessage(`Browsing remote files for ${config.name}...`);
    }

    private async browseRemoteFolder(folder: RemoteFolderItem): Promise<void> {
        window.showInformationMessage(`Browsing folder: ${folder.folderName}`);
    }

    private async addNewServer(): Promise<void> {
        const host = await window.showInputBox({
            prompt: 'Enter server host or IP address',
            validateInput: (value) => {
                if (!value) return 'Server host is required';
                return null;
            }
        });

        if (!host) return;

        const user = await window.showInputBox({
            prompt: 'Enter username',
            validateInput: (value) => {
                if (!value) return 'Username is required';
                return null;
            }
        });

        if (!user) return;

        const remotePath = await window.showInputBox({
            prompt: 'Enter remote path',
            value: '/var/www',
            validateInput: (value) => {
                if (!value) return 'Remote path is required';
                return null;
            }
        });

        if (!remotePath) return;

        const port = parseInt(await window.showInputBox({
            prompt: 'Enter SSH port',
            value: '22',
            validateInput: (value) => {
                const port = parseInt(value);
                if (isNaN(port) || port < 1 || port > 65535) {
                    return 'Port must be between 1 and 65535';
                }
                return null;
            }
        }) || 22;

        const uploadOnSave = await window.showQuickPick([
            { label: 'Yes', value: true },
            { label: 'No', value: false }
        ], {
            placeHolder: 'Upload files on save?'
        });

        if (uploadOnSave === undefined) return;

        const newConfig: SCPConfig = {
            host,
            user,
            remotePath,
            port,
            uploadOnSave: uploadOnSave.value,
            ignore: ['.git', '.vscode', 'node_modules'],
            syncMode: 'upload'
        };

        const success = await this.configManager.saveConfig(newConfig);
        if (success) {
            window.showInformationMessage('Server configuration added successfully');
            this.provider.refresh();
        } else {
            window.showErrorMessage('Failed to save server configuration');
        }
    }

    private async editServerConfig(configItem: ServerConfigItem): Promise<void> {
        const config: SCPConfig = await this.configManager.loadConfig();
        if (!config || !this.isCurrentConfig(config, configItem.config)) {
            window.showErrorMessage('Configuration not found or mismatch');
            return;
        }

        const updatedConfig = await this.promptForConfigUpdate(config);
        if (updatedConfig) {
            const success = await this.configManager.saveConfig(updatedConfig);
            if (success) {
                window.showInformationMessage('Server configuration updated successfully');
                this.provider.refresh();
            } else {
                window.showErrorMessage('Failed to update server configuration');
            }
        }
    }

    private async deleteServerConfig(configItem: ServerConfigItem): Promise<void> {
        const confirm = await window.showWarningMessage(
            `Are you sure you want to delete server ${configItem.config.name}?`,
            'Delete', 'Cancel'
        );

        if (confirm === 'Delete') {
            // TODO: Implement server deletion logic
            window.showInformationMessage('Server deletion not yet implemented');
        }
    }

    private async testServerConnection(configItem: ServerConfigItem): Promise<void> {
        window.withProgress({
            location: 15,
            title: `Testing connection to ${configItem.config.name}...`
        }, async () => {
            try {
                // TODO: Implement connection testing logic
                window.showInformationMessage(`Connection test to ${configItem.config.name} not yet implemented`);
            } catch (error) {
                this.logger.error('Connection test failed', error as Error);
                window.showErrorMessage(`Connection test failed: ${(error as Error).message}`);
            }
        });
    }

    private isCurrentConfig(config: SCPConfig, targetConfig: ServerConfig): boolean {
        return config.host === targetConfig.host &&
               config.port === targetConfig.port &&
               config.user === targetConfig.user &&
               config.remotePath === targetConfig.remotePath;
    }

    private async promptForConfigUpdate(config: SCPConfig): Promise<SCPConfig | undefined> {
        const updatedConfig: any = {};

        // Simple implementation for now - in a real scenario, this would show a proper UI
        const host = await window.showInputBox({
            prompt: 'Server host',
            value: config.host,
            validateInput: (value) => !value ? 'Host is required' : null
        });

        if (host === undefined) return undefined;

        updatedConfig.host = host;

        const user = await window.showInputBox({
            prompt: 'Username',
            value: config.user,
            validateInput: (value) => !value ? 'Username is required' : null
        });

        if (user === undefined) return undefined;

        updatedConfig.user = user;

        const remotePath = await window.showInputBox({
            prompt: 'Remote path',
            value: config.remotePath,
            validateInput: (value) => !value ? 'Remote path is required' : null
        });

        if (remotePath === undefined) return undefined;

        updatedConfig.remotePath = remotePath;

        return updatedConfig;
    }

    getProvider(): TreeDataProvider<TreeItem> {
        return this.provider;
    }

    refresh(): void {
        this.provider.refresh();
    }
}