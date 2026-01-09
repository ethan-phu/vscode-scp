"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VSCodeSCPExtension = void 0;
exports.activate = activate;
exports.deactivate = deactivate;
const vscode_1 = require("vscode");
const Logger_1 = require("./utils/Logger");
const ConfigManager_1 = require("./core/ConfigManager");
const CredentialManager_1 = require("./security/CredentialManager");
const FileSyncManager_1 = require("./core/FileSyncManager");
const StatusBarController_1 = require("./ui/StatusBarController");
const ConfigurationPanel_1 = require("./ui/ConfigurationPanel");
const VisualConfigManager_1 = require("./ui/VisualConfigManager");
class VSCodeSCPExtension {
    constructor(context) {
        this.disposables = [];
        this.context = context;
    }
    static getInstance(context) {
        if (!VSCodeSCPExtension.instance) {
            VSCodeSCPExtension.instance = new VSCodeSCPExtension(context);
        }
        return VSCodeSCPExtension.instance;
    }
    async activate() {
        this.initializeManagers();
        this.visualConfigManager = VisualConfigManager_1.VisualConfigManager.getInstance(this.context, this.logger, this.configManager);
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
exports.VSCodeSCPExtension = VSCodeSCPExtension;
initializeManagers();
void {
    this: .logger = Logger_1.Logger.getInstance(this.context),
    this: .configManager = ConfigManager_1.ConfigManager.getInstance(this.context, this.logger),
    this: .credentialManager = CredentialManager_1.CredentialManager.getInstance(this.context),
    this: .connectionManager = ConnectionManager.getInstance(this.logger),
    this: .fileSyncManager = FileSyncManager_1.FileSyncManager.getInstance(this.logger, this.connectionManager, this.credentialManager),
    this: .statusBarController = StatusBarController_1.StatusBarController.getInstance(this.logger),
    this: .configurationPanel = ConfigurationPanel_1.ConfigurationPanel.getInstance(this.context, this.logger, this.configManager, this.credentialManager),
    this: .visualConfigManager = VisualConfigManager_1.VisualConfigManager.getInstance(this.context, this.logger, this.configManager)
};
registerCommands();
void {
    const: commandList = [
        vscode_1.commands.registerCommand('vscode-scp.config', this.createConfigurationCommand),
        vscode_1.commands.registerCommand('vscode-scp.local2remote', this.syncAllCommand),
        vscode_1.commands.registerCommand('vscode-scp.testConnection', this.testConnectionCommand),
        vscode_1.commands.registerCommand('vscode-scp.showLogs', this.showLogsCommand),
        vscode_1.commands.registerCommand('vscode-scp.downloadFile', this.downloadFileCommand),
        vscode_1.commands.registerCommand('vscode-scp.uploadFile', this.uploadFileCommand),
        vscode_1.commands.registerCommand('vscode-scp.toggleSync', this.toggleSyncCommand),
        vscode_1.commands.registerCommand('vscode-scp.showStatus', this.showStatusCommand)
    ],
    commandList, : .forEach((command) => {
        this.disposables.push(command);
        this.context.subscriptions.push(command);
    })
};
registerEventListeners();
void {
    const: fileSaveWatcher = vscode_1.workspace.onDidSaveTextDocument((event) => this.fileSyncManager.syncFileOnSave(event)),
    this: .disposables.push(fileSaveWatcher),
    this: .context.subscriptions.push(fileSaveWatcher),
    const: fileDeleteWatcher = vscode_1.workspace.onDidDeleteFiles((event) => this.fileSyncManager.syncFilesOnDelete(event)),
    this: .disposables.push(fileDeleteWatcher),
    this: .context.subscriptions.push(fileDeleteWatcher),
    const: configChangeWatcher = vscode_1.workspace.onDidChangeConfiguration(() => {
        this.fileSyncManager.onConfigurationChanged();
        this.loadConfiguration();
    }),
    this: .disposables.push(configChangeWatcher),
    this: .context.subscriptions.push(configChangeWatcher)
};
async;
loadConfiguration();
Promise < void  > {
    try: {
        const: config = await this.configManager.loadConfig(),
        this: .fileSyncManager.setConfiguration(config),
        if(config) {
            const connectionValid = await this.testConnectionSilent();
            this.statusBarController.updateConnectionStatus(connectionValid, config.host);
        }, else: {
            this: .statusBarController.updateConnectionStatus(false)
        }
    }, catch(error) {
        this.logger.error('Failed to load configuration', error);
        this.statusBarController.showError('Configuration load failed');
    }
};
createConfigurationCommand = () => {
    this.configurationPanel.showConfigurationMenu();
};
syncAllCommand = async () => {
    if (this.fileSyncManager.isSyncInProgress()) {
        vscode_1.window.showInformationMessage('Sync already in progress');
        return;
    }
    this.statusBarController.updateSyncStatus(true);
    try {
        const success = await this.fileSyncManager.syncAllFiles();
        if (success) {
            this.statusBarController.updateLastSyncTime();
            vscode_1.window.showInformationMessage('All files synced successfully');
        }
    }
    finally {
        this.statusBarController.updateSyncStatus(false);
    }
};
testConnectionCommand = async () => {
    vscode_1.window.withProgress({
        location: 15,
        title: 'Testing connection'
    }, async () => {
        const isConnected = await this.fileSyncManager.testConnection();
        const config = await this.configManager.loadConfig();
        this.statusBarController.updateConnectionStatus(isConnected, config?.host);
        if (isConnected) {
            vscode_1.window.showInformationMessage('Connection test successful');
        }
        else {
            vscode_1.window.showErrorMessage('Connection test failed');
        }
    });
};
showLogsCommand = () => {
    this.logger.show();
};
downloadFileCommand = async () => {
    const remotePath = await vscode_1.window.showInputBox({
        prompt: 'Enter remote file path to download',
        placeHolder: '/remote/path/to/file.txt'
    });
    if (!remotePath) {
        return;
    }
    const result = await this.fileSyncManager.downloadFile(remotePath);
    if (result.success) {
        vscode_1.window.showInformationMessage(`Downloaded ${remotePath}`);
    }
    else {
        vscode_1.window.showErrorMessage(`Download failed: ${result.error}`);
    }
};
uploadFileCommand = async () => {
    const fileUri = await vscode_1.window.showOpenDialog({
        canSelectMany: false,
        title: 'Select file to upload'
    });
    if (!fileUri || fileUri.length === 0) {
        return;
    }
    const config = await this.configManager.loadConfig();
    if (!config) {
        vscode_1.window.showErrorMessage('No configuration found');
        return;
    }
    const remotePath = await vscode_1.window.showInputBox({
        prompt: 'Enter remote destination path',
        value: `${config.remotePath}/${fileUri[0].path.split('/').pop()}`
    });
    if (!remotePath) {
        return;
    }
    const connectionInfo = await this.credentialManager.getConnectionInfo({
        ...config,
        id: this.generateServerId(config),
        name: config.host
    });
    const result = await this.connectionManager.uploadFile(connectionInfo, fileUri[0].fsPath, remotePath);
    if (result.success) {
        vscode_1.window.showInformationMessage(`Uploaded to ${remotePath}`);
    }
    else {
        vscode_1.window.showErrorMessage(`Upload failed: ${result.error}`);
    }
};
toggleSyncCommand = async () => {
    const config = await this.configManager.loadConfig();
    if (!config) {
        vscode_1.window.showErrorMessage('No configuration found');
        return;
    }
    const newUploadOnSave = !config.uploadOnSave;
    const updatedConfig = { ...config, uploadOnSave: newUploadOnSave };
    const success = await this.configManager.saveConfig(updatedConfig);
    if (success) {
        this.fileSyncManager.setConfiguration(updatedConfig);
        const status = newUploadOnSave ? 'enabled' : 'disabled';
        vscode_1.window.showInformationMessage(`Upload on save ${status}`);
    }
};
showStatusCommand = async () => {
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
    vscode_1.window.showInformationMessage(statusMessage, 'OK');
};
async;
testConnectionSilent();
Promise < boolean > {
    try: {
        return: await this.fileSyncManager.testConnection()
    }, catch: {
        return: false
    }
};
generateServerId(config, types_1.SCPConfig);
string;
{
    return `${config.user}@${config.host}:${config.port}`;
}
showWelcomeMessage();
void {
    const: config = vscode_1.workspace.getConfiguration('vscode-scp'),
    const: showWelcome = config.get('showWelcomeMessage', true),
    if(showWelcome) {
        vscode_1.window.showInformationMessage('VSCode SCP Extension is now active! Use the command palette to configure servers.', 'Configure Now', 'Don\'t Show Again').then((choice) => {
            if (choice === 'Configure Now') {
                this.createConfigurationCommand();
            }
            else if (choice === 'Don\'t Show Again') {
                config.update('showWelcomeMessage', false, true);
            }
        });
    }
};
deactivate();
void {
    this: .connectionManager.closeAllConnections(),
    this: .disposables.forEach(disposable => disposable.dispose()),
    this: .logger.dispose(),
    this: .statusBarController.dispose()
};
let extensionInstance;
function activate(context) {
    extensionInstance = VSCodeSCPExtension.getInstance(context);
    extensionInstance.activate();
}
function deactivate() {
    if (extensionInstance) {
        extensionInstance.deactivate();
    }
}
//# sourceMappingURL=extension.js.map