import * as assert from 'assert';
import * as vscode from 'vscode';
import { PathValidator } from '../src/security/PathValidator';

suite('PathValidator Tests', () => {
    test('should validate safe paths', () => {
        assert.strictEqual(PathValidator.isValidPath('src/index.ts'), true);
        assert.strictEqual(PathValidator.isValidPath('docs/readme.md'), true);
        assert.strictEqual(PathValidator.isValidPath('config.json'), true);
    });

    test('should reject dangerous paths', () => {
        assert.strictEqual(PathValidator.isValidPath('../etc/passwd'), false);
        assert.strictEqual(PathValidator.isValidPath('../../../root'), false);
        assert.strictEqual(PathValidator.isValidPath('/etc/passwd'), false);
        assert.strictEqual(PathValidator.isValidPath('CON'), false);
        assert.strictEqual(PathValidator.isValidPath('path with "quotes"'), false);
        assert.strictEqual(PathValidator.isValidPath('path|with|pipes'), false);
    });

    test('should sanitize paths correctly', () => {
        assert.strictEqual(PathValidator.sanitizePath('path with "quotes"'), 'path_with_quotes_');
        assert.strictEqual(PathValidator.sanitizePath('path|with|pipes'), 'pathwithpipes');
        assert.strictEqual(PathValidator.sanitizePath('../dangerous/path'), 'dangerouspath');
        assert.strictEqual(PathValidator.sanitizePath(''), '');
    });

    test('should validate ignore patterns', () => {
        const validPatterns = ['.git', 'node_modules', '*.tmp'];
        const invalidPatterns = ['../dangerous', '', 'very-long-pattern-'.repeat(50)];
        
        const result = PathValidator.validateIgnorePatterns([...validPatterns, ...invalidPatterns]);
        
        assert.deepStrictEqual(result, validPatterns);
    });

    test('should escape shell arguments', () => {
        assert.strictEqual(PathValidator.escapeShellArg('normal/path'), "'normal/path'");
        assert.strictEqual(PathValidator.escapeShellArg("path with 'quotes'"), "'path with '\"'\"'\"'quotes'\"'\"''");
        assert.strictEqual(PathValidator.escapeShellArg(''), "''");
    });
});