import { Client } from 'ssh2';
import { ConnectionInfo, TransferResult } from '../types';
import { Logger } from '../utils/Logger';
export interface SSHConnection {
    client: Client;
    lastUsed: Date;
    isActive: boolean;
}
export declare class ConnectionManager {
    private static instance;
    private connections;
    private readonly CONNECTION_TIMEOUT;
    private readonly MAX_IDLE_TIME;
    private logger;
    private constructor();
    static getInstance(logger: Logger): ConnectionManager;
    getConnection(connectionInfo: ConnectionInfo): Promise<Client>;
    private createConnection;
    executeCommand(connectionInfo: ConnectionInfo, command: string): Promise<string>;
    uploadFile(connectionInfo: ConnectionInfo, localPath: string, remotePath: string): Promise<TransferResult>;
    downloadFile(connectionInfo: ConnectionInfo, remotePath: string, localPath: string): Promise<TransferResult>;
    deleteRemoteFile(connectionInfo: ConnectionInfo, remotePath: string): Promise<TransferResult>;
    ensureRemoteDirectory(connectionInfo: ConnectionInfo, remotePath: string): Promise<boolean>;
    private sanitizeCommand;
    private getConnectionKey;
    private startCleanupTimer;
    private cleanupIdleConnections;
    closeAllConnections(): void;
    getConnectionCount(): number;
    testConnection(connectionInfo: ConnectionInfo): Promise<boolean>;
}
//# sourceMappingURL=ConnectionManager.d.ts.map