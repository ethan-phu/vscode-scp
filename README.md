# scp sync extension for VS code
our source is open on [github](https://github.com/TobiasHu2021/vscode-scp) [downloads](https://marketplace.visualstudio.com/manage/publishers/aminkira/extensions/vscode-scp)


This extension will use the ssh2 to transfer the file you need from workspace to a remote server. The scenario for the remote server is that when the sftp protocol is not enabled, we just can use ssh to transfer our files.
## Features
This extension has the following features:
1. Global file synchronization: click on right button on your mouse in the workspace and select the vscode-scp: local->remote function. This plugin will automatically copy the files in the workspace to the remote server. If there is no corresponding working directory in the remote server, it will be created automatically .
2. Automatically sync when saving: when the file be saved, the file will be direct send to you remote server.
3. Automatic configuration generation: click on right button on you mouse or Ctrl+Shift+P input the command and run: vscode-scp: Config. The extention will automic to generate a template config on .vscode, and you will find a name with scp.json file.

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
