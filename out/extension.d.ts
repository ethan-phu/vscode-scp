import { ExtensionContext } from 'vscode';
export declare class VSCodeSCPExtension {
    private static instance;
    private context;
    private logger;
    private configManager;
    private credentialManager;
    private connectionManager;
    private fileSyncManager;
    private statusBarController;
    private configurationPanel;
    private disposables;
    private constructor();
    static getInstance(context: ExtensionContext): VSCodeSCPExtension;
    activate(): Promise<void>;
}
export declare function activate(context: ExtensionContext): void;
export declare function deactivate(): void;
//# sourceMappingURL=extension.d.ts.map