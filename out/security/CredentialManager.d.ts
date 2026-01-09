import { ExtensionContext } from 'vscode';
import { SCPConfig, ConnectionInfo } from '../types';
import { SSHKeyInfo } from '../utils/PlatformUtils';
export declare class CredentialManager {
    private static instance;
    private secretStorage;
    private readonly CREDENTIAL_PREFIX;
    private logger;
    private context;
    private constructor();
    static getInstance(context: ExtensionContext): CredentialManager;
    storePassword(serverId: string, password: string): Promise<void>;
    getPassword(serverId: string): Promise<string | undefined>;
    storePrivateKey(serverId: string, keyId: string, privateKey: string): Promise<void>;
    getPrivateKey(serverId: string, keyId: string): Promise<string | undefined>;
    getAllStoredKeys(serverId: string): Promise<Array<{
        id: string;
        content: string;
        keyInfo?: SSHKeyInfo;
    }>>;
    deletePrivateKey(serverId: string, keyId: string): Promise<void>;
    deleteAllCredentials(serverId: string): Promise<void>;
    detectAndSelectSSHKey(config: SCPConfig): Promise<{
        key: string;
        type: string;
    } | null>;
    getConnectionInfo(config: SCPConfig): Promise<ConnectionInfo>;
    private generateServerId;
    validateConfig(config: SCPConfig): string[];
}
//# sourceMappingURL=CredentialManager.d.ts.map