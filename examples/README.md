# Express-MCP Examples

This directory contains comprehensive examples demonstrating various features and use cases of Express-MCP, following the same pattern as [FastAPI-MCP](https://github.com/tadata-org/fastapi_mcp).

## 📁 **Available Examples**

### Core Examples (FastAPI-MCP Pattern)

1. **[01-basic-usage](./01-basic-usage)** - Simplest way to add MCP to an Express app
2. **[02-full-schema](./02-full-schema)** - Rich schema descriptions using Zod
3. **[03-custom-endpoints](./03-custom-endpoints)** - Selective route exposure with filters
4. **[04-separate-server](./04-separate-server)** - Standalone MCP gateway server
5. **[07-timeout](./07-timeout)** - Configure timeouts for long-running operations

### Advanced Examples

- **[streaming](./streaming)** - Real-time streaming responses (SSE, NDJSON)
- **[streaming-decorators](./streaming-decorators)** - Streaming with TypeScript decorators
- **[basic](./basic)** - Original basic example with minimal setup

## 🚀 **Quick Start**

All examples share a common Express app with an items CRUD API, similar to FastAPI-MCP examples.

```bash
# Install dependencies
pnpm install

# Run any example
pnpm tsx examples/01-basic-usage/server.ts
pnpm tsx examples/02-full-schema/server.ts
pnpm tsx examples/03-custom-endpoints/server.ts
# ... etc
```

## ✨ **Features Demonstrated**

### TypeScript Decorators

Express-MCP supports TypeScript decorators for defining routes and schemas:

```typescript
@Controller("/items")
export class ItemsController {
  @Get("/:id")
  @Schema({
    params: z.object({ id: z.number() }),
    response: ItemSchema
  })
  async getItem(req: Request, res: Response) {
    // Implementation
  }
}
```

### Schema Validation with Zod

Automatic input/output validation using Zod schemas:

```typescript
const ItemSchema = z.object({
  id: z.number().positive(),
  name: z.string().min(1),
  price: z.number().positive(),
});

const mcp = new ExpressMCP(app, {
  schemaAnnotations: {
    "GET /items": {
      input: QuerySchema,
      output: z.array(ItemSchema),
    }
  }
});
```

### Filtering Routes

Control which routes are exposed as MCP tools:

```typescript
const mcp = new ExpressMCP(app, {
  include: (route) => route.method === "GET",
  exclude: (route) => route.path.includes("admin"),
});
```

### Streaming Support

Multiple streaming protocols supported:

- Server-Sent Events (SSE)
- Newline-Delimited JSON (NDJSON)
- Plain text streaming
- Chunked transfer encoding

### Standalone MCP Server

Run MCP gateway separately from main app:

```typescript
// Main app on port 3000
app.listen(3000);

// MCP gateway on port 7878
await mcp.startStandalone({ port: 7878 });
```

## 🧪 **Testing MCP Tools**

### List Available Tools

```bash
curl http://localhost:3001/mcp/tools
```

### Invoke a Tool

```bash
curl -X POST http://localhost:3001/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "GET_/items",
    "args": { "skip": 0, "limit": 10 }
  }'
```

### Streaming Invocation

```bash
curl -X POST http://localhost:3001/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "GET_/stream/events",
    "args": {},
    "streaming": true
  }'
```

## 🏗️ **Architecture**

All examples follow this pattern:

1. **Express App**: Standard Express application with routes
2. **ExpressMCP Wrapper**: Adds MCP capabilities
3. **Route Discovery**: Automatic introspection of Express routes
4. **Schema Resolution**: Zod schemas or OpenAPI specs
5. **MCP Gateway**: HTTP endpoints for tool discovery and invocation

## 📊 **Comparison with FastAPI-MCP**

| Feature | FastAPI-MCP | Express-MCP |
|---------|-------------|-------------|
| Decorator Support | Python decorators | TypeScript decorators |
| Schema Validation | Pydantic | Zod |
| Route Discovery | FastAPI routes | Express router introspection |
| Streaming | SSE, WebSocket | SSE, NDJSON, Chunked |
| Standalone Server | ✅ | ✅ |
| OpenAPI Support | Native | Via annotations |
| Auth Integration | ✅ | ✅ |
| Timeout Config | ✅ | ✅ |
| Dynamic Tools | ✅ | ✅ |

## 🔧 **MCP Client Configuration**

### Claude Desktop

Create or update `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "expressjs-mcp": {
      "command": "npx",
      "args": ["expressjs-mcp", "--url", "http://localhost:3001/mcp"]
    }
  }
}
```

### Cursor IDE

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "expressjs-mcp": {
      "command": "npx",
      "args": ["expressjs-mcp", "--url", "http://localhost:3001/mcp"]
    }
  }
}
```

## 📋 **Example Walkthroughs**

### Example 01: Basic Usage

1. **Start**: `pnpm tsx examples/01-basic-usage/server.ts`
2. **Explore**: Visit http://localhost:3001/mcp/tools
3. **Test**: All routes automatically exposed as MCP tools
4. **No configuration needed** - just wrap and go!

### Example 02: Full Schema

1. **Start**: `pnpm tsx examples/02-full-schema/server.ts`
2. **Observe**: Rich schemas with Zod validation
3. **Test validation**: Try invalid inputs to see error messages
4. **Benefits**: Type safety and auto-documentation

### Example 03: Custom Endpoints

1. **Start**: `pnpm tsx examples/03-custom-endpoints/server.ts`
2. **Compare**: Three different filtering strategies
3. **Check endpoints**: `/mcp`, `/mcp-whitelist`, `/mcp-patterns`
4. **Use case**: Security and API versioning

### Example 04: Separate Server

1. **Start**: `pnpm tsx examples/04-separate-server/server.ts`
2. **Architecture**: Main app (3004) + MCP gateway (7878)
3. **Benefits**: Independent scaling and deployment
4. **Use case**: Microservices architecture

### Example 07: Timeout Configuration

1. **Start**: `pnpm tsx examples/07-timeout/server.ts`
2. **Test timeouts**: Short (3s), Default (30s), Long (60s)
3. **Override**: Per-request timeout in payload
4. **Use case**: Long-running operations

### Streaming with Decorators

1. **Start**: `pnpm tsx examples/streaming-decorators/server.ts`
2. **Test SSE**: `curl http://localhost:3010/stream/events`
3. **Test NDJSON**: Progress updates and chat streaming
4. **Use case**: Real-time data and AI responses

## 🎯 **Next Steps**

1. Start with [01-basic-usage](./01-basic-usage) for the simplest setup
2. Add schemas with [02-full-schema](./02-full-schema)
3. Learn filtering with [03-custom-endpoints](./03-custom-endpoints)
4. Explore streaming with [streaming-decorators](./streaming-decorators)
5. Deploy with [04-separate-server](./04-separate-server)

## 🔍 **Troubleshooting**

### Server Not Starting
```bash
# Check if port is in use
lsof -i :3001

# Use different port
PORT=3002 pnpm tsx examples/01-basic-usage/server.ts
```

### Tools Not Appearing
```bash
# Verify tools are registered
curl http://localhost:3001/mcp/tools | jq '.tools[].name'

# Check server logs
DEBUG=expressjs-mcp pnpm tsx examples/01-basic-usage/server.ts
```

### MCP Client Not Connecting
```bash
# Test native MCP server
npx expressjs-mcp --url http://localhost:3001/mcp --debug

# Verify endpoints
curl http://localhost:3001/mcp/tools
```

## 📖 **Additional Resources**

- [Express MCP Documentation](../docs/)
- [MCP Client Setup Guide](../docs/MCP_CLIENT_SETUP.md)
- [Streaming Documentation](../docs/STREAMING.md)
- [Architecture Guide](../docs/ARCHITECTURE.md)
- [FastAPI-MCP Examples](https://github.com/tadata-org/fastapi_mcp/tree/main/examples)

Happy coding! 🚀