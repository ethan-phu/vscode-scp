"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathValidator = void 0;
const path_1 = __importDefault(require("path"));
class PathValidator {
    static isValidPath(inputPath) {
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
    static sanitizePath(inputPath) {
        if (!inputPath) {
            return '';
        }
        return inputPath
            .replace(/[<>:"|?*]/g, '_')
            .replace(/\.\.[\/\\]/g, '')
            .replace(/[\/\\]\.\./g, '')
            .trim();
    }
    static validateRemotePath(remotePath, config) {
        if (!this.isValidPath(remotePath)) {
            return false;
        }
        const normalizedRemote = path_1.default.normalize(remotePath).replace(/\\/g, '/');
        const normalizedBase = path_1.default.normalize(config.remotePath).replace(/\\/g, '/');
        if (!normalizedRemote.startsWith(normalizedBase)) {
            return false;
        }
        return true;
    }
    static validateIgnorePatterns(ignore) {
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
    static escapeShellArg(arg) {
        if (!arg) {
            return '';
        }
        return `'${arg.replace(/'/g, "'\"'\"'")}'`;
    }
}
exports.PathValidator = PathValidator;
PathValidator.DANGEROUS_PATTERNS = [
    /\.\.[\/\\]/,
    /[\/\\]\.\./,
    /^[\/\\]/,
    /[<>:"|?*]/,
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i
];
//# sourceMappingURL=PathValidator.js.map