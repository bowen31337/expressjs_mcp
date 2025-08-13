# Example 04: Separate MCP Server

This example demonstrates running the MCP server as a standalone HTTP gateway, separate from the main Express application.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│ MCP Clients │────▶│ MCP Gateway  │────▶│ Express App  │
│             │     │ (port 7878)  │     │ (port 3004)  │
└─────────────┘     └──────────────┘     └──────────────┘
                         HTTP              In-Memory
                                           Dispatch
```

## Features

- **Separate Ports**: Main app and MCP gateway on different ports
- **In-Memory Dispatch**: No network overhead between servers
- **Independent Scaling**: Scale MCP gateway separately
- **Security Isolation**: Different security policies per server

## Running the Example

```bash
# Install dependencies
pnpm install

# Run the example
pnpm tsx examples/04-separate-server/server.ts

# Or with custom ports
APP_PORT=8080 MCP_PORT=9090 pnpm tsx examples/04-separate-server/server.ts
```

## Testing

1. **Direct API Access** (port 3004):
```bash
# Regular API call
curl http://localhost:3004/items

# Create item directly
curl -X POST http://localhost:3004/items \
  -H "Content-Type: application/json" \
  -d '{"name": "Direct Item", "price": 29.99}'
```

2. **MCP Gateway Access** (port 7878):
```bash
# List MCP tools
curl http://localhost:7878/mcp/tools

# Invoke via MCP
curl -X POST http://localhost:7878/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "GET_/items",
    "args": {}
  }'
```

## Use Cases

### Microservices Architecture

```typescript
// API Gateway
const apiGateway = express();
apiGateway.use("/api", proxy("http://api-service:3000"));

// MCP Gateway for all services
const mcp = new ExpressMCP(apiGateway);
await mcp.startStandalone({ port: 7878 });
```

### Load Balancing

```nginx
# nginx.conf
upstream app_servers {
    server app1:3004;
    server app2:3004;
}

upstream mcp_servers {
    server mcp1:7878;
    server mcp2:7878;
}
```

### Security Isolation

```typescript
// Main app - internal network only
app.listen(3004, "127.0.0.1");

// MCP gateway - public facing with auth
const mcp = new ExpressMCP(app, {
  auth: { enabled: true }
});
await mcp.startStandalone({ port: 7878 });
```

## Benefits

1. **Separation of Concerns**: MCP protocol handling separate from business logic
2. **Independent Deployment**: Update MCP gateway without touching main app
3. **Performance**: Different optimization strategies per server
4. **Monitoring**: Separate metrics for API vs MCP traffic

## Configuration

Environment variables:
- `APP_PORT`: Main application port (default: 3004)
- `MCP_PORT`: MCP gateway port (default: 7878)

## Next Steps

- See [Example 05](../05-dynamic-tools) for dynamic tool registration
- See [Example 06](../06-custom-router) for custom MCP routing
- See [Example 08](../08-auth-token) for authentication
