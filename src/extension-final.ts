import { ExtensionContext, commands, workspace, window } from 'vscode';

// Import core modules
import { Deploy } from './core/deploy';

    async activate(): Promise<void> {
        try {
            const deploy = new Deploy();
            
            // Register configuration commands
            const configCommand = commands.registerCommand('vscode-scp.config', () => {
                deploy.newCfg();
                window.showInformationMessage('Configuration menu opened');
            });
            this.context.subscriptions.push(configCommand);

            // Register sync command
            const syncCommand = commands.registerCommand('vscode-scp.local2remote', () => {
                window.withProgress({
                    location: 15,
                    title: 'Syncing files'
                }, async () => {
                    try {
                        await deploy.syncAll();
                        window.showInformationMessage('Files synced successfully');
                    } catch (error) {
                        window.showErrorMessage(`Sync failed: ${error.message}`);
                    }
                });
            });
            this.context.subscriptions.push(syncCommand);

            window.showInformationMessage('VSCode SCP Extension activated successfully');
        } catch (error) {
            window.showErrorMessage(`Failed to activate extension: ${error.message}`);
        }
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