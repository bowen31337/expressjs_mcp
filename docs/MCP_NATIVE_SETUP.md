# Native MCP Server Setup

Express-MCP now includes a native MCP server implementation using the official `@modelcontextprotocol/sdk` package, eliminating the need for bridge scripts.

## Installation

```bash
npm install expressjs-mcp
# or
pnpm add expressjs-mcp
```

## Usage Options

### Option 1: Connect to Remote Express Server

If you have an Express server running with MCP endpoints:

```bash
# Connect to local server
npx expressjs-mcp

# Connect to remote server
npx expressjs-mcp --url https://api.example.com/mcp

# With debug logging
npx expressjs-mcp --debug
```

### Option 2: Embedded Express App

Create a standalone MCP server with embedded Express app:

```typescript
import express from "express";
import { ExpressMCPServer } from "expressjs-mcp/mcp-server";

const app = express();

// Define your routes
app.get("/hello", (req, res) => {
  res.json({ message: "Hello from Express!" });
});

// Create MCP server with embedded app
const server = new ExpressMCPServer({
  expressApp: app,
  name: "my-express-mcp",
  version: "1.0.0",
});

// Start the server
server.startWithApp(app, { port: 3000 });
```

### Option 3: Programmatic Usage

```typescript
import { ExpressMCPServer } from "expressjs-mcp/mcp-server";

const server = new ExpressMCPServer({
  baseUrl: "http://localhost:3000/mcp",
  debug: true,
});

await server.start();
```

## MCP Client Configuration

### Claude Desktop

Update `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "express-app": {
      "command": "npx",
      "args": ["expressjs-mcp", "--url", "http://localhost:3000/mcp"],
      "env": {}
    }
  }
}
```

Or if installed globally:

```json
{
  "mcpServers": {
    "express-app": {
      "command": "expressjs-mcp",
      "args": ["--url", "http://localhost:3000/mcp"],
      "env": {}
    }
  }
}
```

### Cursor IDE

Update `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "express-app": {
      "command": "npx",
      "args": ["expressjs-mcp"],
      "env": {
        "EXPRESS_MCP_URL": "http://localhost:3000/mcp"
      }
    }
  }
}
```

### Environment Variables

You can configure the server using environment variables:

```bash
# Set the Express MCP URL
export EXPRESS_MCP_URL=https://api.example.com/mcp

# Enable debug logging
export DEBUG=true

# Run the server
npx expressjs-mcp
```

## Features

### Direct SDK Integration

- Uses official `@modelcontextprotocol/sdk` package
- No bridge scripts needed
- Native stdio transport
- Full MCP protocol support

### Automatic Tool Discovery

The server automatically discovers and exposes Express routes as MCP tools:

```typescript
// Express route
app.get("/users/:id", (req, res) => {
  res.json({ id: req.params.id, name: "John Doe" });
});

// Becomes MCP tool: "GET_/users/:id"
```

### Schema Support

Full schema validation with Zod:

```typescript
import { z } from "zod";

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
});

// Schema automatically converted to JSON Schema for MCP
```

## Comparison with Bridge Scripts

| Feature | Bridge Scripts | Native Server |
|---------|---------------|---------------|
| Dependencies | Custom implementation | Official SDK |
| Protocol Support | Manual implementation | Full MCP spec |
| Maintenance | Higher | Lower |
| Performance | HTTP overhead | Direct communication |
| Error Handling | Basic | Comprehensive |
| Type Safety | Limited | Full TypeScript |

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
      "args": ["expressjs-mcp", "--url", "http://localhost:3000/mcp"],
      "env": {}
    }
  }
}
```

## Advanced Usage

### Custom Server Implementation

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ExpressMCP } from "expressjs-mcp";

// Create your own MCP server
class CustomMCPServer {
  constructor(app: Application) {
    const mcp = new ExpressMCP(app);
    
    const server = new Server({
      name: "custom-server",
      version: "1.0.0",
    });
    
    // Add custom handlers
    server.setRequestHandler(/* ... */);
    
    // Connect transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}
```

### Authentication Support

```typescript
const server = new ExpressMCPServer({
  baseUrl: "https://api.example.com/mcp",
  headers: {
    "Authorization": "Bearer YOUR_TOKEN",
  },
});
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
# List available tools
curl http://localhost:3000/mcp/tools | jq

# Verify MCP server connection
npx expressjs-mcp --url http://localhost:3000/mcp --debug
```

### Permission Issues

```bash
# Make binary executable
chmod +x node_modules/.bin/expressjs-mcp

# Or use npx
npx expressjs-mcp
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

- Remove old bridge scripts from your project
- Update MCP client configurations
- Test with the new native server
- Report any issues on GitHub
