# Working MCP Client Configurations

This guide provides **working configurations** for MCP clients with Express MCP before publishing to npm registry.

## 🚨 **Important Note**

The `npx expressjs-mcp` commands in other documentation **won't work** until the package is published to npm. Use the configurations below instead.

## ✅ **Working Solutions**

### **Option 1: Direct Node.js Execution (Recommended)**

Use absolute paths to the MCP bridge script.

#### Claude Desktop

Create or update `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "expressjs-mcp-basic": {
      "command": "node",
      "args": ["/path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs"],
      "env": {
        "EXPRESS_MCP_URL": "http://localhost:3000/mcp",
        "DEBUG": "false"
      }
    }
  }
}
```

**Replace `/path/to/your/expressjs_mcp` with your actual project path!**

#### Cursor IDE

Add to your Cursor settings (`.cursor-settings/settings.json`):

```json
{
  "mcp.servers": {
    "expressjs-mcp-basic": {
      "command": "node", 
      "args": ["/path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs"],
      "env": {
        "EXPRESS_MCP_URL": "http://localhost:3000/mcp",
        "DEBUG": "false"
      }
    }
  }
}
```

#### VS Code with MCP Extension

Add to VS Code settings:

```json
{
  "mcp.servers": [
    {
      "name": "expressjs-mcp-basic",
      "command": "node",
      "args": ["/path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs"],
      "env": {
        "EXPRESS_MCP_URL": "http://localhost:3000/mcp",
        "DEBUG": "false"
      }
    }
  ]
}
```

### **Option 2: Create Global Symlink**

Make it globally available without publishing:

```bash
# From your project root
cd /path/to/your/expressjs_mcp

# Create global symlink
npm link

# Now npx commands will work
npx expressjs-mcp bridge --url http://localhost:3000/mcp
```

After `npm link`, you can use the original `npx` configurations:

```json
{
  "mcpServers": {
    "expressjs-mcp-basic": {
      "command": "npx",
      "args": ["expressjs-mcp", "bridge"],
      "env": {
        "EXPRESS_MCP_URL": "http://localhost:3000/mcp"
      }
    }
  }
}
```

### **Option 3: Use pnpm Scripts**

If you're in the project directory, you can use package scripts.

```json
{
  "mcpServers": {
    "expressjs-mcp-basic": {
      "command": "pnpm",
      "args": ["mcp-bridge"],
      "cwd": "/path/to/your/expressjs_mcp",
      "env": {
        "EXPRESS_MCP_URL": "http://localhost:3000/mcp"
      }
    }
  }
}
```

## 🧪 **Testing Your Configuration**

### 1. Test the MCP Bridge Manually

```bash
# Test direct node execution
node /path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs

# Test with environment variable
EXPRESS_MCP_URL=http://localhost:3000/mcp node /path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs

# Test if npm link worked (if you used Option 2)
npx expressjs-mcp bridge --url http://localhost:3000/mcp
```

### 2. Test MCP Communication

```bash
# Start your Express server first
cd /path/to/your/expressjs_mcp/examples/basic
npx tsx server.ts

# In another terminal, test the bridge
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | \
  node /path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs
```

Expected output:
```json
{"jsonrpc":"2.0","id":1,"result":{"tools":[{"name":"GET_/api/users","description":"Get all users",...}]}}
```

## 🔧 **Environment Variables**

Set these environment variables for proper configuration:

```bash
# Required
export EXPRESS_MCP_URL="http://localhost:3000/mcp"

# Optional
export DEBUG="true"          # Enable debug logging
export TIMEOUT="30000"       # Request timeout in milliseconds
```

## 📋 **Complete Working Example**

### Step 1: Start Express Server
```bash
cd /path/to/your/expressjs_mcp/examples/basic
npx tsx server.ts
```

### Step 2: Configure Claude Desktop
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "expressjs-mcp-basic": {
      "command": "node",
      "args": ["/path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs"],
      "env": {
        "EXPRESS_MCP_URL": "http://localhost:3000/mcp",
        "DEBUG": "false"
      }
    }
  }
}
```

### Step 3: Restart Claude Desktop

### Step 4: Test in Claude
Ask Claude: "What tools are available?" or "Get the list of users from the API"

## 🚨 **Troubleshooting**

### "Command not found" Error
```bash
# Check if the file exists and is executable
ls -la /path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs

# Make it executable if needed
chmod +x /path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs
```

### "Cannot connect to server" Error
```bash
# Check if Express server is running
curl http://localhost:3000/mcp/tools

# Check if the bridge can connect
EXPRESS_MCP_URL=http://localhost:3000/mcp node /path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs
```

### "Module not found" Error
```bash
# Make sure you're using the .cjs extension
node /path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs

# Check Node.js version (should be 18+)
node --version
```

## 🚀 **Publishing to NPM (Future)**

To make `npx expressjs-mcp` work globally, you'll need to:

1. **Update package.json**:
```json
{
  "name": "expressjs-mcp",
  "version": "1.0.0",
  "private": false,
  "bin": {
    "expressjs-mcp": "./bin/express-mcp.cjs"
  }
}
```

2. **Publish to npm**:
```bash
# Build the project
pnpm build

# Login to npm
npm login

# Publish
npm publish
```

3. **Then users can use**:
```bash
npx expressjs-mcp bridge --url http://localhost:3000/mcp
```

## 📖 **Alternative: Local Package Installation**

You can also install the package locally in other projects:

```bash
# In another project
npm install /path/to/your/expressjs_mcp

# Then use
npx expressjs-mcp bridge --url http://localhost:3000/mcp
```

## ✅ **Recommended Approach**

For development and testing, use **Option 1 (Direct Node.js Execution)** as it's:
- ✅ Most reliable
- ✅ Doesn't require npm link
- ✅ Works immediately
- ✅ Easy to debug

For production or sharing with others, consider publishing to npm registry.
