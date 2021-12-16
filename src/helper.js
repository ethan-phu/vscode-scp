const vscode = require('vscode');

exports.channel = vscode.window.createOutputChannel("auto-scp");

exports.loadCfg = function() {
    return vscode.workspace.getConfiguration("auto-scp");
}