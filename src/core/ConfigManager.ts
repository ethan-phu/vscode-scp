import { workspace, window, ExtensionContext } from 'vscode';
import { SCPConfig, ServerConfig } from '../types';
import { Logger } from '../utils/Logger';
import { PathValidator } from '../security/PathValidator';

export class ConfigManager {
    private static instance: ConfigManager;
    private readonly CONFIG_FILE = '.vscode/scp.json';
    private readonly WORKSPACE_CONFIG_KEY = 'vscode-scp';
    private logger: Logger;
    private context: ExtensionContext;

    private constructor(context: ExtensionContext, logger: Logger) {
        this.context = context;
        this.logger = logger;
    }

    static getInstance(context: ExtensionContext, logger: Logger): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager(context, logger);
        }
        return ConfigManager.instance;
    }

    async loadConfig(): Promise<SCPConfig | null> {
        try {
            const workspaceFolders = workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                return null;
            }

            const configPath = workspace.asRelativePath(this.CONFIG_FILE);
            const configFile = workspace.getConfiguration(this.WORKSPACE_CONFIG_KEY);

            const configFromWorkspace = configFile.get<SCPConfig>('config');
            if (configFromWorkspace) {
                return this.validateAndFixConfig(configFromWorkspace);
            }

            if (workspace.workspaceFolders!.length === 0) {
                return null;
            }
            
            const configUri = workspace.workspaceFolders![0].uri.with({
                path: `${workspace.workspaceFolders![0].uri.path}/${this.CONFIG_FILE}`
            });

            try {
                const configData = await workspace.fs.readFile(configUri);
                const config = JSON.parse(configData.toString());
                return this.validateAndFixConfig(config);
            } catch (error) {
                this.logger.info('No configuration file found');
                return null;
            }
        } catch (error) {
            this.logger.error('Failed to load configuration', error as Error);
            return null;
        }
    }

    async saveConfig(config: SCPConfig): Promise<boolean> {
        try {
            const workspaceFolders = workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                throw new Error('No workspace folder found');
            }

            const validConfig = this.validateAndFixConfig(config);
            
            if (workspace.workspaceFolders!.length === 0) {
                throw new Error('No workspace folder found');
            }
            
            const configUri = workspace.workspaceFolders![0].uri.with({
                path: `${workspace.workspaceFolders![0].uri.path}/${this.CONFIG_FILE}`
            });

            const configData = JSON.stringify(validConfig, null, 2);
            await workspace.fs.writeFile(configUri, Buffer.from(configData));

            this.logger.info('Configuration saved successfully');
            return true;
        } catch (error) {
            this.logger.error('Failed to save configuration', error as Error);
            return false;
        }
    }

    async createDefaultConfig(): Promise<boolean> {
        const defaultConfig: SCPConfig = {
            host: 'localhost',
            port: 22,
            user: 'root',
            remotePath: '/root',
            ignore: ['.git', '.vscode', 'node_modules', 'out', 'dist'],
            uploadOnSave: true
        };

        return await this.saveConfig(defaultConfig);
    }

    async createConfigTemplate(): Promise<void> {
        const workspaceFolders = workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            window.showErrorMessage('No workspace folder found');
            return;
        }

        try {
            const vscodeDir = workspace.workspaceFolders![0].uri.with({
                path: `${workspace.workspaceFolders![0].uri.path}/.vscode`
            });

            try {
                await workspace.fs.stat(vscodeDir);
            } catch {
                await workspace.fs.createDirectory(vscodeDir);
            }

            const configUri = workspace.workspaceFolders![0].uri.with({
                path: `${workspace.workspaceFolders![0].uri.path}/${this.CONFIG_FILE}`
            });

            const template = JSON.stringify(this.getDefaultConfigTemplate(), null, 2);
            await workspace.fs.writeFile(configUri, Buffer.from(template));

            const document = await workspace.openTextDocument(configUri);
            await window.showTextDocument(document);

            window.showInformationMessage('Configuration template created in .vscode/scp.json');
        } catch (error) {
            this.logger.error('Failed to create configuration template', error as Error);
            window.showErrorMessage('Failed to create configuration template');
        }
    }

    private getDefaultConfigTemplate(): SCPConfig {
        return {
            host: 'your-server.com',
            port: 22,
            user: 'username',
            remotePath: '/remote/path',
            ignore: ['.git', '.vscode', 'node_modules', 'out', 'dist'],
            uploadOnSave: true,
            downloadOnChange: false,
            syncMode: 'upload'
        };
    }

    private validateAndFixConfig(config: any): SCPConfig {
        const fixedConfig: SCPConfig = {
            host: config.host || 'localhost',
            port: config.port || 22,
            user: config.user || 'root',
            remotePath: config.remotePath || '/root',
            ignore: PathValidator.validateIgnorePatterns(config.ignore || []),
            uploadOnSave: config.uploadOnSave !== undefined ? config.uploadOnSave : true,
            downloadOnChange: config.downloadOnChange || false,
            syncMode: config.syncMode || 'upload'
        };

        if (typeof fixedConfig.port !== 'number' || fixedConfig.port < 1 || fixedConfig.port > 65535) {
            fixedConfig.port = 22;
        }

        if (!fixedConfig.remotePath.startsWith('/')) {
            fixedConfig.remotePath = '/' + fixedConfig.remotePath;
        }

        return fixedConfig;
    }

    async getConfigFromUser(): Promise<SCPConfig | null> {
        const host = await window.showInputBox({
            prompt: 'Enter the server host or IP address',
            value: 'localhost'
        });

        if (!host) {return null;}

        const user = await window.showInputBox({
            prompt: 'Enter the username',
            value: 'root'
        });

        if (!user) {return null;}

        const remotePath = await window.showInputBox({
            prompt: 'Enter the remote path',
            value: '/root'
        });

        if (!remotePath) {return null;}

        const portString = await window.showInputBox({
            prompt: 'Enter the SSH port',
            value: '22',
            validateInput: (value) => {
                const port = parseInt(value);
                if (isNaN(port) || port < 1 || port > 65535) {
                    return 'Port must be between 1 and 65535';
                }
                return null;
            }
        });

        if (!portString) {return null;}

        const config: SCPConfig = {
            host,
            user,
            remotePath,
            port: parseInt(portString),
            ignore: ['.git', '.vscode', 'node_modules'],
            uploadOnSave: true
        };

        return config;
    }

    async migrateOldConfig(): Promise<boolean> {
        return false;
    }

    getGlobalSetting<T>(key: string): T | undefined {
        const config = workspace.getConfiguration(this.WORKSPACE_CONFIG_KEY);
        return config.get<T>(key);
    }

    async setGlobalSetting(key: string, value: any): Promise<void> {
        const config = workspace.getConfiguration(this.WORKSPACE_CONFIG_KEY);
        await config.update(key, value, true);
    }
}