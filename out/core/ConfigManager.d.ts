import { ExtensionContext } from 'vscode';
import { SCPConfig } from '../types';
import { Logger } from '../utils/Logger';
export declare class ConfigManager {
    private static instance;
    private readonly CONFIG_FILE;
    private readonly WORKSPACE_CONFIG_KEY;
    private logger;
    private context;
    private constructor();
    static getInstance(context: ExtensionContext, logger: Logger): ConfigManager;
    loadConfig(): Promise<SCPConfig | null>;
    saveConfig(config: SCPConfig): Promise<boolean>;
    createDefaultConfig(): Promise<boolean>;
    createConfigTemplate(): Promise<void>;
    private getDefaultConfigTemplate;
    private validateAndFixConfig;
    getConfigFromUser(): Promise<SCPConfig | null>;
    migrateOldConfig(): Promise<boolean>;
    getGlobalSetting<T>(key: string): T | undefined;
    setGlobalSetting(key: string, value: any): Promise<void>;
}
//# sourceMappingURL=ConfigManager.d.ts.map