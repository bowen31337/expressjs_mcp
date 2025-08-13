# Publishing & CI/CD

This document describes the automated publishing workflow for Express MCP to npm registry.

## Automated Publishing

Express MCP automatically publishes to npm when code is pushed to the main branch, provided the version has been updated.

### How It Works

1. **Code Push**: When code is pushed to the `main` branch
2. **CI/CD Trigger**: GitHub Actions workflow runs automatically
3. **Tests & Linting**: All tests and linting checks must pass
4. **Version Check**: Workflow checks if the version in `package.json` already exists on npm
5. **Conditional Publish**: Only publishes if the version is new
6. **GitHub Release**: Creates a GitHub release with the new version tag

### GitHub Actions Workflow

The workflow (`.github/workflows/publish.yml`) includes:

- **Test Job**: Runs on all pushes and PRs
  - Linting with Biome
  - Unit tests with Vitest  
  - TypeScript build
  
- **Publish Job**: Runs only on main branch pushes
  - Version verification
  - NPM publishing
  - GitHub release creation

## Manual Publishing

To publish a new version manually:

### 1. Update Version
```bash
# Update version in package.json
npm version patch  # or minor, major
# or manually edit package.json

# Commit the version change
git add package.json
git commit -m "Release v0.1.1"
git push origin main
```

### 2. Automatic Publishing
The GitHub Actions workflow will automatically:
- Run tests and linting
- Build the package
- Check if version exists on npm
- Publish to npm if version is new
- Create GitHub release

### 3. Verify Publication
Check that the package was published:
```bash
npm info expressjs-mcp
npm install expressjs-mcp@latest
```

## Requirements for Publishing

### NPM Token
The GitHub repository needs an `NPM_TOKEN` secret configured:

1. Go to [npmjs.com](https://www.npmjs.com) and create an access token
2. In GitHub repo settings, go to Secrets and Variables > Actions
3. Add secret named `NPM_TOKEN` with your npm access token

### Package Configuration

The `package.json` is configured for publishing with:

- `"private": false` (removed private flag)
- `publishConfig.access: "public"` for public npm packages
- Proper `files` array to include only necessary files
- Complete metadata (description, keywords, repository, etc.)

### Repository Settings

Ensure the GitHub repository has:
- `GITHUB_TOKEN` (automatically available)
- `NPM_TOKEN` secret configured
- Main branch protection if desired

## Package Distribution

Once published, users can install the package:

```bash
# Install globally
npm install -g expressjs-mcp
pnpm add -g expressjs-mcp

# Use with npx (no installation)
npx expressjs-mcp init
npx expressjs-mcp test --url http://localhost:3000/mcp

# Install in project
npm install expressjs-mcp
pnpm add expressjs-mcp
```

## Troubleshooting

### Publishing Failed

1. **Check NPM Token**: Ensure `NPM_TOKEN` secret is correctly set
2. **Version Conflict**: Version might already exist on npm
3. **Test Failures**: Fix failing tests or linting errors
4. **Build Errors**: Fix TypeScript compilation issues

### Version Not Publishing

1. **Version Check**: Ensure version in `package.json` is updated
2. **Branch**: Only main branch pushes trigger publishing
3. **Tests**: All tests must pass before publishing

### Manual Override

To force publish (use carefully):
```bash
# Local publishing (requires npm login)
pnpm build
npm publish --access public

# Skip version check
npm publish --access public --force
```

## Development Workflow

### Recommended Version Bumping

```bash
# Bug fixes
npm version patch

# New features
npm version minor

# Breaking changes  
npm version major

# Custom version
npm version 1.2.3
```

### Pre-release Versions

For pre-release versions:
```bash
# Alpha/beta versions
npm version 1.2.3-alpha.1
npm version 1.2.3-beta.1

# Release candidates
npm version 1.2.3-rc.1
```

## Package Registry

- **Registry**: https://registry.npmjs.org/
- **Package Page**: https://www.npmjs.com/package/expressjs-mcp
- **Scope**: Public package (no scoping)
- **Access**: Public (anyone can install)

## Release Notes

GitHub releases are automatically created with:
- Version tag (e.g., `v0.1.1`)
- Installation instructions
- Link to npm package
- Changelog template (can be manually edited)

The release notes can be enhanced by manually editing the release after creation to include:
- Feature highlights
- Breaking changes
- Migration notes
- Bug fixes
