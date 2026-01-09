"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisualConfigManager = exports.VisualConfigManagerProvider = exports.RemoteFolderItem = exports.RemoteFileItem = exports.ServerConfigItem = void 0;
const vscode_1 = require("vscode");
class ServerConfigItem extends vscode_1.TreeItem {
    constructor(config, collapsibleState = vscode_1.TreeItemCollapsibleState.None) {
        super(config.name);
        this.config = config;
        this.collapsibleState = collapsibleState;
        this.tooltip = `${config.name} (${config.host}:${config.port})`;
        this.contextValue = config.id;
        this.description = `User: ${config.user}`;
        this.iconPath = new ThemeIcon('server');
    }
}
exports.ServerConfigItem = ServerConfigItem;
class RemoteFileItem extends vscode_1.TreeItem {
    constructor(fileName, remotePath, collapsibleState = vscode_1.TreeItemCollapsibleState.None) {
        super(fileName);
        this.fileName = fileName;
        this.remotePath = remotePath;
        this.collapsibleState = collapsibleState;
        this.tooltip = `${fileName} → ${remotePath}`;
        this.contextValue = 'file';
        this.iconPath = new ThemeIcon('file');
    }
}
exports.RemoteFileItem = RemoteFileItem;
class RemoteFolderItem extends vscode_1.TreeItem {
    constructor(folderName, remotePath, collapsibleState = vscode_1.TreeItemCollapsibleState.Expanded) {
        super(folderName);
        this.folderName = folderName;
        this.remotePath = remotePath;
        this.collapsibleState = collapsibleState;
        this.tooltip = folderName;
        this.contextValue = 'folder';
        this.iconPath = new ThemeIcon('folder');
    }
}
exports.RemoteFolderItem = RemoteFolderItem;
class VisualConfigManagerProvider {
    constructor(logger, configManager) {
        this._onDidChangeTreeData = new vscode_1.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.configs = [];
        this.logger = logger;
        this.configManager = configManager;
    }
    getTreeItem(element) {
        if (!element) {
            return new vscode_1.TreeItem('Remote Servers', vscode_1.TreeItemCollapsibleState.Expanded);
        }
        if (element instanceof ServerConfigItem) {
            return this.createServerItemChildren(element.config);
        }
        if (element instanceof RemoteFolderItem) {
            return this.createFolderChildren(element);
        }
        return element;
    }
    createServerItemChildren(config) {
        const items = [];
        // Connection status item
        const statusItem = new vscode_1.TreeItem('Status: Connecting...', vscode_1.TreeItemCollapsibleState.None);
        statusItem.contextValue = 'status';
        statusItem.iconPath = new ThemeIcon('sync');
        statusItem.description = 'Checking connection...';
        items.push(statusItem);
        // File browser item
        const browserItem = new vscode_1.TreeItem('📁 Browse Files', vscode_1.TreeItemCollapsibleState.None);
        browserItem.contextValue = 'browser';
        browserItem.iconPath = new ThemeIcon('folder-opened');
        browserItem.command = {
            command: 'vscode-scp.browseRemoteFiles',
            title: 'Browse Remote Files',
            arguments: [config]
        };
        items.push(browserItem);
        // Quick actions
        const actionsItem = new vscode_1.TreeItem('⚡ Actions', vscode_1.TreeItemCollapsibleState.None);
        actionsItem.contextValue = 'actions';
        actionsItem.iconPath = new ThemeIcon('gear');
        items.push(actionsItem);
        // Configuration item
        const configItem = new ServerConfigItem(config);
        items.push(configItem);
        return items;
    }
    createFolderChildren(folder) {
        const items = [];
        // Add a back button
        const backButton = new vscode_1.TreeItem('⬅ Back', vscode_1.TreeItemCollapsibleState.None);
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
                const folderItem = new RemoteFolderItem(file.name, `${folder.remotePath}/${file.path}`, vscode_1.TreeItemCollapsibleState.Collapsed);
                folderItem.command = {
                    command: 'vscode-scp.browseRemoteFolder',
                    arguments: [folder]
                };
                items.push(folderItem);
            }
            else {
                const fileItem = new RemoteFileItem(file.name, `${folder.remotePath}/${file.path}`);
                items.push(fileItem);
            }
        }
        return items;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getChildren(element) {
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
    async loadConfigs() {
        try {
            const config = await this.configManager.loadConfig();
            if (config) {
                this.configs = [{
                        ...config,
                        id: this.generateServerId(config),
                        name: config.host
                    }];
            }
            else {
                this.configs = [];
            }
        }
        catch (error) {
            this.logger.error('Failed to load configs', error);
            this.configs = [];
        }
        return this.configs.map(config => new ServerConfigItem(config));
    }
    generateServerId(config) {
        return `${config.user}@${config.host}:${config.port}`;
    }
}
exports.VisualConfigManagerProvider = VisualConfigManagerProvider;
class VisualConfigManager {
    constructor(context, logger, configManager) {
        this.context = context;
        this.logger = logger;
        this.configManager = configManager;
        this.provider = new VisualConfigManagerProvider(logger, configManager);
    }
    static getInstance(context, logger, configManager) {
        if (!VisualConfigManager.instance) {
            VisualConfigManager.instance = new VisualConfigManager(context, logger, configManager);
        }
        return VisualConfigManager.instance;
    }
    activate(context) {
        vscode_1.window.registerTreeDataProvider('vscode-scp-config', this.provider);
        vscode_1.commands.registerCommand('vscode-scp.refreshConfigTree', () => {
            this.provider.refresh();
        });
        vscode_1.commands.registerCommand('vscode-scp.browseRemoteFiles', async (config) => {
            this.browseRemoteFiles(config);
        });
        vscode_1.commands.registerCommand('vscode-scp.browseRemoteFolder', async (folder) => {
            this.browseRemoteFolder(folder);
        });
        vscode_1.commands.registerCommand('vscode-scp.addServer', async () => {
            await this.addNewServer();
        });
        vscode_1.commands.registerCommand('vscode-scp.editServer', async (config) => {
            await this.editServerConfig(config);
        });
        vscode_1.commands.registerCommand('vscode-scp.deleteServer', async (config) => {
            await this.deleteServerConfig(config);
        });
        vscode_1.commands.registerCommand('vscode-scp.testConnection', async (config) => {
            await this.testServerConnection(config);
        });
        this.provider.refresh();
    }
    async browseRemoteFiles(config) {
        vscode_1.window.showInformationMessage(`Browsing remote files for ${config.name}...`);
    }
    async browseRemoteFolder(folder) {
        vscode_1.window.showInformationMessage(`Browsing folder: ${folder.folderName}`);
    }
    async addNewServer() {
        const host = await vscode_1.window.showInputBox({
            prompt: 'Enter server host or IP address',
            validateInput: (value) => {
                if (!value)
                    return 'Server host is required';
                return null;
            }
        });
        if (!host)
            return;
        const user = await vscode_1.window.showInputBox({
            prompt: 'Enter username',
            validateInput: (value) => {
                if (!value)
                    return 'Username is required';
                return null;
            }
        });
        if (!user)
            return;
        const remotePath = await vscode_1.window.showInputBox({
            prompt: 'Enter remote path',
            value: '/var/www',
            validateInput: (value) => {
                if (!value)
                    return 'Remote path is required';
                return null;
            }
        });
        if (!remotePath)
            return;
        const port = parseInt(await vscode_1.window.showInputBox({
            prompt: 'Enter SSH port',
            value: '22',
            validateInput: (value) => {
                const port = parseInt(value);
                if (isNaN(port) || port < 1 || port > 65535) {
                    return 'Port must be between 1 and 65535';
                }
                return null;
            }
        }) || 22);
        const uploadOnSave = await vscode_1.window.showQuickPick([
            { label: 'Yes', value: true },
            { label: 'No', value: false }
        ], {
            placeHolder: 'Upload files on save?'
        });
        if (uploadOnSave === undefined)
            return;
        const newConfig = {
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
            vscode_1.window.showInformationMessage('Server configuration added successfully');
            this.provider.refresh();
        }
        else {
            vscode_1.window.showErrorMessage('Failed to save server configuration');
        }
    }
    async editServerConfig(configItem) {
        const config = await this.configManager.loadConfig();
        if (!config || !this.isCurrentConfig(config, configItem.config)) {
            vscode_1.window.showErrorMessage('Configuration not found or mismatch');
            return;
        }
        const updatedConfig = await this.promptForConfigUpdate(config);
        if (updatedConfig) {
            const success = await this.configManager.saveConfig(updatedConfig);
            if (success) {
                vscode_1.window.showInformationMessage('Server configuration updated successfully');
                this.provider.refresh();
            }
            else {
                vscode_1.window.showErrorMessage('Failed to update server configuration');
            }
        }
    }
    async deleteServerConfig(configItem) {
        const confirm = await vscode_1.window.showWarningMessage(`Are you sure you want to delete server ${configItem.config.name}?`, 'Delete', 'Cancel');
        if (confirm === 'Delete') {
            // TODO: Implement server deletion logic
            vscode_1.window.showInformationMessage('Server deletion not yet implemented');
        }
    }
    async testServerConnection(configItem) {
        vscode_1.window.withProgress({
            location: 15,
            title: `Testing connection to ${configItem.config.name}...`
        }, async () => {
            try {
                // TODO: Implement connection testing logic
                vscode_1.window.showInformationMessage(`Connection test to ${configItem.config.name} not yet implemented`);
            }
            catch (error) {
                this.logger.error('Connection test failed', error);
                vscode_1.window.showErrorMessage(`Connection test failed: ${error.message}`);
            }
        });
    }
    isCurrentConfig(config, targetConfig) {
        return config.host === targetConfig.host &&
            config.port === targetConfig.port &&
            config.user === targetConfig.user &&
            config.remotePath === targetConfig.remotePath;
    }
    async promptForConfigUpdate(config) {
        const updatedConfig = {};
        // Simple implementation for now - in a real scenario, this would show a proper UI
        const host = await vscode_1.window.showInputBox({
            prompt: 'Server host',
            value: config.host,
            validateInput: (value) => !value ? 'Host is required' : null
        });
        if (host === undefined)
            return undefined;
        updatedConfig.host = host;
        const user = await vscode_1.window.showInputBox({
            prompt: 'Username',
            value: config.user,
            validateInput: (value) => !value ? 'Username is required' : null
        });
        if (user === undefined)
            return undefined;
        updatedConfig.user = user;
        const remotePath = await vscode_1.window.showInputBox({
            prompt: 'Remote path',
            value: config.remotePath,
            validateInput: (value) => !value ? 'Remote path is required' : null
        });
        if (remotePath === undefined)
            return undefined;
        updatedConfig.remotePath = remotePath;
        return updatedConfig;
    }
    getProvider() {
        return this.provider;
    }
    refresh() {
        this.provider.refresh();
    }
}
exports.VisualConfigManager = VisualConfigManager;
//# sourceMappingURL=VisualConfigManager.js.map