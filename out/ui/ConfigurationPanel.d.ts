import { ExtensionContext } from 'vscode';
import { Logger } from '../utils/Logger';
import { ConfigManager } from '../core/ConfigManager';
import { CredentialManager } from '../security/CredentialManager';
export declare class ConfigurationPanel {
    private static instance;
    private logger;
    private configManager;
    private credentialManager;
    private context;
    private constructor();
    static getInstance(context: ExtensionContext, logger: Logger, configManager: ConfigManager, credentialManager: CredentialManager): ConfigurationPanel;
    showConfigurationMenu(): Promise<void>;
    private editCurrentConfiguration;
    private addNewServer;
    private removeServer;
    private manageCredentials;
    private testConnection;
    private openConfigFile;
    private promptForConfiguration;
}
//# sourceMappingURL=ConfigurationPanel.d.ts.map