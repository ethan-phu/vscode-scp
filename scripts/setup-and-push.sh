#!/bin/bash

set -e

echo "=== VSCode SCP Extension - Git Setup ==="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "Initializing git repository..."
    git init
    git config user.name "VSCode SCP Extension"
    git config user.email "extension@vscode-scp.com"
    git config commit.gpgsign true
fi

# Create or switch to feature branch
BRANCH_NAME="feature/multi-key-and-visual-config"
echo "Creating/switching to branch: $BRANCH_NAME"
git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"

# Stage all relevant files
echo "Staging files for commit..."
git add .

# Create commit
COMMIT_MESSAGE="feat: add cross-platform support and multi-key management

- Implement cross-platform path handling for Windows/Mac/Linux
- Add support for multiple SSH key storage and management
- Add automatic SSH key detection across platforms  
- Add visual configuration manager with remote file browser
- Add enhanced credential management interface
- Support common SSH key formats (RSA, Ed25519, ECDSA, DSA)
- Secure credential storage using VSCode SecretStorage API
- Improve password authentication workflow"

echo "Creating commit: $COMMIT_MESSAGE"
git commit -m "$COMMIT_MESSAGE"

# Check if remote exists
REMOTE_EXISTS=false
if git remote get-url origin >/dev/null 2>&1; then
    REMOTE_EXISTS=true
fi

if [ "$REMOTE_EXISTS" = false ]; then
    echo "Setting up remote repository..."
    git remote add origin https://github.com/TobiasHu2021/vscode-scp.git
fi

# Push to remote
echo "Pushing to remote repository..."
git push origin "$BRANCH_NAME"

echo ""
echo "=== Git Setup Complete ==="
echo "✅ Branch: $BRANCH_NAME"
echo "✅ Remote: $(git remote get-url origin)"
echo "✅ Commit: $COMMIT_MESSAGE"
echo "✅ All changes pushed to remote repository!"
echo ""
echo "📋 Repository: https://github.com/TobiasHu2021/vscode-scp"
echo ""
echo "Next steps:"
echo "1. Create Pull Request: https://github.com/TobiasHu2021/vscode-scp/compare/main...$BRANCH_NAME"
echo "2. Merge Pull Request once reviewed"
echo "3. Release new version to VSCode Marketplace"