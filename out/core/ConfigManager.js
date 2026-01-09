"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
const vscode_1 = require("vscode");
const PathValidator_1 = require("../security/PathValidator");
class ConfigManager {
    constructor(context, logger) {
        this.CONFIG_FILE = '.vscode/scp.json';
        this.WORKSPACE_CONFIG_KEY = 'vscode-scp';
        this.context = context;
        this.logger = logger;
    }
    static getInstance(context, logger) {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager(context, logger);
        }
        return ConfigManager.instance;
    }
    async loadConfig() {
        try {
            const workspaceFolders = vscode_1.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                return null;
            }
            const configPath = vscode_1.workspace.asRelativePath(this.CONFIG_FILE);
            const configFile = vscode_1.workspace.getConfiguration(this.WORKSPACE_CONFIG_KEY);
            const configFromWorkspace = configFile.get('config');
            if (configFromWorkspace) {
                return this.validateAndFixConfig(configFromWorkspace);
            }
            if (vscode_1.workspace.workspaceFolders.length === 0) {
                return null;
            }
            const configUri = vscode_1.workspace.workspaceFolders[0].uri.with({
                path: `${vscode_1.workspace.workspaceFolders[0].uri.path}/${this.CONFIG_FILE}`
            });
            try {
                const configData = await vscode_1.workspace.fs.readFile(configUri);
                const config = JSON.parse(configData.toString());
                return this.validateAndFixConfig(config);
            }
            catch (error) {
                this.logger.info('No configuration file found');
                return null;
            }
        }
        catch (error) {
            this.logger.error('Failed to load configuration', error);
            return null;
        }
    }
    async saveConfig(config) {
        try {
            const workspaceFolders = vscode_1.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                throw new Error('No workspace folder found');
            }
            const validConfig = this.validateAndFixConfig(config);
            if (vscode_1.workspace.workspaceFolders.length === 0) {
                throw new Error('No workspace folder found');
            }
            const configUri = vscode_1.workspace.workspaceFolders[0].uri.with({
                path: `${vscode_1.workspace.workspaceFolders[0].uri.path}/${this.CONFIG_FILE}`
            });
            const configData = JSON.stringify(validConfig, null, 2);
            await vscode_1.workspace.fs.writeFile(configUri, Buffer.from(configData));
            this.logger.info('Configuration saved successfully');
            return true;
        }
        catch (error) {
            this.logger.error('Failed to save configuration', error);
            return false;
        }
    }
    async createDefaultConfig() {
        const defaultConfig = {
            host: 'localhost',
            port: 22,
            user: 'root',
            remotePath: '/root',
            ignore: ['.git', '.vscode', 'node_modules', 'out', 'dist'],
            uploadOnSave: true
        };
        return await this.saveConfig(defaultConfig);
    }
    async createConfigTemplate() {
        const workspaceFolders = vscode_1.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode_1.window.showErrorMessage('No workspace folder found');
            return;
        }
        try {
            const vscodeDir = vscode_1.workspace.workspaceFolders[0].uri.with({
                path: `${vscode_1.workspace.workspaceFolders[0].uri.path}/.vscode`
            });
            try {
                await vscode_1.workspace.fs.stat(vscodeDir);
            }
            catch {
                await vscode_1.workspace.fs.createDirectory(vscodeDir);
            }
            const configUri = vscode_1.workspace.workspaceFolders[0].uri.with({
                path: `${vscode_1.workspace.workspaceFolders[0].uri.path}/${this.CONFIG_FILE}`
            });
            const template = JSON.stringify(this.getDefaultConfigTemplate(), null, 2);
            await vscode_1.workspace.fs.writeFile(configUri, Buffer.from(template));
            const document = await vscode_1.workspace.openTextDocument(configUri);
            await vscode_1.window.showTextDocument(document);
            vscode_1.window.showInformationMessage('Configuration template created in .vscode/scp.json');
        }
        catch (error) {
            this.logger.error('Failed to create configuration template', error);
            vscode_1.window.showErrorMessage('Failed to create configuration template');
        }
    }
    getDefaultConfigTemplate() {
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
    validateAndFixConfig(config) {
        const fixedConfig = {
            host: config.host || 'localhost',
            port: config.port || 22,
            user: config.user || 'root',
            remotePath: config.remotePath || '/root',
            ignore: PathValidator_1.PathValidator.validateIgnorePatterns(config.ignore || []),
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
    async getConfigFromUser() {
        const host = await vscode_1.window.showInputBox({
            prompt: 'Enter the server host or IP address',
            value: 'localhost'
        });
        if (!host) {
            return null;
        }
        const user = await vscode_1.window.showInputBox({
            prompt: 'Enter the username',
            value: 'root'
        });
        if (!user) {
            return null;
        }
        const remotePath = await vscode_1.window.showInputBox({
            prompt: 'Enter the remote path',
            value: '/root'
        });
        if (!remotePath) {
            return null;
        }
        const portString = await vscode_1.window.showInputBox({
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
        if (!portString) {
            return null;
        }
        const config = {
            host,
            user,
            remotePath,
            port: parseInt(portString),
            ignore: ['.git', '.vscode', 'node_modules'],
            uploadOnSave: true
        };
        return config;
    }
    async migrateOldConfig() {
        return false;
    }
    getGlobalSetting(key) {
        const config = vscode_1.workspace.getConfiguration(this.WORKSPACE_CONFIG_KEY);
        return config.get(key);
    }
    async setGlobalSetting(key, value) {
        const config = vscode_1.workspace.getConfiguration(this.WORKSPACE_CONFIG_KEY);
        await config.update(key, value, true);
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=ConfigManager.js.map