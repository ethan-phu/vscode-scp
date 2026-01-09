export interface SSHKeyInfo {
    path: string;
    type: string;
    description: string;
}
export declare class PlatformUtils {
    private static readonly platform;
    private static readonly homeDir;
    static getPlatform(): 'windows' | 'macos' | 'linux' | 'unknown';
    static getDefaultSSHKeyPaths(): SSHKeyInfo[];
    static detectAvailableSSHKeys(): Promise<SSHKeyInfo[]>;
    static readSSHKeyContent(keyPath: string): Promise<string | null>;
    static validateSSHKeyContent(content: string): boolean;
    static normalizePath(filePath: string): string;
    static getUserSSHDir(): string;
    static getSystemSSHConfig(): string;
    static expandHomePath(filePath: string): string;
    static getFilePermissions(filePath: string): string | null;
    static checkSSHConfig(): {
        exists: boolean;
        content: string;
    };
    static parseSSHConfig(content: string): Array<{
        host: string;
        user?: string;
        keyFile?: string;
        port?: number;
    }>;
}
//# sourceMappingURL=PlatformUtils.d.ts.map