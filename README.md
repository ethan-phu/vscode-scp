# VSCode SCP Extension

A modern, secure Visual Studio Code extension for file synchronization using SCP protocol.

## Features

### 🚀 Modern Architecture
- **TypeScript-based** with full type safety
- **Modular design** with clear separation of concerns
- **Secure by default** with comprehensive input validation
- **Async/await** for non-blocking operations

### 🔐 Security First
- **Input validation** prevents path traversal attacks
- **Command sanitization** prevents injection attacks
- **Secure credential storage** using VSCode SecretStorage API
- **Encrypted connections** with SSH2 library

### 📁 Advanced File Management
- **Automatic sync on save** with configurable patterns
- **Progress tracking** with detailed status updates
- **Bidirectional sync** (upload/download)
- **Batch operations** for efficient transfers
- **Smart ignore patterns** for selective synchronization

### 🎨 User Experience
- **Visual status indicators** in status bar
- **Progress feedback** during operations
- **Configuration UI** with intuitive forms
- **Error handling** with clear messages
- **Connection testing** before operations

### ⚙️ Configuration Management
- **Multiple server support** (planned)
- **Profile management** for different environments
- **Credential storage** with secure defaults
- **Configuration validation** with error prevention

## Installation

1. Open VSCode
2. Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on Mac)
3. Search for "vscode-scp"
4. Click Install

## Quick Start

1. **Configure Connection**:
   - Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
   - Type "vscode-scp: Config"
   - Enter your server details

2. **Test Connection**:
   - Command Palette: "vscode-scp: Test Connection"

3. **Start Syncing**:
   - Save files to auto-upload
   - Or use "vscode-scp: Local->Remote" for full sync

## Configuration

### Basic Configuration

```json
{
  "host": "your-server.com",
  "port": 22,
  "user": "username",
  "remotePath": "/remote/path",
  "ignore": [".git", ".vscode", "node_modules"],
  "uploadOnSave": true,
  "syncMode": "upload"
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `host` | string | - | Server hostname or IP |
| `port` | number | 22 | SSH port |
| `user` | string | "root" | SSH username |
| `remotePath` | string | "/root" | Remote destination path |
| `ignore` | string[] | [".git",".vscode"] | Files to ignore |
| `uploadOnSave` | boolean | true | Auto-upload on save |
| `syncMode` | string | "upload" | Sync mode: upload/download/bidirectional |

## Commands

| Command | Description |
|---------|-------------|
| `vscode-scp.config` | Open configuration panel |
| `vscode-scp.local2remote` | Sync all files to remote |
| `vscode-scp.testConnection` | Test server connection |
| `vscode-scp.showLogs` | Show extension logs |
| `vscode-scp.downloadFile` | Download specific file |
| `vscode-scp.uploadFile` | Upload specific file |
| `vscode-scp.toggleSync` | Toggle auto-sync |
| `vscode-scp.showStatus` | Show extension status |

## Security

### Input Validation
- **Path validation** prevents directory traversal
- **Command sanitization** prevents injection attacks
- **File filtering** prevents unwanted access

### Credential Management
- **Secure storage** using VSCode SecretStorage
- **No plain text passwords** in configuration
- **SSH key support** for key-based authentication
- **Optional credential prompts** when needed

### Network Security
- **SSH2 library** for secure connections
- **Timeout protection** prevents hanging
- **Connection pooling** for efficiency
- **Automatic cleanup** of idle connections

## Development

### Building
```bash
npm install
npm run compile
```

### Testing
```bash
npm run test
```

### Linting
```bash
npm run lint
```

### Packaging
```bash
npm run package
```

## Architecture

```
src/
├── core/              # Core functionality
│   ├── ConnectionManager.ts
│   ├── ConfigManager.ts
│   └── FileSyncManager.ts
├── security/          # Security features
│   ├── PathValidator.ts
│   └── CredentialManager.ts
├── ui/               # User interface
│   ├── StatusBarController.ts
│   └── ConfigurationPanel.ts
├── utils/             # Utilities
│   └── Logger.ts
├── types/             # Type definitions
│   └── index.ts
└── extension.ts       # Main extension entry
```

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check server address and port
   - Verify SSH access from command line
   - Check firewall settings

2. **Authentication Failed**
   - Verify username and password
   - Check SSH key format
   - Ensure password/SSH key is stored

3. **File Upload Failed**
   - Check file permissions
   - Verify remote directory exists
   - Check ignore patterns

### Debug Information

1. Open Command Palette
2. Run "vscode-scp: Show Logs"
3. Check output panel for detailed information

## Changelog

### v1.0.0 (Current)
- 🚀 Complete rewrite from JavaScript to TypeScript
- 🔐 Enhanced security with input validation
- 📁 Modern async file operations
- 🎨 Improved user interface
- ⚙️ Better configuration management
- 📊 Real-time progress tracking
- 🔒 Secure credential storage

### v0.0.22 (Legacy)
- Basic file synchronization
- Simple configuration
- Legacy security model

## Contributing

1. Fork repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

Apache License Version 2.0

## Support

- **Issues**: [GitHub Issues](https://github.com/TobiasHu2021/vscode-scp/issues)
- **Documentation**: [Wiki](https://github.com/TobiasHu2021/vscode-scp/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/TobiasHu2021/vscode-scp/discussions)

---

**Thank you for using VSCode SCP Extension!** 🚀

## Requirements

Prerequisites for use: Use the ssh command to transfer the key of you computer to the server, so that you can login without password.

```bash
ssh-copy-id -i ~/.ssh/id_rsa

```

## Instructions for use
1. Bring up the command pallet (Ctrl+Shift+P or Cmd+Shift+P on Mac) and run the below command: vscode-scp: Config
2. change the parameters to the appropriate values for your system.

```json
{
    "host": "LocalHost",
    "port": 22,
    "user": "root",
    "ignore":[".git",".vscode"],
    "remotePath": "/root",
    "uploadOnSave": true
}

```

## Commands

| Command      | Description |
| ----------- | ----------- |
| vscode-scp: Config      | Generate Config Template       |
| vscode-scp: Local->Remote   | Sync the file from local to remote        |


## Release Notes
### 0.0.1
Initial release of vscode-scp

### 0.0.22
Fix some bugs
---

**Enjoy!**
