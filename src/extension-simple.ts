import { ExtensionContext, commands, workspace, window } from 'vscode';

export class VSCodeSCPExtension {
    private context: ExtensionContext;

    private constructor(context: ExtensionContext) {
        this.context = context;
    }

    async activate(): Promise<void> {
        window.showInformationMessage('VSCode SCP Extension (Simplified Version) activated');
        
        const configRegistry = commands.registerCommand('vscode-scp.config', () => {
            window.showInformationMessage('Configuration feature coming soon!');
        });

        const allTrans = commands.registerCommand("vscode-scp.local2remote", () => {
            window.showInformationMessage('Sync feature coming soon!');
        });

        this.context.subscriptions.push(configRegistry);
        this.context.subscriptions.push(allTrans);
    }

    deactivate(): void {
        window.showInformationMessage('VSCode SCP Extension deactivated');
    }
}

export function activate(context: ExtensionContext) {
    VSCodeSCPExtension.getInstance(context).activate();
}

export function deactivate() {
    VSCodeSCPExtension.getInstance(context).deactivate();
}