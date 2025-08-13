# GitHub Actions & NPM Publishing Setup

This document outlines the steps needed to set up automated npm publishing for your Express MCP fork.

## Prerequisites

1. **Fork the repository** to your GitHub account
2. **Create npm account** at [npmjs.com](https://www.npmjs.com)
3. **Generate npm token** for publishing

## Setup Steps

### 1. Update Repository Information

Edit `package.json` to update the repository URLs:

```json
{
  "homepage": "https://github.com/bowen31337/expressjs_mcp#readme",
  "repository": {
    "type": "git",
    "url": "https://github.com/bowen31337/expressjs_mcp.git"
  },
  "bugs": {
    "url": "https://github.com/bowen31337/expressjs_mcp/issues"
  },
  "author": {
    "name": "Your Name",
    "email": "your-email@example.com"
  }
}
```

### 2. Configure NPM Token

1. Go to [npmjs.com](https://www.npmjs.com) → Account Settings → Access Tokens
2. Create a new "Granular Access Token" with publish permissions
3. In your GitHub repository: Settings → Secrets and variables → Actions
4. Add secret named `NPM_TOKEN` with your npm access token

**Repository URL**: https://github.com/bowen31337/expressjs_mcp

### 3. Verify GitHub Actions

The workflow is already configured in `.github/workflows/publish.yml`. It will:

- Run tests and linting on all pushes and PRs
- Automatically publish to npm when main branch is updated (if version changed)
- Create GitHub releases

### 4. Test the Workflow

1. **Update version** in `package.json`:
   ```bash
   npm version patch  # 0.1.0 → 0.1.1
   ```

2. **Commit and push**:
   ```bash
   git add package.json
   git commit -m "Release v0.1.1"
   git push origin main
   ```

3. **Check GitHub Actions**: Go to Actions tab and verify workflow runs

4. **Verify publication**: Check your package at `https://www.npmjs.com/package/expressjs-mcp`

## Package Name Conflicts

If `expressjs-mcp` is already taken on npm, update the name in `package.json`:

```json
{
  "name": "@your-username/expressjs-mcp",
  // or
  "name": "expressjs-mcp-fork"
}
```

## Usage After Publishing

Once published, users can install your package:

```bash
# Install from npm
npm install -g expressjs-mcp  # or your package name
# or
pnpm add -g expressjs-mcp

# Use with npx
npx expressjs-mcp init
npx expressjs-mcp test --url http://localhost:3000/mcp
```

## Troubleshooting

### Common Issues

1. **NPM_TOKEN not working**: Ensure the token has publish permissions
2. **Version conflicts**: Version in package.json must be new/unique
3. **Test failures**: All tests must pass before publishing
4. **Package name taken**: Use scoped name `@username/package-name`

### Manual Publishing

If automated publishing fails, you can publish manually:

```bash
npm login
pnpm build
npm publish --access public
```

## Documentation Updates

The following documentation files have been updated to reflect npm availability:

- `README.md` - Installation and quick start instructions
- `docs/QUICK_MCP_SETUP.md` - Setup instructions with npm options
- `docs/PUBLISHING.md` - Complete publishing workflow documentation

All documentation now includes both npm package installation and local development options.
