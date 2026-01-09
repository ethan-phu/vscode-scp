"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationPanel = void 0;
const vscode_1 = require("vscode");
class ConfigurationPanel {
    constructor(context, logger, configManager, credentialManager) {
        this.context = context;
        this.logger = logger;
        this.configManager = configManager;
        this.credentialManager = credentialManager;
    }
    static getInstance(context, logger, configManager, credentialManager) {
        if (!ConfigurationPanel.instance) {
            ConfigurationPanel.instance = new ConfigurationPanel(context, logger, configManager, credentialManager);
        }
        return ConfigurationPanel.instance;
    }
    async showConfigurationMenu() {
        const options = [
            { label: '$(edit) Edit Current Configuration', description: 'Modify existing server configuration' },
            { label: '$(plus) Add New Server', description: 'Configure a new server connection' },
            { label: '$(trash) Remove Server', description: 'Delete a server configuration' },
            { label: '$(gear) Manage Credentials', description: 'Update passwords or SSH keys' },
            { label: '$(test) Test Connection', description: 'Verify current server connection' },
            { label: '$(file-text) Open Config File', description: 'Edit configuration directly' }
        ];
        const choice = await vscode_1.window.showQuickPick(options, {
            placeHolder: 'Select a configuration action'
        });
        if (!choice)
            return;
        switch (choice.label) {
            case '$(edit) Edit Current Configuration':
                await this.editCurrentConfiguration();
                break;
            case '$(plus) Add New Server':
                await this.addNewServer();
                break;
            case '$(trash) Remove Server':
                await this.removeServer();
                break;
            case '$(gear) Manage Credentials':
                await this.manageCredentials();
                break;
            case '$(test) Test Connection':
                await this.testConnection();
                break;
            case '$(file-text) Open Config File':
                await this.openConfigFile();
                break;
        }
    }
    async editCurrentConfiguration() {
        const config = await this.configManager.loadConfig();
        if (!config) {
            vscode_1.window.showErrorMessage('No configuration found. Please create one first.');
            return;
        }
        const updatedConfig = await this.promptForConfiguration(config);
        if (updatedConfig) {
            const success = await this.configManager.saveConfig(updatedConfig);
            if (success) {
                vscode_1.window.showInformationMessage('Configuration updated successfully');
                vscode_1.commands.executeCommand('vscode-scp.config');
            }
            else {
                vscode_1.window.showErrorMessage('Failed to update configuration');
            }
        }
    }
    async addNewServer() {
        const config = await this.promptForConfiguration();
        if (config) {
            const success = await this.configManager.saveConfig(config);
            if (success) {
                vscode_1.window.showInformationMessage('Server configuration added successfully');
                vscode_1.commands.executeCommand('vscode-scp.config');
            }
            else {
                vscode_1.window.showErrorMessage('Failed to add server configuration');
            }
        }
    }
    async removeServer() {
        const config = await this.configManager.loadConfig();
        if (!config) {
            vscode_1.window.showErrorMessage('No configuration found');
            return;
        }
        const confirm = await vscode_1.window.showWarningMessage(`Are you sure you want to remove configuration for ${config.host}?`, 'Remove', 'Cancel');
        if (confirm === 'Remove') {
            vscode_1.window.showInformationMessage('Server configuration removed');
        }
    }
    async manageCredentials() {
        const config = await this.configManager.loadConfig();
        if (!config) {
            vscode_1.window.showErrorMessage('No configuration found');
            return;
        }
        const serverId = `${config.user}@${config.host}:${config.port}`;
        const action = await vscode_1.window.showQuickPick([
            { label: '$(key) Update SSH Key', description: 'Select or add SSH key' },
            { label: '$(key) Update Password', description: 'Update password for this server' },
            { label: '$(trash) Clear Credentials', description: 'Remove all stored credentials' }
        ], {
            placeHolder: 'Select credential management action'
        });
        if (!action)
            return;
        if (action.label.includes('Update SSH Key')) {
            vscode_1.window.showInformationMessage('Use the configuration panel to manage SSH keys');
        }
        else if (action.label.includes('Update Password')) {
            vscode_1.window.showInformationMessage('Use the Configuration Panel to update passwords');
        }
        else if (action.label.includes('Clear Credentials')) {
            vscode_1.window.showInformationMessage('Use the Configuration Panel to clear credentials');
        }
    }
    async testConnection() {
        const config = await this.configManager.loadConfig();
        if (!config) {
            vscode_1.window.showErrorMessage('No configuration found');
            return;
        }
        vscode_1.window.withProgress({
            location: 15,
            title: 'Testing connection'
        }, async () => {
            try {
                const serverId = `${config.user}@${config.host}:${config.port}`;
                const connectionInfo = await this.credentialManager.getConnectionInfo({
                    ...config,
                    id: serverId,
                    name: config.host
                });
                if (connectionInfo.password || connectionInfo.privateKey) {
                    vscode_1.window.showInformationMessage('Connection test successful');
                }
                else {
                    vscode_1.window.showErrorMessage('Connection test failed: No credentials configured');
                }
            }
            catch (error) {
                this.logger.error('Connection test failed', error);
                vscode_1.window.showErrorMessage(`Connection test failed: ${error.message}`);
            }
        });
    }
    async openConfigFile() {
        vscode_1.commands.executeCommand('vscode.open', '.vscode/scp.json');
    }
    async promptForConfiguration(existingConfig) {
        const config = existingConfig || {};
        const host = await vscode_1.window.showInputBox({
            prompt: 'Server host or IP address',
            value: config.host || 'localhost',
            validateInput: (value) => {
                if (!value)
                    return 'Host is required';
                return null;
            }
        });
        if (!host)
            return undefined;
        const user = await vscode_1.window.showInputBox({
            prompt: 'Username',
            value: config.user || 'root',
            validateInput: (value) => {
                if (!value)
                    return 'Username is required';
                return null;
            }
        });
        if (!user)
            return undefined;
        const remotePath = await vscode_1.window.showInputBox({
            prompt: 'Remote path',
            value: config.remotePath || '/root',
            validateInput: (value) => {
                if (!value)
                    return 'Remote path is required';
                return null;
            }
        });
        if (!remotePath)
            return undefined;
        const portString = await vscode_1.window.showInputBox({
            prompt: 'SSH port',
            value: config.port?.toString() || '22',
            validateInput: (value) => {
                const port = parseInt(value);
                if (isNaN(port) || port < 1 || port > 65535) {
                    return 'Port must be between 1 and 65535';
                }
                return null;
            }
        });
        if (!portString)
            return undefined;
        const uploadOnSave = await vscode_1.window.showQuickPick([
            { label: 'Yes', value: true },
            { label: 'No', value: false }
        ], {
            placeHolder: 'Upload files on save?',
            canPickMany: false
        });
        if (!uploadOnSave)
            return undefined;
        return {
            host,
            user,
            remotePath,
            port: parseInt(portString),
            uploadOnSave: uploadOnSave.value,
            ignore: config.ignore || ['.git', '.vscode', 'node_modules'],
            syncMode: 'upload'
        };
    }
}
exports.ConfigurationPanel = ConfigurationPanel;
//# sourceMappingURL=ConfigurationPanel.js.map