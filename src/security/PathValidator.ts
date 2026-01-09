import path from 'path';
import { SCPConfig } from '../types';

export class PathValidator {
    private static readonly DANGEROUS_PATTERNS = [
        /\.\.[\/\\]/,
        /[\/\\]\.\./,
        /^[\/\\]/,
        /[<>:"|?*]/,
        /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i
    ];

    static isValidPath(inputPath: string): boolean {
        if (!inputPath || typeof inputPath !== 'string') {
            return false;
        }

        const normalizedPath = inputPath.replace(/\\/g, '/');
        
        for (const pattern of this.DANGEROUS_PATTERNS) {
            if (pattern.test(normalizedPath)) {
                return false;
            }
        }

        if (normalizedPath.length > 4096) {
            return false;
        }

        return true;
    }

    static sanitizePath(inputPath: string): string {
        if (!inputPath) {
            return '';
        }

        return inputPath
            .replace(/[<>:"|?*]/g, '_')
            .replace(/\.\.[\/\\]/g, '')
            .replace(/[\/\\]\.\./g, '')
            .trim();
    }

    static validateRemotePath(remotePath: string, config: SCPConfig): boolean {
        if (!this.isValidPath(remotePath)) {
            return false;
        }

        const normalizedRemote = path.normalize(remotePath).replace(/\\/g, '/');
        const normalizedBase = path.normalize(config.remotePath).replace(/\\/g, '/');

        if (!normalizedRemote.startsWith(normalizedBase)) {
            return false;
        }

        return true;
    }

    static validateIgnorePatterns(ignore: string[]): string[] {
        if (!Array.isArray(ignore)) {
            return ['.git', '.vscode', 'node_modules'];
        }

        return ignore.filter(pattern => {
            if (typeof pattern !== 'string') {
                return false;
            }

            return !pattern.includes('..') && pattern.length > 0 && pattern.length < 256;
        });
    }

    static escapeShellArg(arg: string): string {
        if (!arg) {
            return '';
        }

        return `'${arg.replace(/'/g, "'\"'\"'")}'`;
    }
}