"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionManager = void 0;
const ssh2_1 = require("ssh2");
const PathValidator_1 = require("../security/PathValidator");
class ConnectionManager {
    constructor(logger) {
        this.connections = new Map();
        this.CONNECTION_TIMEOUT = 30000;
        this.MAX_IDLE_TIME = 300000;
        this.logger = logger;
        this.startCleanupTimer();
    }
    static getInstance(logger) {
        if (!ConnectionManager.instance) {
            ConnectionManager.instance = new ConnectionManager(logger);
        }
        return ConnectionManager.instance;
    }
    async getConnection(connectionInfo) {
        const key = this.getConnectionKey(connectionInfo);
        let connection = this.connections.get(key);
        if (connection && connection.isActive) {
            connection.lastUsed = new Date();
            return connection.client;
        }
        return await this.createConnection(connectionInfo);
    }
    async createConnection(connectionInfo) {
        const key = this.getConnectionKey(connectionInfo);
        return new Promise((resolve, reject) => {
            const client = new ssh2_1.Client();
            const timeout = setTimeout(() => {
                client.end();
                reject(new Error(`Connection timeout to ${connectionInfo.host}:${connectionInfo.port}`));
            }, this.CONNECTION_TIMEOUT);
            client.on('ready', () => {
                clearTimeout(timeout);
                const connection = {
                    client,
                    lastUsed: new Date(),
                    isActive: true
                };
                this.connections.set(key, connection);
                this.logger.info(`Connected to ${connectionInfo.user}@${connectionInfo.host}:${connectionInfo.port}`);
                resolve(client);
            });
            client.on('error', (error) => {
                clearTimeout(timeout);
                this.logger.error(`SSH connection error to ${connectionInfo.host}: ${error.message}`, error);
                reject(error);
            });
            client.on('end', () => {
                const connection = this.connections.get(key);
                if (connection) {
                    connection.isActive = false;
                }
                this.logger.info(`SSH connection to ${connectionInfo.host} ended`);
            });
            const config = {
                host: connectionInfo.host,
                port: connectionInfo.port,
                username: connectionInfo.user,
                readyTimeout: this.CONNECTION_TIMEOUT
            };
            if (connectionInfo.password) {
                config.password = connectionInfo.password;
            }
            else if (connectionInfo.privateKey) {
                config.privateKey = connectionInfo.privateKey;
            }
            client.connect(config);
        });
    }
    async executeCommand(connectionInfo, command) {
        if (!PathValidator_1.PathValidator.isValidPath(command)) {
            throw new Error('Invalid command detected');
        }
        const sanitizedCommand = this.sanitizeCommand(command);
        const client = await this.getConnection(connectionInfo);
        return new Promise((resolve, reject) => {
            client.exec(sanitizedCommand, (err, stream) => {
                if (err) {
                    reject(err);
                    return;
                }
                let stdout = '';
                let stderr = '';
                stream.on('close', (code) => {
                    if (code === 0) {
                        resolve(stdout);
                    }
                    else {
                        reject(new Error(stderr || `Command failed with code ${code}`));
                    }
                });
                stream.on('data', (data) => {
                    stdout += data.toString();
                });
                stream.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
            });
        });
    }
    async uploadFile(connectionInfo, localPath, remotePath) {
        const client = await this.getConnection(connectionInfo);
        return new Promise((resolve) => {
            const sftp = client.sftp((err, sftp) => {
                if (err) {
                    this.logger.error(`SFTP error: ${err.message}`, err);
                    resolve({ success: false, error: err.message, code: 1 });
                    return;
                }
                sftp.fastPut(localPath, remotePath, (err) => {
                    if (err) {
                        this.logger.error(`Upload failed: ${err.message}`, err);
                        resolve({ success: false, error: err.message, code: 2 });
                    }
                    else {
                        this.logger.info(`Successfully uploaded ${localPath} to ${remotePath}`);
                        resolve({ success: true, code: 200 });
                    }
                });
            });
        });
    }
    async downloadFile(connectionInfo, remotePath, localPath) {
        const client = await this.getConnection(connectionInfo);
        return new Promise((resolve) => {
            const sftp = client.sftp((err, sftp) => {
                if (err) {
                    this.logger.error(`SFTP error: ${err.message}`, err);
                    resolve({ success: false, error: err.message, code: 1 });
                    return;
                }
                sftp.fastGet(remotePath, localPath, (err) => {
                    if (err) {
                        this.logger.error(`Download failed: ${err.message}`, err);
                        resolve({ success: false, error: err.message, code: 2 });
                    }
                    else {
                        this.logger.info(`Successfully downloaded ${remotePath} to ${localPath}`);
                        resolve({ success: true, code: 200 });
                    }
                });
            });
        });
    }
    async deleteRemoteFile(connectionInfo, remotePath) {
        if (!PathValidator_1.PathValidator.isValidPath(remotePath)) {
            return { success: false, error: 'Invalid path', code: 3 };
        }
        try {
            await this.executeCommand(connectionInfo, `rm -f ${PathValidator_1.PathValidator.escapeShellArg(remotePath)}`);
            this.logger.info(`Successfully deleted remote file: ${remotePath}`);
            return { success: true, code: 200 };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Delete failed: ${errorMessage}`, error);
            return { success: false, error: errorMessage, code: 2 };
        }
    }
    async ensureRemoteDirectory(connectionInfo, remotePath) {
        if (!PathValidator_1.PathValidator.isValidPath(remotePath)) {
            return false;
        }
        try {
            await this.executeCommand(connectionInfo, `mkdir -p ${PathValidator_1.PathValidator.escapeShellArg(remotePath)}`);
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to create directory ${remotePath}: ${errorMessage}`, error);
            return false;
        }
    }
    sanitizeCommand(command) {
        const dangerousChars = /[;&|`$(){}[\]]/;
        if (dangerousChars.test(command)) {
            throw new Error('Command contains potentially dangerous characters');
        }
        return command;
    }
    getConnectionKey(connectionInfo) {
        return `${connectionInfo.user}@${connectionInfo.host}:${connectionInfo.port}`;
    }
    startCleanupTimer() {
        setInterval(() => {
            this.cleanupIdleConnections();
        }, 60000);
    }
    cleanupIdleConnections() {
        const now = new Date();
        for (const [key, connection] of this.connections.entries()) {
            if (now.getTime() - connection.lastUsed.getTime() > this.MAX_IDLE_TIME) {
                connection.client.end();
                this.connections.delete(key);
                this.logger.info(`Cleaned up idle connection: ${key}`);
            }
        }
    }
    closeAllConnections() {
        for (const [key, connection] of this.connections.entries()) {
            connection.client.end();
            this.logger.info(`Closed connection: ${key}`);
        }
        this.connections.clear();
    }
    getConnectionCount() {
        return this.connections.size;
    }
    async testConnection(connectionInfo) {
        try {
            await this.executeCommand(connectionInfo, 'echo "Connection test"');
            return true;
        }
        catch (error) {
            this.logger.error(`Connection test failed: ${error.message}`, error);
            return false;
        }
    }
}
exports.ConnectionManager = ConnectionManager;
//# sourceMappingURL=ConnectionManager.js.map