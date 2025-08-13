# MCP Client Configuration

This guide shows how to configure express_mcp in various MCP clients to expose your Express endpoints as tools.

## Prerequisites

1. **Running Express App with MCP**: Your Express application must be running with express_mcp configured
2. **HTTP Gateway Mode**: For MCP client integration, use standalone mode or ensure your mounted MCP endpoints are accessible

## Basic Express MCP Server Setup

First, ensure your Express app is configured with express_mcp:

```typescript
// server.ts
import express from 'express';
import { ExpressMCP } from 'express-mcp';

const app = express();
app.use(express.json());

// Your existing routes
app.get('/users', (req, res) => res.json([{ id: 1, name: 'John' }]));
app.post('/users', (req, res) => res.status(201).json({ id: 2, ...req.body }));

// Configure MCP
const mcp = new ExpressMCP(app, {
  mountPath: '/mcp',
  schemaAnnotations: {
    'GET /users': {
      description: 'Get all users',
      output: { type: 'array', items: { type: 'object' } }
    },
    'POST /users': {
      description: 'Create a new user',
      input: { type: 'object', properties: { name: { type: 'string' } } }
    }
  }
});

await mcp.init();

// Option 1: Mount to existing app (recommended for development)
mcp.mount('/mcp');
app.listen(3000, () => console.log('Server running on http://localhost:3000'));

// Option 2: Standalone MCP server (recommended for production)
// await mcp.startStandalone({ port: 7878 });
```

## MCP Client Configurations

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "express-api": {
      "command": "node",
      "args": ["/path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs"],
      "env": {
        "EXPRESS_MCP_URL": "http://localhost:3000/mcp"
      }
    }
  }
}
```

**Note**: Replace `/path/to/your/expressjs_mcp` with your actual project path.

**Alternative: Direct HTTP Transport** (if supported):
```json
{
  "mcpServers": {
    "express-api": {
      "transport": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### Cursor IDE

1. Navigate to `Settings` → `Cursor Settings` → `MCP` → `Add new global MCP server`
2. Add the following configuration:

```json
{
  "mcpServers": {
    "express-api": {
      "command": "node",
      "args": ["/path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs"],
      "env": {
        "EXPRESS_MCP_URL": "http://localhost:3000/mcp"
      }
    }
  }
}
```

**Note**: Replace `/path/to/your/expressjs_mcp` with your actual project path.

### VS Code with MCP Extension

Add to your VS Code settings or `.vscode/settings.json`:

```json
{
  "mcp.servers": {
    "express-api": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs"],
      "env": {
        "EXPRESS_MCP_URL": "http://localhost:3000/mcp"
      }
    }
  }
}
```

**Note**: Replace `/path/to/your/expressjs_mcp` with your actual project path.

### Windsurf

Configure in your Windsurf MCP settings:

```json
{
  "servers": {
    "express-api": {
      "type": "stdio", 
      "command": "node",
      "args": ["/path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs"],
      "env": {
        "EXPRESS_MCP_URL": "http://localhost:3000/mcp"
      }
    }
  }
}
```

**Note**: Replace `/path/to/your/expressjs_mcp` with your actual project path.

## MCP Bridge Script

Since most MCP clients expect stdio communication, create a bridge script that connects to your HTTP gateway:

**mcp-bridge.cjs**:
```javascript
#!/usr/bin/env node

const http = require('http');
const { spawn } = require('child_process');

const EXPRESS_MCP_URL = process.env.EXPRESS_MCP_URL || 'http://localhost:3000/mcp';

class ExpressMCPBridge {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async listTools() {
    try {
      const response = await this.httpRequest('GET', '/tools');
      return response.tools || [];
    } catch (error) {
      console.error('Failed to list tools:', error.message);
      return [];
    }
  }

  async invokeTool(toolName, args) {
    try {
      const response = await this.httpRequest('POST', '/invoke', {
        toolName,
        args
      });
      return response;
    } catch (error) {
      console.error('Failed to invoke tool:', error.message);
      throw error;
    }
  }

  httpRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch (e) {
            resolve({ body });
          }
        });
      });

      req.on('error', reject);
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }
}

// MCP Protocol Implementation
class MCPServer {
  constructor() {
    this.bridge = new ExpressMCPBridge(EXPRESS_MCP_URL);
  }

  async handleRequest(request) {
    const { method, params } = request;

    switch (method) {
      case 'tools/list':
        const tools = await this.bridge.listTools();
        return { tools };

      case 'tools/call':
        const { name, arguments: args } = params;
        const result = await this.bridge.invokeTool(name, args);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }
}

// Stdio communication
const server = new MCPServer();

process.stdin.on('data', async (data) => {
  try {
    const request = JSON.parse(data.toString());
    const response = await server.handleRequest(request);
    
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0',
      id: request.id,
      result: response
    }) + '\n');
  } catch (error) {
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0',
      id: request.id || null,
      error: {
        code: -1,
        message: error.message
      }
    }) + '\n');
  }
});

console.error('Express MCP Bridge started, connecting to:', EXPRESS_MCP_URL);
```

Make the bridge executable:
```bash
chmod +x mcp-bridge.cjs
```

## Docker Configuration

For containerized deployments, create a Docker setup:

**docker-compose.yml**:
```yaml
version: '3.8'
services:
  express-app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - ./src:/app/src
    command: node server.js

  mcp-bridge:
    build: .
    depends_on:
      - express-app
    environment:
      - EXPRESS_MCP_URL=http://express-app:3000/mcp
    command: node mcp-bridge.cjs
    stdin_open: true
    tty: true
```

## Production Deployment

### Option 1: Standalone MCP Server

```typescript
// mcp-server.ts
import { ExpressMCP } from 'express-mcp';
import { createExpressApp } from './app'; // Your existing app

const app = createExpressApp();
const mcp = new ExpressMCP(app);
await mcp.init();

// Run MCP server on separate port
await mcp.startStandalone({ port: 7878 });
console.log('MCP server running on http://localhost:7878');
```

### Option 2: Reverse Proxy Setup

**nginx.conf**:
```nginx
server {
    listen 80;
    server_name your-api.com;

    # Your main API
    location / {
        proxy_pass http://localhost:3000;
    }

    # MCP endpoints
    location /mcp/ {
        proxy_pass http://localhost:3000/mcp/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Environment Variables

Configure your MCP bridge with environment variables:

```bash
# .env
EXPRESS_MCP_URL=http://localhost:3000/mcp
MCP_SERVER_PORT=7878
NODE_ENV=production
```

## Testing Your Configuration

1. **Test HTTP Gateway**:
```bash
# List tools
curl http://localhost:3000/mcp/tools

# Invoke a tool
curl -X POST http://localhost:3000/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{"toolName": "GET /users", "args": {}}'
```

2. **Test MCP Bridge**:
```bash
# Test the bridge script
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node mcp-bridge.cjs
```

3. **Verify in MCP Client**:
   - Open your MCP client (Claude Desktop, Cursor, etc.)
   - Look for your express-api server in the available tools
   - Try invoking one of your Express endpoints

## Troubleshooting

### Common Issues

1. **Connection Refused**:
   - Ensure your Express app is running
   - Check the MCP URL is correct
   - Verify firewall settings

2. **Tools Not Appearing**:
   - Check MCP bridge logs
   - Verify Express routes are properly registered
   - Ensure `mcp.init()` was called

3. **Authentication Issues**:
   - MCP clients may need authentication headers
   - Configure auth in your Express middleware
   - Update bridge script to pass auth tokens

### Debug Mode

Enable debug logging in your bridge:

```javascript
const DEBUG = process.env.DEBUG === 'true';

if (DEBUG) {
  console.error('Request:', JSON.stringify(request, null, 2));
  console.error('Response:', JSON.stringify(response, null, 2));
}
```

## Advanced Configuration

### Custom Tool Filtering

```typescript
const mcp = new ExpressMCP(app, {
  include: (route) => route.path.startsWith('/api/'),
  exclude: (route) => route.path.includes('/internal/')
});
```

### Schema Enhancement

```typescript
const mcp = new ExpressMCP(app, {
  openapi: openApiSpec, // Your OpenAPI 3.0 spec
  schemaAnnotations: {
    'POST /users': {
      description: 'Create a new user with validation',
      input: z.object({
        name: z.string().min(1),
        email: z.string().email()
      })
    }
  }
});
```

This configuration enables your Express API endpoints to be seamlessly used as tools in any MCP-compatible client!
