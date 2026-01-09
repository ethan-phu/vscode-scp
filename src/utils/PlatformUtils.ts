import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

export interface SSHKeyInfo {
    path: string;
    type: string;
    description: string;
}

export class PlatformUtils {
    private static readonly platform = os.platform();
    private static readonly homeDir = os.homedir();

    static getPlatform(): 'windows' | 'macos' | 'linux' | 'unknown' {
        if (this.platform === 'win32') return 'windows';
        if (this.platform === 'darwin') return 'macos';
        if (this.platform === 'linux') return 'linux';
        return 'unknown';
    }

    static getDefaultSSHKeyPaths(): SSHKeyInfo[] {
        const platform = this.getPlatform();
        const keys: SSHKeyInfo[] = [];

        if (platform === 'windows') {
            keys.push(
                {
                    path: path.join(this.homeDir, '.ssh', 'id_rsa'),
                    type: 'RSA',
                    description: 'Default RSA key'
                },
                {
                    path: path.join(this.homeDir, '.ssh', 'id_ed25519'),
                    type: 'Ed25519',
                    description: 'Default Ed25519 key'
                },
                {
                    path: path.join(this.homeDir, '.ssh', 'id_ecdsa'),
                    type: 'ECDSA',
                    description: 'Default ECDSA key'
                }
            );
        } else {
            keys.push(
                {
                    path: path.join(this.homeDir, '.ssh', 'id_rsa'),
                    type: 'RSA',
                    description: 'Default RSA key'
                },
                {
                    path: path.join(this.homeDir, '.ssh', 'id_ed25519'),
                    type: 'Ed25519',
                    description: 'Default Ed25519 key'
                },
                {
                    path: path.join(this.homeDir, '.ssh', 'id_ecdsa'),
                    type: 'ECDSA',
                    description: 'Default ECDSA key'
                },
                {
                    path: path.join(this.homeDir, '.ssh', 'id_dsa'),
                    type: 'DSA',
                    description: 'Legacy DSA key'
                }
            );

            if (platform === 'linux') {
                keys.push(
                    {
                        path: '/etc/ssh/ssh_host_rsa_key',
                        type: 'RSA',
                        description: 'System RSA key'
                    },
                    {
                        path: '/etc/ssh/ssh_host_ecdsa_key',
                        type: 'ECDSA',
                        description: 'System ECDSA key'
                    },
                    {
                        path: '/etc/ssh/ssh_host_ed25519_key',
                        type: 'Ed25519',
                        description: 'System Ed25519 key'
                    }
                );
            }
        }

        return keys;
    }

    static async detectAvailableSSHKeys(): Promise<SSHKeyInfo[]> {
        const allKeys = this.getDefaultSSHKeyPaths();
        const availableKeys: SSHKeyInfo[] = [];

        for (const key of allKeys) {
            try {
                await fs.promises.access(key.path, fs.constants.R_OK);
                const stats = await fs.promises.stat(key.path);
                if (stats.isFile()) {
                    availableKeys.push(key);
                }
            } catch {
            }
        }

        return availableKeys;
    }

    static async readSSHKeyContent(keyPath: string): Promise<string | null> {
        try {
            const content = await fs.promises.readFile(keyPath, 'utf8');
            return content.trim();
        } catch (error) {
            return null;
        }
    }

    static validateSSHKeyContent(content: string): boolean {
        if (!content || content.trim().length === 0) {
            return false;
        }

        const trimmedContent = content.trim();
        
        // Check for SSH private key headers
        const validHeaders = [
            '-----BEGIN RSA PRIVATE KEY-----',
            '-----BEGIN DSA PRIVATE KEY-----',
            '-----BEGIN EC PRIVATE KEY-----',
            '-----BEGIN OPENSSH PRIVATE KEY-----',
            '-----BEGIN PRIVATE KEY-----'
        ];

        const validFooters = [
            '-----END RSA PRIVATE KEY-----',
            '-----END DSA PRIVATE KEY-----',
            '-----END EC PRIVATE KEY-----',
            '-----END OPENSSH PRIVATE KEY-----',
            '-----END PRIVATE KEY-----'
        ];

        const hasValidHeader = validHeaders.some(header => 
            trimmedContent.includes(header)
        );

        const hasValidFooter = validFooters.some(footer => 
            trimmedContent.includes(footer)
        );

        return hasValidHeader && hasValidFooter;
    }

    static normalizePath(filePath: string): string {
        const platform = this.getPlatform();
        
        if (platform === 'windows') {
            return path.normalize(filePath).replace(/\//g, '\\');
        } else {
            return filePath.replace(/\\/g, '/');
        }
    }

    static getUserSSHDir(): string {
        return path.join(this.homeDir, '.ssh');
    }

    static getSystemSSHConfig(): string {
        const platform = this.getPlatform();
        
        if (platform === 'windows') {
            return path.join(process.env.ALLUSERSPROFILE || 'C:\\ProgramData', 'ssh');
        } else {
            return '/etc/ssh';
        }
    }

    static expandHomePath(filePath: string): string {
        if (filePath.startsWith('~/')) {
            return path.join(this.homeDir, filePath.slice(2));
        }
        return filePath;
    }

    static getFilePermissions(filePath: string): string | null {
        try {
            const stats = fs.statSync(filePath);
            return (stats.mode & parseInt('777', 8)).toString(8);
        } catch {
            return null;
        }
    }

    static checkSSHConfig(): { exists: boolean; content: string } {
        const configPath = path.join(this.getUserSSHDir(), 'config');
        
        try {
            const content = fs.readFileSync(configPath, 'utf8');
            return { exists: true, content };
        } catch {
            return { exists: false, content: '' };
        }
    }

    static parseSSHConfig(content: string): Array<{ host: string; user?: string; keyFile?: string; port?: number }> {
        const lines = content.split('\n');
        const configs: Array<{ host: string; user?: string; keyFile?: string; port?: number }> = [];
        let currentConfig: { host: string; user?: string; keyFile?: string; port?: number } | null = null;

        for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (trimmedLine.startsWith('Host ')) {
                if (currentConfig) {
                    configs.push(currentConfig);
                }
                currentConfig = { host: trimmedLine.slice(5).trim() };
            } else if (currentConfig && trimmedLine.includes(' ')) {
                const [key, value] = trimmedLine.split(/\s+/, 2);
                
                switch (key.toLowerCase()) {
                    case 'user':
                        currentConfig.user = value;
                        break;
                    case 'identityfile':
                        currentConfig.keyFile = value.replace(/~/g, this.homeDir);
                        break;
                    case 'port':
                        currentConfig.port = parseInt(value);
                        break;
                }
            }
        }

        if (currentConfig) {
            configs.push(currentConfig);
        }

        return configs;
    }
}