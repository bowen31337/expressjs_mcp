# express_mcp

Expose your Express endpoints as MCP tools (mount to your app or run a standalone HTTP gateway), preserving schemas and auth behavior.

- Inspiration: FastAPI-MCP — https://github.com/tadata-org/fastapi_mcp

## Features

- **Zero Configuration**: Works out-of-the-box with existing Express apps
- **Schema Preservation**: Supports OpenAPI v3 and zod annotations
- **Auth Integration**: Reuses existing Express middleware (no bypass)
- **Flexible Deployment**: Mount to same app or run standalone
- **In-Process Efficiency**: Direct middleware execution (no HTTP overhead)
- **🚀 Streaming Support**: Handle Server-Sent Events, file downloads, and real-time data
- **📦 NPX/Bunx Commands**: Easy CLI access with `npx expressjs-mcp` and `bunx expressjs-mcp`

## Installation

### Option 1: Install from npm (Recommended)
```bash
# Install globally or locally
npm install -g expressjs-mcp
# or with pnpm
pnpm add -g expressjs-mcp

# Use with npx (no installation required)
npx expressjs-mcp init
```

### Option 2: Clone and build locally
```bash
git clone https://github.com/bowen31337/expressjs_mcp.git
cd expressjs_mcp
pnpm install && pnpm build
```

## Quick Start

### Option 1: CLI Commands (Recommended)
```bash
# Initialize in your project (works with npm package or locally built)
npx expressjs-mcp init
# or if installed locally: node bin/express-mcp.cjs init

# Start your server
node server.js

# Test connection
npx expressjs-mcp test --url http://localhost:3000/mcp
# or if installed locally: node bin/express-mcp.cjs test --url http://localhost:3000/mcp
```

### Option 2: Manual Setup
```bash
npm install expressjs-mcp
# or
pnpm add expressjs-mcp
```

```ts
import express from 'express';
import { ExpressMCP } from 'expressjs-mcp';

const app = express();
app.use(express.json());

app.get('/hello', (_req, res) => res.json({ message: 'world' }));

const mcp = new ExpressMCP(app, { mountPath: '/mcp' });
await mcp.init();
mcp.mount('/mcp');
```

## Streaming Support

Express MCP supports **three types of streaming** for real-time data:

### 🌊 **1. HTTP Chunked Streaming**
```ts
app.get('/api/chunked', (req, res) => {
  res.setHeader('Transfer-Encoding', 'chunked');
  res.write('Processing...\n');
  // Stream data in chunks
});
```

### 📡 **2. Server-Sent Events (SSE)**
```ts
app.get('/api/sse', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  
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

### 📄 **3. NDJSON/JSON Lines**
```ts
app.get('/api/ndjson', (req, res) => {
  res.setHeader('Content-Type', 'application/x-ndjson');
  
  const data = [{ id: 1 }, { id: 2 }];
  data.forEach(item => {
    res.write(JSON.stringify(item) + '\n');
  });
  res.end();
});
```

### **Testing All Streaming Types**

```bash
# HTTP Streaming via MCP
curl -X POST http://localhost:3000/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{"toolName": "GET /api/stream", "args": {}, "streaming": true}'

# stdio Streaming via MCP Bridge (npm package)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"GET /api/ndjson","arguments":{"_streaming":true}}}' | \
  npx expressjs-mcp bridge
  
# Or with local installation:
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"GET /api/ndjson","arguments":{"_streaming":true}}}' | \
  node /path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs

# Direct endpoint testing
curl http://localhost:3000/api/sse        # SSE
curl http://localhost:3000/api/ndjson     # NDJSON
curl http://localhost:3000/api/chunked    # Chunked
```

## Documentation

- [**🚀 Quick MCP Setup**](docs/QUICK_MCP_SETUP.md) - Get started in 3 steps
- [**📁 Examples & Tutorials**](examples/README.md) - Complete example walkthroughs
- [**🔧 Working MCP Configurations**](docs/WORKING_MCP_CONFIG.md) - **IMPORTANT**: Working configs before npm publish
- [**🚀 Publishing & CI/CD**](docs/PUBLISHING.md) - Automated npm publishing workflow
- [MCP Client Setup](docs/MCP_CLIENT_SETUP.md) - Detailed configuration guide
- [Streaming Guide](docs/STREAMING.md) - Comprehensive streaming documentation
- [Usage Guide](docs/USAGE.md) - API reference and examples
- [Architecture](docs/ARCHITECTURE.md) - Technical overview
- [PRD](docs/PRD.md) - Product requirements

## Development

```bash
pnpm install
pnpm test      # Run tests
pnpm build     # Build for production
pnpm lint      # Check code quality
```

## Configuration Options

- **OpenAPI**: Provide your OpenAPI v3 spec for rich schemas
- **Schema Annotations**: Use zod for per-route type validation
- **Route Filtering**: Include/exclude specific endpoints
- **Auth Preservation**: Existing middleware runs unchanged
- **Streaming**: Automatic detection and handling of streaming responses
- **Timeouts**: Configurable request timeouts for long-running operations
