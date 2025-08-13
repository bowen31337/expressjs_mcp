# Quick MCP Setup

Get Express MCP running in 3 steps:

## 1. Install and Initialize

### Option A: Using npm package (Recommended)
```bash
# Install globally
npm install -g expressjs-mcp
# or with pnpm
pnpm add -g expressjs-mcp

# Initialize in your project
npx expressjs-mcp init
```

### Option B: Clone and build locally
```bash
# Clone or download express-mcp
git clone https://github.com/bowen31337/expressjs_mcp.git
cd expressjs_mcp

# Install dependencies
pnpm install

# Build the project
pnpm build

# Initialize in your project
node bin/express-mcp.cjs init
```

## 2. Start Your Server

```bash
# Start the server (created by init)
node server.js
# or for TypeScript
node server.ts
```

## 3. Configure MCP Client

Add to your MCP client configuration:

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

## CLI Commands

### Quick Start with CLI (npm package)
```bash
# Initialize expressjs-mcp in your project
npx expressjs-mcp init

# Start MCP bridge
npx expressjs-mcp bridge

# Test connection
npx expressjs-mcp test --url http://localhost:3000/mcp
```

### Alternative: Local installation commands
```bash
# If you built from source
node bin/express-mcp.cjs init
node scripts/mcp-bridge.cjs
node bin/express-mcp.cjs test --url http://localhost:3000/mcp

# Or if you used npm link
npx expressjs-mcp init
npx expressjs-mcp bridge --url http://localhost:3000/mcp
npx expressjs-mcp test
```

## Streaming Support

Express MCP supports three types of streaming:

### 1. HTTP Streaming (Chunked Transfer)
```typescript
app.get('/api/chunked', (req, res) => {
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Content-Type', 'text/plain');
  
  let count = 0;
  const interval = setInterval(() => {
    res.write(`Chunk ${++count}\n`);
    if (count >= 5) {
      clearInterval(interval);
      res.end();
    }
  }, 1000);
});
```

### 2. Server-Sent Events (SSE)
```typescript
app.get('/api/sse', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  let count = 0;
  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ count: ++count })}\n\n`);
    if (count >= 10) {
      clearInterval(interval);
      res.end();
    }
  }, 1000);
});
```

### 3. NDJSON/JSON Lines Streaming
```typescript
app.get('/api/ndjson', (req, res) => {
  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Cache-Control', 'no-cache');
  
  const data = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
  data.forEach((item, i) => {
    setTimeout(() => {
      res.write(JSON.stringify(item) + '\n');
      if (i === data.length - 1) res.end();
    }, i * 500);
  });
});
```

### Custom Streaming Headers
```typescript
app.get('/api/custom', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('X-Streaming', 'true');  // Custom indicator
  res.setHeader('X-Content-Stream', 'true');  // Alternative indicator
  
  // Your streaming logic here
});
```

### Testing Streaming

#### HTTP Streaming
```bash
curl -X POST http://localhost:3000/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{"toolName": "GET /api/stream", "args": {}, "streaming": true}'
```

#### stdio Streaming (MCP Bridge)

#### Using npm package:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"GET /api/ndjson","arguments":{"_streaming":true}}}' | \
  npx expressjs-mcp bridge
```

#### Using local installation:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"GET /api/ndjson","arguments":{"_streaming":true}}}' | \
  node /path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs
```

**Note**: Replace `/path/to/your/expressjs_mcp` with your actual project path for local installations.

#### Direct Endpoint Testing
```bash
# Test SSE
curl http://localhost:3000/api/sse

# Test NDJSON
curl http://localhost:3000/api/ndjson

# Test custom streaming
curl http://localhost:3000/api/custom
```

## MCP Client Configuration

### Claude Desktop - Option 1: npm package (Recommended)
```json
{
  "mcpServers": {
    "express-api": {
      "command": "npx",
      "args": ["expressjs-mcp", "bridge"],
      "env": {
        "EXPRESS_MCP_URL": "http://localhost:3000/mcp"
      }
    }
  }
}
```

### Claude Desktop - Option 2: Local installation
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

**Note**: Replace `/path/to/your/expressjs_mcp` with your actual project path for local installations.

## Testing

Test your setup:

### Using npm package:
```bash
# Test MCP connection
npx expressjs-mcp test --url http://localhost:3000/mcp

# List available tools
curl http://localhost:3000/mcp/tools

# Invoke a tool
curl -X POST http://localhost:3000/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{"toolName": "GET /api/users", "args": {}}'
```

### Using local installation:
```bash
# Test MCP connection
node bin/express-mcp.cjs test --url http://localhost:3000/mcp

# List available tools  
curl http://localhost:3000/mcp/tools

# Invoke a tool
curl -X POST http://localhost:3000/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{"toolName": "GET /api/users", "args": {}}'
```

## Troubleshooting

- **Connection failed**: Make sure your Express server is running
- **Tools not found**: Check that MCP is properly mounted at `/mcp`
- **Streaming not working**: Ensure your endpoint sets appropriate headers (`text/event-stream`, `chunked`)

See [MCP Client Setup](./MCP_CLIENT_SETUP.md) for detailed configuration options.
