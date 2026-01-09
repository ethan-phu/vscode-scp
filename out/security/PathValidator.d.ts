import { SCPConfig } from '../types';
export declare class PathValidator {
    private static readonly DANGEROUS_PATTERNS;
    static isValidPath(inputPath: string): boolean;
    static sanitizePath(inputPath: string): string;
    static validateRemotePath(remotePath: string, config: SCPConfig): boolean;
    static validateIgnorePatterns(ignore: string[]): string[];
    static escapeShellArg(arg: string): string;
}
//# sourceMappingURL=PathValidator.d.ts.map