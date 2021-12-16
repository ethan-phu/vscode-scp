const minimatch = require("minimatch")
const path = require('path');
const vscode = require('vscode');

exports.channel = vscode.window.createOutputChannel("auto-scp");

exports.loadCfg = function() {
    return vscode.workspace.getConfiguration("auto-scp");
}

exports.matchFiles = function(filePath, config) {
    const fileName = path.basename(filePath);

    // if settings.json changed, do nothing
    if (fileName === 'settings.json') return false;

    const patterns = config.local.files;
    const localRoot = config.local.root || vscode.workspace.rootPath;
    const relativePath = filePath.replace(localRoot, '');

    for (let i = 0, length = patterns.length; i < length; i++) {
        const isMatch = minimatch(relativePath, patterns[i]);
        if (isMatch)
            return true;
    }

    return false;
}

exports.writeCfgToChannel = function(config) {
    const { local } = config;
    const { root, files, syncOnSave } = local;

    exports.channel.appendLine(`    local root:  ${root || vscode.workspace.rootPath}`);
    exports.channel.appendLine(`    monitoring patterns: ${files.join('   ')}`);
    exports.channel.appendLine(`sftp-sync is running with sync when saving ${syncOnSave ? 'ON' : 'OFF'} ...`);
    exports.channel.appendLine('');
}