"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformUtils = void 0;
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class PlatformUtils {
    static getPlatform() {
        if (this.platform === 'win32')
            return 'windows';
        if (this.platform === 'darwin')
            return 'macos';
        if (this.platform === 'linux')
            return 'linux';
        return 'unknown';
    }
    static getDefaultSSHKeyPaths() {
        const platform = this.getPlatform();
        const keys = [];
        if (platform === 'windows') {
            keys.push({
                path: path.join(this.homeDir, '.ssh', 'id_rsa'),
                type: 'RSA',
                description: 'Default RSA key'
            }, {
                path: path.join(this.homeDir, '.ssh', 'id_ed25519'),
                type: 'Ed25519',
                description: 'Default Ed25519 key'
            }, {
                path: path.join(this.homeDir, '.ssh', 'id_ecdsa'),
                type: 'ECDSA',
                description: 'Default ECDSA key'
            });
        }
        else {
            keys.push({
                path: path.join(this.homeDir, '.ssh', 'id_rsa'),
                type: 'RSA',
                description: 'Default RSA key'
            }, {
                path: path.join(this.homeDir, '.ssh', 'id_ed25519'),
                type: 'Ed25519',
                description: 'Default Ed25519 key'
            }, {
                path: path.join(this.homeDir, '.ssh', 'id_ecdsa'),
                type: 'ECDSA',
                description: 'Default ECDSA key'
            }, {
                path: path.join(this.homeDir, '.ssh', 'id_dsa'),
                type: 'DSA',
                description: 'Legacy DSA key'
            });
            if (platform === 'linux') {
                keys.push({
                    path: '/etc/ssh/ssh_host_rsa_key',
                    type: 'RSA',
                    description: 'System RSA key'
                }, {
                    path: '/etc/ssh/ssh_host_ecdsa_key',
                    type: 'ECDSA',
                    description: 'System ECDSA key'
                }, {
                    path: '/etc/ssh/ssh_host_ed25519_key',
                    type: 'Ed25519',
                    description: 'System Ed25519 key'
                });
            }
        }
        return keys;
    }
    static async detectAvailableSSHKeys() {
        const allKeys = this.getDefaultSSHKeyPaths();
        const availableKeys = [];
        for (const key of allKeys) {
            try {
                await fs.promises.access(key.path, fs.constants.R_OK);
                const stats = await fs.promises.stat(key.path);
                if (stats.isFile()) {
                    availableKeys.push(key);
                }
            }
            catch {
            }
        }
        return availableKeys;
    }
    static async readSSHKeyContent(keyPath) {
        try {
            const content = await fs.promises.readFile(keyPath, 'utf8');
            return content.trim();
        }
        catch (error) {
            return null;
        }
    }
    static validateSSHKeyContent(content) {
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
        const hasValidHeader = validHeaders.some(header => trimmedContent.includes(header));
        const hasValidFooter = validFooters.some(footer => trimmedContent.includes(footer));
        return hasValidHeader && hasValidFooter;
    }
    static normalizePath(filePath) {
        const platform = this.getPlatform();
        if (platform === 'windows') {
            return path.normalize(filePath).replace(/\//g, '\\');
        }
        else {
            return filePath.replace(/\\/g, '/');
        }
    }
    static getUserSSHDir() {
        return path.join(this.homeDir, '.ssh');
    }
    static getSystemSSHConfig() {
        const platform = this.getPlatform();
        if (platform === 'windows') {
            return path.join(process.env.ALLUSERSPROFILE || 'C:\\ProgramData', 'ssh');
        }
        else {
            return '/etc/ssh';
        }
    }
    static expandHomePath(filePath) {
        if (filePath.startsWith('~/')) {
            return path.join(this.homeDir, filePath.slice(2));
        }
        return filePath;
    }
    static getFilePermissions(filePath) {
        try {
            const stats = fs.statSync(filePath);
            return (stats.mode & parseInt('777', 8)).toString(8);
        }
        catch {
            return null;
        }
    }
    static checkSSHConfig() {
        const configPath = path.join(this.getUserSSHDir(), 'config');
        try {
            const content = fs.readFileSync(configPath, 'utf8');
            return { exists: true, content };
        }
        catch {
            return { exists: false, content: '' };
        }
    }
    static parseSSHConfig(content) {
        const lines = content.split('\n');
        const configs = [];
        let currentConfig = null;
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('Host ')) {
                if (currentConfig) {
                    configs.push(currentConfig);
                }
                currentConfig = { host: trimmedLine.slice(5).trim() };
            }
            else if (currentConfig && trimmedLine.includes(' ')) {
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
exports.PlatformUtils = PlatformUtils;
PlatformUtils.platform = os.platform();
PlatformUtils.homeDir = os.homedir();
//# sourceMappingURL=PlatformUtils.js.map