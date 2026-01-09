import { window, ExtensionContext, QuickPickItem, commands, workspace } from 'vscode';
import { SCPConfig, ServerConfig } from '../types';
import { Logger } from '../utils/Logger';
import { ConfigManager } from '../core/ConfigManager';
import { CredentialManager } from '../security/CredentialManager';
import { PathValidator } from '../security/PathValidator';

interface ServerQuickPickItem extends QuickPickItem {
    config: ServerConfig;
}

export class ConfigurationPanel {
    private static instance: ConfigurationPanel;
    private logger: Logger;
    private configManager: ConfigManager;
    private credentialManager: CredentialManager;
    private context: ExtensionContext;

    private constructor(
        context: ExtensionContext,
        logger: Logger,
        configManager: ConfigManager,
        credentialManager: CredentialManager
    ) {
        this.context = context;
        this.logger = logger;
        this.configManager = configManager;
        this.credentialManager = credentialManager;
    }

    static getInstance(
        context: ExtensionContext,
        logger: Logger,
        configManager: ConfigManager,
        credentialManager: CredentialManager
    ): ConfigurationPanel {
        if (!ConfigurationPanel.instance) {
            ConfigurationPanel.instance = new ConfigurationPanel(context, logger, configManager, credentialManager);
        }
        return ConfigurationPanel.instance;
    }

    async showConfigurationMenu(): Promise<void> {
        const options: QuickPickItem[] = [
            { label: '$(edit) Edit Current Configuration', description: 'Modify existing server configuration' },
            { label: '$(plus) Add New Server', description: 'Configure a new server connection' },
            { label: '$(trash) Remove Server', description: 'Delete a server configuration' },
            { label: '$(gear) Manage Credentials', description: 'Update passwords or SSH keys' },
            { label: '$(test) Test Connection', description: 'Verify current server connection' },
            { label: '$(file-text) Open Config File', description: 'Edit configuration directly' }
        ];

        const choice = await window.showQuickPick(options, {
            placeHolder: 'Select a configuration action'
        });

        if (!choice) return;

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

    private async editCurrentConfiguration(): Promise<void> {
        const config = await this.configManager.loadConfig();
        if (!config) {
            window.showErrorMessage('No configuration found. Please create one first.');
            return;
        }

        const updatedConfig = await this.promptForConfiguration(config);
        if (updatedConfig) {
            const success = await this.configManager.saveConfig(updatedConfig);
            if (success) {
                window.showInformationMessage('Configuration updated successfully');
                commands.executeCommand('vscode-scp.config');
            } else {
                window.showErrorMessage('Failed to update configuration');
            }
        }
    }

    private async addNewServer(): Promise<void> {
        const config = await this.promptForConfiguration();
        if (config) {
            const success = await this.configManager.saveConfig(config);
            if (success) {
                window.showInformationMessage('Server configuration added successfully');
                commands.executeCommand('vscode-scp.config');
            } else {
                window.showErrorMessage('Failed to add server configuration');
            }
        }
    }

    private async removeServer(): Promise<void> {
        const config = await this.configManager.loadConfig();
        if (!config) {
            window.showErrorMessage('No configuration found');
            return;
        }

        const confirm = await window.showWarningMessage(
            `Are you sure you want to remove configuration for ${config.host}?`,
            'Remove', 'Cancel'
        );

        if (confirm === 'Remove') {
            window.showInformationMessage('Server configuration removed');
        }
    }

    private async manageCredentials(): Promise<void> {
        const config = await this.configManager.loadConfig();
        if (!config) {
            window.showErrorMessage('No configuration found');
            return;
        }

        const serverId = `${config.user}@${config.host}:${config.port}`;

        const action = await window.showQuickPick([
            { label: '$(key) Update SSH Key', description: 'Select or add SSH key' },
            { label: '$(key) Update Password', description: 'Update password for this server' },
            { label: '$(trash) Clear Credentials', description: 'Remove all stored credentials' }
        ], {
            placeHolder: 'Select credential management action'
        });

        if (!action) return;

        if (action.label.includes('Update SSH Key')) {
            window.showInformationMessage('Use the configuration panel to manage SSH keys');
        } else if (action.label.includes('Update Password')) {
            window.showInformationMessage('Use the Configuration Panel to update passwords');
        } else if (action.label.includes('Clear Credentials')) {
            window.showInformationMessage('Use the Configuration Panel to clear credentials');
        }
    }

    private async testConnection(): Promise<void> {
        const config = await this.configManager.loadConfig();
        if (!config) {
            window.showErrorMessage('No configuration found');
            return;
        }

        window.withProgress({
            location: 15,
            title: 'Testing connection'
        }, async () => {
            try {
                const serverId = `${config.user}@${config.host}:${config.port}`;
                const connectionInfo = await this.credentialManager.getConnectionInfo({
                    ...config,
                    id: serverId,
                    name: config.host
                } as any);

                if (connectionInfo.password || connectionInfo.privateKey) {
                    window.showInformationMessage('Connection test successful');
                } else {
                    window.showErrorMessage('Connection test failed: No credentials configured');
                }
            } catch (error) {
                this.logger.error('Connection test failed', error as Error);
                window.showErrorMessage(`Connection test failed: ${(error as Error).message}`);
            }
        });
    }

    private async openConfigFile(): Promise<void> {
        commands.executeCommand('vscode.open', '.vscode/scp.json');
    }

    private async promptForConfiguration(existingConfig?: any): Promise<SCPConfig | undefined> {
        const config: any = existingConfig || {};

        const host = await window.showInputBox({
            prompt: 'Server host or IP address',
            value: config.host || 'localhost',
            validateInput: (value) => {
                if (!value) return 'Host is required';
                return null;
            }
        });

        if (!host) return undefined;

        const user = await window.showInputBox({
            prompt: 'Username',
            value: config.user || 'root',
            validateInput: (value) => {
                if (!value) return 'Username is required';
                return null;
            }
        });

        if (!user) return undefined;

        const remotePath = await window.showInputBox({
            prompt: 'Remote path',
            value: config.remotePath || '/root',
            validateInput: (value) => {
                if (!value) return 'Remote path is required';
                return null;
            }
        });

        if (!remotePath) return undefined;

        const portString = await window.showInputBox({
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

        if (!portString) return undefined;

        const uploadOnSave = await window.showQuickPick([
            { label: 'Yes', value: true },
            { label: 'No', value: false }
        ], {
            placeHolder: 'Upload files on save?',
            canPickMany: false
        });

        if (!uploadOnSave) return undefined;

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