// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const Deploy = require("./src/deploy")
    // this method is called when your extension is activated
    // your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    const deploy = new Deploy();
    let reload = vscode.workspace.onDidChangeConfiguration(deploy.readCfg);
    let save = vscode.workspace.onDidSaveTextDocument(deploy.syncToRemote);
    let deletes = vscode.workspace.onDidDeleteFiles(deploy.deleteFromRemote);
    context.subscriptions.push(reload);
    context.subscriptions.push(save);
    context.subscriptions.push(deletes)

    let configRegistry = vscode.commands.registerCommand('vscode-scp.config', deploy.newCfg);
    let allTrans = vscode.commands.registerCommand("vscode-scp.local2remote", deploy.syncAll);
    context.subscriptions.push(configRegistry);
    context.subscriptions.push(allTrans)
    vscode.window.showInformationMessage("插件激活")
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
    activate,
    deactivate
}