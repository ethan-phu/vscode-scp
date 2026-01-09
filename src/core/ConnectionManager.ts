import { Client } from 'ssh2';
import { ConnectionInfo, TransferResult } from '../types';
import { Logger } from '../utils/Logger';
import { PathValidator } from '../security/PathValidator';

export interface SSHConnection {
    client: Client;
    lastUsed: Date;
    isActive: boolean;
}

export class ConnectionManager {
    private static instance: ConnectionManager;
    private connections: Map<string, SSHConnection> = new Map();
    private readonly CONNECTION_TIMEOUT = 30000;
    private readonly MAX_IDLE_TIME = 300000;
    private logger: Logger;

    private constructor(logger: Logger) {
        this.logger = logger;
        this.startCleanupTimer();
    }

    static getInstance(logger: Logger): ConnectionManager {
        if (!ConnectionManager.instance) {
            ConnectionManager.instance = new ConnectionManager(logger);
        }
        return ConnectionManager.instance;
    }

    async getConnection(connectionInfo: ConnectionInfo): Promise<Client> {
        const key = this.getConnectionKey(connectionInfo);
        
        let connection = this.connections.get(key);
        if (connection && connection.isActive) {
            connection.lastUsed = new Date();
            return connection.client;
        }

        return await this.createConnection(connectionInfo);
    }

    private async createConnection(connectionInfo: ConnectionInfo): Promise<Client> {
        const key = this.getConnectionKey(connectionInfo);
        
        return new Promise((resolve, reject) => {
            const client = new Client();
            const timeout = setTimeout(() => {
                client.end();
                reject(new Error(`Connection timeout to ${connectionInfo.host}:${connectionInfo.port}`));
            }, this.CONNECTION_TIMEOUT);

            client.on('ready', () => {
                clearTimeout(timeout);
                
                const connection: SSHConnection = {
                    client,
                    lastUsed: new Date(),
                    isActive: true
                };

                this.connections.set(key, connection);
                this.logger.info(`Connected to ${connectionInfo.user}@${connectionInfo.host}:${connectionInfo.port}`);
                resolve(client);
            });

                client.on('error', (error: Error) => {
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

            const config: any = {
                host: connectionInfo.host,
                port: connectionInfo.port,
                username: connectionInfo.user,
                readyTimeout: this.CONNECTION_TIMEOUT
            };

            if (connectionInfo.password) {
                config.password = connectionInfo.password;
            } else if (connectionInfo.privateKey) {
                config.privateKey = connectionInfo.privateKey;
            }

            client.connect(config);
        });
    }

    async executeCommand(connectionInfo: ConnectionInfo, command: string): Promise<string> {
        if (!PathValidator.isValidPath(command)) {
            throw new Error('Invalid command detected');
        }

        const sanitizedCommand = this.sanitizeCommand(command);
        const client = await this.getConnection(connectionInfo);

        return new Promise((resolve, reject) => {
            client.exec(sanitizedCommand, (err: any, stream: any) => {
                if (err) {
                    reject(err);
                    return;
                }

                let stdout = '';
                let stderr = '';

                stream.on('close', (code: any) => {
                    if (code === 0) {
                        resolve(stdout);
                    } else {
                        reject(new Error(stderr || `Command failed with code ${code}`));
                    }
                });

                stream.on('data', (data: any) => {
                    stdout += data.toString();
                });

                stream.stderr.on('data', (data: any) => {
                    stderr += data.toString();
                });
            });
        });
    }

    async uploadFile(connectionInfo: ConnectionInfo, localPath: string, remotePath: string): Promise<TransferResult> {
        const client = await this.getConnection(connectionInfo);

        return new Promise((resolve) => {
            const sftp = client.sftp((err: any, sftp: any) => {
                if (err) {
                    this.logger.error(`SFTP error: ${err.message}`, err);
                    resolve({ success: false, error: err.message, code: 1 });
                    return;
                }

                sftp.fastPut(localPath, remotePath, (err: any) => {
                    if (err) {
                        this.logger.error(`Upload failed: ${err.message}`, err);
                        resolve({ success: false, error: err.message, code: 2 });
                    } else {
                        this.logger.info(`Successfully uploaded ${localPath} to ${remotePath}`);
                        resolve({ success: true, code: 200 });
                    }
                });
            });
        });
    }

    async downloadFile(connectionInfo: ConnectionInfo, remotePath: string, localPath: string): Promise<TransferResult> {
        const client = await this.getConnection(connectionInfo);

        return new Promise((resolve) => {
            const sftp = client.sftp((err: any, sftp: any) => {
                if (err) {
                    this.logger.error(`SFTP error: ${err.message}`, err);
                    resolve({ success: false, error: err.message, code: 1 });
                    return;
                }

                sftp.fastGet(remotePath, localPath, (err: any) => {
                    if (err) {
                        this.logger.error(`Download failed: ${err.message}`, err);
                        resolve({ success: false, error: err.message, code: 2 });
                    } else {
                        this.logger.info(`Successfully downloaded ${remotePath} to ${localPath}`);
                        resolve({ success: true, code: 200 });
                    }
                });
            });
        });
    }

    async deleteRemoteFile(connectionInfo: ConnectionInfo, remotePath: string): Promise<TransferResult> {
        if (!PathValidator.isValidPath(remotePath)) {
            return { success: false, error: 'Invalid path', code: 3 };
        }

        try {
            await this.executeCommand(connectionInfo, `rm -f ${PathValidator.escapeShellArg(remotePath)}`);
            this.logger.info(`Successfully deleted remote file: ${remotePath}`);
            return { success: true, code: 200 };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Delete failed: ${errorMessage}`, error as Error);
            return { success: false, error: errorMessage, code: 2 };
        }
    }

    async ensureRemoteDirectory(connectionInfo: ConnectionInfo, remotePath: string): Promise<boolean> {
        if (!PathValidator.isValidPath(remotePath)) {
            return false;
        }

        try {
            await this.executeCommand(connectionInfo, `mkdir -p ${PathValidator.escapeShellArg(remotePath)}`);
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to create directory ${remotePath}: ${errorMessage}`, error as Error);
            return false;
        }
    }

    private sanitizeCommand(command: string): string {
        const dangerousChars = /[;&|`$(){}[\]]/;
        if (dangerousChars.test(command)) {
            throw new Error('Command contains potentially dangerous characters');
        }

        return command;
    }

    private getConnectionKey(connectionInfo: ConnectionInfo): string {
        return `${connectionInfo.user}@${connectionInfo.host}:${connectionInfo.port}`;
    }

    private startCleanupTimer(): void {
        setInterval(() => {
            this.cleanupIdleConnections();
        }, 60000);
    }

    private cleanupIdleConnections(): void {
        const now = new Date();
        
        for (const [key, connection] of this.connections.entries()) {
            if (now.getTime() - connection.lastUsed.getTime() > this.MAX_IDLE_TIME) {
                connection.client.end();
                this.connections.delete(key);
                this.logger.info(`Cleaned up idle connection: ${key}`);
            }
        }
    }

    closeAllConnections(): void {
        for (const [key, connection] of this.connections.entries()) {
            connection.client.end();
            this.logger.info(`Closed connection: ${key}`);
        }
        this.connections.clear();
    }

    getConnectionCount(): number {
        return this.connections.size;
    }

    async testConnection(connectionInfo: ConnectionInfo): Promise<boolean> {
        try {
            await this.executeCommand(connectionInfo, 'echo "Connection test"');
            return true;
        } catch (error) {
            this.logger.error(`Connection test failed: ${(error as Error).message}`, error as Error);
            return false;
        }
    }
}