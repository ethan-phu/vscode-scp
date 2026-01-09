import { ExtensionContext, TreeDataProvider, TreeItem, TreeItemCollapsibleState, Event } from 'vscode';
import { ServerConfig } from '../types';
import { ConfigManager } from '../core/ConfigManager';
import { Logger } from '../utils/Logger';
export declare class ServerConfigItem extends TreeItem {
    readonly config: ServerConfig;
    readonly collapsibleState: TreeItemCollapsibleState;
    constructor(config: ServerConfig, collapsibleState?: TreeItemCollapsibleState);
}
export declare class RemoteFileItem extends TreeItem {
    readonly fileName: string;
    readonly remotePath: string;
    readonly collapsibleState: TreeItemCollapsibleState;
    constructor(fileName: string, remotePath: string, collapsibleState?: TreeItemCollapsibleState);
}
export declare class RemoteFolderItem extends TreeItem {
    readonly folderName: string;
    readonly remotePath: string;
    readonly collapsibleState: TreeItemCollapsibleState;
    constructor(folderName: string, remotePath: string, collapsibleState?: TreeItemCollapsibleState);
}
export declare class VisualConfigManagerProvider implements TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: Event<TreeItem | undefined | null>;
    private configs;
    private logger;
    private configManager;
    constructor(logger: Logger, configManager: ConfigManager);
    getTreeItem(element?: TreeItem): TreeItem;
    private createServerItemChildren;
    private createFolderChildren;
    refresh(): void;
    getChildren(element?: TreeItem): Thenable<TreeItem[]>;
    private loadConfigs;
    private generateServerId;
}
export declare class VisualConfigManager {
    private static instance;
    private provider;
    private logger;
    private configManager;
    private context;
    private constructor();
    static getInstance(context: ExtensionContext, logger: Logger, configManager: ConfigManager): VisualConfigManager;
    activate(context: ExtensionContext): void;
    private browseRemoteFiles;
    private browseRemoteFolder;
    private addNewServer;
    private editServerConfig;
    private deleteServerConfig;
    private testServerConnection;
    private isCurrentConfig;
    private promptForConfigUpdate;
    getProvider(): TreeDataProvider<TreeItem>;
    refresh(): void;
}
//# sourceMappingURL=VisualConfigManager.d.ts.map