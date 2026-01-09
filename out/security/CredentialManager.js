"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialManager = void 0;
const vscode_1 = require("vscode");
const Logger_1 = require("../utils/Logger");
const PathValidator_1 = require("./PathValidator");
const PlatformUtils_1 = require("../utils/PlatformUtils");
class CredentialManager {
    constructor(context) {
        this.CREDENTIAL_PREFIX = 'vscode-scp-';
        this.secretStorage = context.secrets;
        this.logger = Logger_1.Logger.getInstance(context);
        this.context = context;
    }
    static getInstance(context) {
        if (!CredentialManager.instance) {
            CredentialManager.instance = new CredentialManager(context);
        }
        return CredentialManager.instance;
    }
    async storePassword(serverId, password) {
        if (!serverId || !password) {
            throw new Error('Server ID and password are required');
        }
        const key = `${this.CREDENTIAL_PREFIX}${serverId}-password`;
        await this.secretStorage.store(key, password);
        this.logger.info(`Password stored for server: ${serverId}`);
    }
    async getPassword(serverId) {
        if (!serverId) {
            return undefined;
        }
        const key = `${this.CREDENTIAL_PREFIX}${serverId}-password`;
        return await this.secretStorage.get(key);
    }
    async storePrivateKey(serverId, keyId, privateKey) {
        if (!serverId || !privateKey || !keyId) {
            throw new Error('Server ID, key ID, and private key are required');
        }
        const key = `${this.CREDENTIAL_PREFIX}${serverId}-key-${keyId}`;
        await this.secretStorage.store(key, privateKey);
        this.logger.info(`SSH key ${keyId} stored for server: ${serverId}`);
    }
    async getPrivateKey(serverId, keyId) {
        if (!serverId || !keyId) {
            return undefined;
        }
        const key = `${this.CREDENTIAL_PREFIX}${serverId}-key-${keyId}`;
        return await this.secretStorage.get(key);
    }
    async getAllStoredKeys(serverId) {
        const keys = [];
        for (let i = 0; i < 10; i++) {
            const keyId = `key-${i}`;
            const content = await this.getPrivateKey(serverId, keyId);
            if (content) {
                keys.push({ id: keyId, content });
            }
        }
        return keys;
    }
    async deletePrivateKey(serverId, keyId) {
        if (!serverId || !keyId) {
            return;
        }
        const key = `${this.CREDENTIAL_PREFIX}${serverId}-key-${keyId}`;
        await this.secretStorage.delete(key);
        this.logger.info(`SSH key ${keyId} deleted for server: ${serverId}`);
    }
    async deleteAllCredentials(serverId) {
        if (!serverId) {
            return;
        }
        const passwordKey = `${this.CREDENTIAL_PREFIX}${serverId}-password`;
        await this.secretStorage.delete(passwordKey);
        for (let i = 0; i < 10; i++) {
            const keyId = `key-${i}`;
            const key = `${this.CREDENTIAL_PREFIX}${serverId}-${keyId}`;
            await this.secretStorage.delete(key);
        }
        this.logger.info(`All credentials deleted for server: ${serverId}`);
    }
    async detectAndSelectSSHKey(config) {
        const availableKeys = await PlatformUtils_1.PlatformUtils.detectAvailableSSHKeys();
        if (availableKeys.length === 0) {
            return null;
        }
        if (availableKeys.length === 1) {
            const key = availableKeys[0];
            const content = await PlatformUtils_1.PlatformUtils.readSSHKeyContent(key.path);
            if (content && PlatformUtils_1.PlatformUtils.validateSSHKeyContent(content)) {
                return { key: content, type: key.type };
            }
        }
        const quickPickItems = availableKeys.map(key => ({
            label: `${key.description} (${key.path})`,
            description: `SSH ${key.type} key`,
            keyInfo: key
        }));
        quickPickItems.push({
            label: '$(file-add) Browse for SSH key file',
            description: 'Select a custom SSH key file',
            keyInfo: { path: '', type: 'Custom', description: 'Custom SSH key file' }
        });
        const selectedItem = await vscode_1.window.showQuickPick(quickPickItems, {
            placeHolder: 'Select an SSH key',
            canPickMany: false
        });
        if (!selectedItem) {
            return null;
        }
        if (selectedItem.keyInfo.path) {
            const content = await PlatformUtils_1.PlatformUtils.readSSHKeyContent(selectedItem.keyInfo.path);
            if (content && PlatformUtils_1.PlatformUtils.validateSSHKeyContent(content)) {
                return { key: content, type: selectedItem.keyInfo.type };
            }
        }
        const fileUri = await vscode_1.window.showOpenDialog({
            canSelectMany: false,
            filters: {
                'SSH Keys': ['pem', 'key', 'id_rsa', 'id_ed25519', 'id_ecdsa']
            },
            title: 'Select SSH Private Key'
        });
        if (fileUri && fileUri.length > 0) {
            const content = await PlatformUtils_1.PlatformUtils.readSSHKeyContent(fileUri[0].fsPath);
            if (content && PlatformUtils_1.PlatformUtils.validateSSHKeyContent(content)) {
                return { key: content, type: 'Custom' };
            }
        }
        return null;
    }
    async getConnectionInfo(config) {
        const connectionInfo = {
            host: config.host,
            port: config.port,
            user: config.user
        };
        let usePassword = true;
        let selectedKeyId;
        if (config.privateKey) {
            connectionInfo.privateKey = config.privateKey;
            usePassword = false;
        }
        else {
            const serverId = this.generateServerId(config);
            const autoDetectedKey = await this.detectAndSelectSSHKey(config);
            if (autoDetectedKey) {
                connectionInfo.privateKey = autoDetectedKey.key;
                usePassword = false;
                this.logger.info(`Using detected SSH key: ${autoDetectedKey.type}`);
            }
        }
        if (usePassword && !config.password) {
            const storedPassword = await this.getPassword(this.generateServerId(config));
            if (storedPassword) {
                connectionInfo.password = storedPassword;
            }
            else {
                const action = await vscode_1.window.showQuickPick([
                    { label: '$(key) Enter Password', value: 'password' },
                    { label: '$(file-code) Use SSH Key', value: 'key' }
                ], {
                    placeHolder: 'Select authentication method',
                    canPickMany: false
                });
                if (action?.value === 'password') {
                    const password = await vscode_1.window.showInputBox({
                        password: true,
                        prompt: `Enter password for ${config.user}@${config.host}`,
                        validateInput: (value) => {
                            if (!value || value.length < 1) {
                                return 'Password is required';
                            }
                            return null;
                        }
                    });
                    if (password) {
                        connectionInfo.password = password;
                        await this.storePassword(this.generateServerId(config), password);
                    }
                }
                else if (action?.value === 'key') {
                    const configForDetection = { ...config, id: this.generateServerId(config), name: config.host };
                    await this.detectAndSelectSSHKey(configForDetection);
                }
                if (!connectionInfo.password && !connectionInfo.privateKey) {
                    throw new Error('No authentication method selected');
                }
            }
        }
        return connectionInfo;
    }
    generateServerId(config) {
        return `${config.user}@${config.host}:${config.port}`;
    }
    validateConfig(config) {
        const errors = [];
        if (!config.host) {
            errors.push('Host is required');
        }
        else if (!PathValidator_1.PathValidator.isValidPath(config.host)) {
            errors.push('Invalid host format');
        }
        if (!config.user) {
            errors.push('User is required');
        }
        else if (!PathValidator_1.PathValidator.isValidPath(config.user)) {
            errors.push('Invalid user format');
        }
        if (!config.remotePath) {
            errors.push('Remote path is required');
        }
        else if (!PathValidator_1.PathValidator.isValidPath(config.remotePath)) {
            errors.push('Invalid remote path format');
        }
        if (config.port && (config.port < 1 || config.port > 65535)) {
            errors.push('Port must be between 1 and 65535');
        }
        if (config.ignore) {
            const validIgnore = PathValidator_1.PathValidator.validateIgnorePatterns(config.ignore);
            if (validIgnore.length !== config.ignore.length) {
                errors.push('Some ignore patterns are invalid');
            }
        }
        return errors;
    }
}
exports.CredentialManager = CredentialManager;
//# sourceMappingURL=CredentialManager.js.map