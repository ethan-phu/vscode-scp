import { ExtensionContext, Uri } from 'vscode';

export interface SSHKeyInfo {
    path: string;
    type: string;
    description: string;
}

export interface SCPConfig {
    host: string;
    port: number;
    user: string;
    password?: string;
    privateKey?: string;
    remotePath: string;
    ignore: string[];
    uploadOnSave: boolean;
    downloadOnChange?: boolean;
    syncMode?: 'upload' | 'download' | 'bidirectional';
}

export interface ServerConfig extends SCPConfig {
    name: string;
    id: string;
}

export interface ConnectionInfo {
    host: string;
    port: number;
    user: string;
    password?: string;
    privateKey?: string;
}

export interface SyncProgress {
    fileName: string;
    bytesTransferred: number;
    totalBytes: number;
    percentage: number;
    operation: 'upload' | 'download' | 'delete';
}

export interface TransferResult {
    success: boolean;
    error?: string;
    code: number;
}

export interface FileOperation {
    type: 'upload' | 'download' | 'delete';
    localPath: string;
    remotePath: string;
}

export interface ExtensionState {
    isConnected: boolean;
    currentServer?: string;
    lastSyncTime?: Date;
    syncInProgress: boolean;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    message: string;
    error?: Error;
}