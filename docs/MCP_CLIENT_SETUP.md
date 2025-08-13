# MCP Client Setup Guide

This guide shows how to configure various MCP clients to work with Express-MCP.

## Quick Start

Express-MCP now includes a native MCP server using the official `@modelcontextprotocol/sdk`:

```bash
# Install
npm install expressjs-mcp

# Run native MCP server
npx expressjs-mcp --url http://localhost:3000/mcp
```

## Client Configurations

### Claude Desktop

Create or update `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "express-app": {
      "command": "npx",
      "args": ["expressjs-mcp", "--url", "http://localhost:3000/mcp"]
    }
  }
}
```

### Cursor IDE

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "express-app": {
      "command": "npx",
      "args": ["expressjs-mcp", "--url", "http://localhost:3000/mcp"]
    }
  }
}
```

### VS Code with MCP Extension

Add to VS Code settings:

```json
{
  "mcp.servers": [
    {
      "name": "express-app",
      "command": "npx",
      "args": ["expressjs-mcp", "--url", "http://localhost:3000/mcp"]
    }
  ]
}
```

## Environment Variables

You can also use environment variables:

```bash
# Set the Express MCP URL
export EXPRESS_MCP_URL=http://localhost:3000/mcp

# Run the server
npx expressjs-mcp
```

## Advanced Configuration

### With Debug Logging

```json
{
  "mcpServers": {
    "express-app": {
      "command": "npx",
      "args": ["expressjs-mcp", "--url", "http://localhost:3000/mcp", "--debug"]
    }
  }
}
```

### With Custom Environment

```json
{
  "mcpServers": {
    "express-app": {
      "command": "npx",
      "args": ["expressjs-mcp", "--url", "http://localhost:3000/mcp"],
      "env": {
        "DEBUG": "true",
        "NODE_ENV": "development"
      }
    }
  }
}
```

## Testing the Connection

### 1. Start Your Express Server

```bash
# Start your Express app with MCP
node your-app.js
```

### 2. Test MCP Server

```bash
# Test the native MCP server
npx expressjs-mcp --url http://localhost:3000/mcp --debug
```

### 3. Verify Tools

```bash
# Check available tools
curl http://localhost:3000/mcp/tools
```

## Troubleshooting

### Server Not Starting

```bash
# Check if Express server is running
curl http://localhost:3000/mcp/tools

# Enable debug mode
npx expressjs-mcp --debug

# Check logs
EXPRESS_MCP_URL=http://localhost:3000/mcp DEBUG=true npx expressjs-mcp
```

### Tools Not Found

```bash
# Verify tools are registered
curl http://localhost:3000/mcp/tools | jq '.tools[].name'

# Check MCP server connection
npx expressjs-mcp --url http://localhost:3000/mcp --debug
```

### Permission Issues

```bash
# Make binary executable
chmod +x node_modules/.bin/expressjs-mcp

# Or use npx
npx expressjs-mcp
```

## Migration from Bridge Scripts

If you were using the old bridge scripts:

### Old Configuration

```json
{
  "mcpServers": {
    "express-app": {
      "command": "node",
      "args": ["/path/to/scripts/mcp-bridge.cjs"],
      "env": {
        "EXPRESS_MCP_URL": "http://localhost:3000/mcp"
      }
    }
  }
}
```

### New Configuration

```json
{
  "mcpServers": {
    "express-app": {
      "command": "npx",
      "args": ["expressjs-mcp", "--url", "http://localhost:3000/mcp"]
    }
  }
}
```

## Benefits of Native Implementation

1. **Official SDK**: Uses Anthropic's official MCP SDK
2. **Better Performance**: Direct stdio communication
3. **Type Safety**: Full TypeScript support
4. **Error Handling**: Proper MCP error codes
5. **Maintainability**: Less custom code to maintain
6. **Compatibility**: Guaranteed protocol compliance
7. **Future Proof**: Updates with SDK improvements

## Next Steps

- See [MCP_NATIVE_SETUP.md](./MCP_NATIVE_SETUP.md) for detailed setup
- See [examples](../examples/) for usage examples
- Report issues on GitHub
