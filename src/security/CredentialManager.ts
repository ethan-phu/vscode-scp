import { ExtensionContext, SecretStorage, window, QuickPickItem } from 'vscode';
import { SCPConfig, ConnectionInfo } from '../types';
import { Logger } from '../utils/Logger';
import { PathValidator } from './PathValidator';
import { PlatformUtils, SSHKeyInfo } from '../utils/PlatformUtils';

interface SSHKeyQuickPickItem extends QuickPickItem {
    keyInfo: SSHKeyInfo;
}

export class CredentialManager {
    private static instance: CredentialManager;
    private secretStorage: SecretStorage;
    private readonly CREDENTIAL_PREFIX = 'vscode-scp-';
    private logger: Logger;
    private context: ExtensionContext;

    private constructor(context: ExtensionContext) {
        this.secretStorage = context.secrets;
        this.logger = Logger.getInstance(context);
        this.context = context;
    }

    static getInstance(context: ExtensionContext): CredentialManager {
        if (!CredentialManager.instance) {
            CredentialManager.instance = new CredentialManager(context);
        }
        return CredentialManager.instance;
    }

    async storePassword(serverId: string, password: string): Promise<void> {
        if (!serverId || !password) {
            throw new Error('Server ID and password are required');
        }

        const key = `${this.CREDENTIAL_PREFIX}${serverId}-password`;
        await this.secretStorage.store(key, password);
        this.logger.info(`Password stored for server: ${serverId}`);
    }

    async getPassword(serverId: string): Promise<string | undefined> {
        if (!serverId) {
            return undefined;
        }

        const key = `${this.CREDENTIAL_PREFIX}${serverId}-password`;
        return await this.secretStorage.get(key);
    }

    async storePrivateKey(serverId: string, keyId: string, privateKey: string): Promise<void> {
        if (!serverId || !privateKey || !keyId) {
            throw new Error('Server ID, key ID, and private key are required');
        }

        const key = `${this.CREDENTIAL_PREFIX}${serverId}-key-${keyId}`;
        await this.secretStorage.store(key, privateKey);
        this.logger.info(`SSH key ${keyId} stored for server: ${serverId}`);
    }

    async getPrivateKey(serverId: string, keyId: string): Promise<string | undefined> {
        if (!serverId || !keyId) {
            return undefined;
        }

        const key = `${this.CREDENTIAL_PREFIX}${serverId}-key-${keyId}`;
        return await this.secretStorage.get(key);
    }

    async getAllStoredKeys(serverId: string): Promise<Array<{ id: string; content: string; keyInfo?: SSHKeyInfo }>> {
        const keys: Array<{ id: string; content: string; keyInfo?: SSHKeyInfo }> = [];
        
        for (let i = 0; i < 10; i++) {
            const keyId = `key-${i}`;
            const content = await this.getPrivateKey(serverId, keyId);
            if (content) {
                keys.push({ id: keyId, content });
            }
        }

        return keys;
    }

    async deletePrivateKey(serverId: string, keyId: string): Promise<void> {
        if (!serverId || !keyId) {
            return;
        }

        const key = `${this.CREDENTIAL_PREFIX}${serverId}-key-${keyId}`;
        await this.secretStorage.delete(key);
        this.logger.info(`SSH key ${keyId} deleted for server: ${serverId}`);
    }

    async deleteAllCredentials(serverId: string): Promise<void> {
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

    async detectAndSelectSSHKey(config: SCPConfig): Promise<{ key: string; type: string } | null> {
        const availableKeys = await PlatformUtils.detectAvailableSSHKeys();
        
        if (availableKeys.length === 0) {
            return null;
        }

        if (availableKeys.length === 1) {
            const key = availableKeys[0];
            const content = await PlatformUtils.readSSHKeyContent(key.path);
            if (content && PlatformUtils.validateSSHKeyContent(content)) {
                return { key: content, type: key.type };
            }
        }

        const quickPickItems: SSHKeyQuickPickItem[] = availableKeys.map(key => ({
            label: `${key.description} (${key.path})`,
            description: `SSH ${key.type} key`,
            keyInfo: key
        }));

        quickPickItems.push({
            label: '$(file-add) Browse for SSH key file',
            description: 'Select a custom SSH key file',
            keyInfo: { path: '', type: 'Custom', description: 'Custom SSH key file' }
        });

        const selectedItem = await window.showQuickPick(quickPickItems, {
            placeHolder: 'Select an SSH key',
            canPickMany: false
        });

        if (!selectedItem) {
            return null;
        }

        if (selectedItem.keyInfo.path) {
            const content = await PlatformUtils.readSSHKeyContent(selectedItem.keyInfo.path);
            if (content && PlatformUtils.validateSSHKeyContent(content)) {
                return { key: content, type: selectedItem.keyInfo.type };
            }
        }

        const fileUri = await window.showOpenDialog({
            canSelectMany: false,
            filters: {
                'SSH Keys': ['pem', 'key', 'id_rsa', 'id_ed25519', 'id_ecdsa']
            },
            title: 'Select SSH Private Key'
        });

        if (fileUri && fileUri.length > 0) {
            const content = await PlatformUtils.readSSHKeyContent(fileUri[0].fsPath);
            if (content && PlatformUtils.validateSSHKeyContent(content)) {
                return { key: content, type: 'Custom' };
            }
        }

        return null;
    }

    async getConnectionInfo(config: SCPConfig): Promise<ConnectionInfo> {
        const connectionInfo: ConnectionInfo = {
            host: config.host,
            port: config.port,
            user: config.user
        };

        let usePassword = true;
        let selectedKeyId: string | undefined;

        if (config.privateKey) {
            connectionInfo.privateKey = config.privateKey;
            usePassword = false;
        } else {
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
            } else {
                const action = await window.showQuickPick([
                    { label: '$(key) Enter Password', value: 'password' },
                    { label: '$(file-code) Use SSH Key', value: 'key' }
                ], {
                    placeHolder: 'Select authentication method',
                    canPickMany: false
                });

                if (action?.value === 'password') {
                    const password = await window.showInputBox({
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
                } else if (action?.value === 'key') {
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

    private generateServerId(config: SCPConfig): string {
        return `${config.user}@${config.host}:${config.port}`;
    }

    validateConfig(config: SCPConfig): string[] {
        const errors: string[] = [];

        if (!config.host) {
            errors.push('Host is required');
        } else if (!PathValidator.isValidPath(config.host)) {
            errors.push('Invalid host format');
        }

        if (!config.user) {
            errors.push('User is required');
        } else if (!PathValidator.isValidPath(config.user)) {
            errors.push('Invalid user format');
        }

        if (!config.remotePath) {
            errors.push('Remote path is required');
        } else if (!PathValidator.isValidPath(config.remotePath)) {
            errors.push('Invalid remote path format');
        }

        if (config.port && (config.port < 1 || config.port > 65535)) {
            errors.push('Port must be between 1 and 65535');
        }

        if (config.ignore) {
            const validIgnore = PathValidator.validateIgnorePatterns(config.ignore);
            if (validIgnore.length !== config.ignore.length) {
                errors.push('Some ignore patterns are invalid');
            }
        }

        return errors;
    }
}