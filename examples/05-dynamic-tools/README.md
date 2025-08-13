# Example 05: Dynamic Tool Management

This example demonstrates how to dynamically add, remove, and update MCP tools at runtime without restarting the server.

## Features

- **Add Tools**: Create new endpoints and expose them as MCP tools
- **Remove Tools**: Disable tools without stopping the server
- **Batch Operations**: Add/remove multiple tools at once
- **Configuration Loading**: Load tools from configuration
- **Tool Discovery**: Re-initialize MCP to discover changes

## Running the Example

```bash
# Install dependencies
pnpm install

# Run the example
pnpm tsx examples/05-dynamic-tools/server.ts
```

## API Endpoints

### Add a Tool

```bash
curl -X POST http://localhost:3005/admin/tools/add \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/api/dynamic/users",
    "method": "GET"
  }'
```

### Remove a Tool

```bash
curl -X DELETE http://localhost:3005/admin/tools/remove \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/api/dynamic/users",
    "method": "GET"
  }'
```

### List All Tools

```bash
curl http://localhost:3005/admin/tools/list
```

Response:
```json
{
  "total": 10,
  "static": 2,
  "dynamic": 8,
  "tools": [
    {
      "name": "GET_/health",
      "title": "GET /health",
      "isDynamic": false
    },
    {
      "name": "GET_/api/dynamic/users",
      "title": "GET /api/dynamic/users",
      "isDynamic": true
    }
  ]
}
```

### Batch Operations

```bash
curl -X POST http://localhost:3005/admin/tools/batch \
  -H "Content-Type: application/json" \
  -d '{
    "operations": [
      { "action": "add", "path": "/api/v3/products", "method": "GET" },
      { "action": "add", "path": "/api/v3/products", "method": "POST" },
      { "action": "remove", "path": "/api/v1/users", "method": "GET" }
    ]
  }'
```

### Load Configuration

```bash
curl -X POST http://localhost:3005/admin/tools/load-config \
  -H "Content-Type: application/json" \
  -d '{
    "config": [
      { "path": "/api/v2/products", "method": "GET" },
      { "path": "/api/v2/products/:id", "method": "GET" },
      { "path": "/api/v2/orders", "method": "GET" }
    ]
  }'
```

## Use Cases

### Feature Flags

Enable/disable features dynamically:
```javascript
if (featureFlags.newApi) {
  await addTool("/api/v2/feature", "POST");
}
```

### A/B Testing

Different tools for different user groups:
```javascript
const userGroup = getUserGroup(userId);
if (userGroup === "beta") {
  await loadBetaTools();
}
```

### Plugin System

Load tools from plugins:
```javascript
for (const plugin of enabledPlugins) {
  await loadPluginTools(plugin);
}
```

### API Versioning

Manage multiple API versions:
```javascript
// Enable v2 endpoints
await loadConfig(v2Config);

// Disable v1 endpoints
await removeTools(v1Endpoints);
```

## Implementation Details

### Dynamic Route Registration

Routes are added to Express at runtime:
```typescript
app[method.toLowerCase()](path, handler);
dynamicRoutes.set(routeKey, { path, method, handler });
await mcp.init(); // Re-discover routes
```

### Tool Discovery

MCP re-initializes to discover new routes:
```typescript
await mcp.init(); // Introspects Express router again
```

### Limitations

1. **Route Removal**: Express doesn't provide a clean API to remove routes
2. **Performance**: Re-initialization has overhead for large route sets
3. **Persistence**: Dynamic routes are lost on restart

## Best Practices

1. **Validation**: Validate route paths and methods
2. **Conflict Detection**: Check for existing routes
3. **Error Handling**: Handle registration failures gracefully
4. **Persistence**: Store dynamic routes in database
5. **Security**: Authenticate admin endpoints

## Testing Dynamic Tools

1. Start the server
2. Load example configuration
3. List tools to see both static and dynamic
4. Invoke a dynamic tool via MCP
5. Remove a tool and verify it's gone

```bash
# Load config
curl -X POST http://localhost:3005/admin/tools/load-config -H "Content-Type: application/json" -d '{}'

# List tools
curl http://localhost:3005/admin/tools/list | jq '.tools | length'

# Invoke dynamic tool
curl -X POST http://localhost:3005/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{"toolName": "GET_/api/v2/products", "args": {}}'
```

## Next Steps

- See [Example 06](../06-custom-router) for custom MCP routing
- See [Example 08](../08-auth-token) for authentication
