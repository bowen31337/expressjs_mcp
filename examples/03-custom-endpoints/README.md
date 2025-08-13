# Example 03: Custom Exposed Endpoints

This example demonstrates how to selectively expose only certain routes as MCP tools using include/exclude filters.

## Features

- **Include Filters**: Choose which routes to expose
- **Exclude Filters**: Remove specific routes from exposure
- **Pattern Matching**: Use regex or custom logic for filtering
- **Multiple MCP Instances**: Different filtering strategies on same app

## Running the Example

```bash
# Install dependencies
pnpm install

# Run the example
pnpm tsx examples/03-custom-endpoints/server.ts
```

## Filtering Strategies

### 1. Include/Exclude Filters

```typescript
const mcp = new ExpressMCP(app, {
  include: (route) => route.path.startsWith("/items"),
  exclude: (route) => route.path.includes("bulk"),
});
```

### 2. Whitelist Approach

```typescript
const allowedEndpoints = [
  "GET /items",
  "POST /items",
];
include: (route) => allowedEndpoints.includes(`${route.method} ${route.path}`);
```

### 3. Pattern-Based Filtering

```typescript
include: (route) => {
  const isReadOnly = route.method === "GET";
  const isItemRoute = /^\/items(\/\d+)?$/.test(route.path);
  return isReadOnly && isItemRoute;
};
```

## Use Cases

### Security

Only expose safe, read-only operations:
```typescript
include: (route) => route.method === "GET"
```

### API Versioning

Expose only v2 endpoints:
```typescript
include: (route) => route.path.startsWith("/api/v2")
```

### Role-Based Access

Different MCP instances for different user roles:
```typescript
// Admin MCP - all endpoints
const adminMcp = new ExpressMCP(app, {
  mountPath: "/admin/mcp",
});

// Public MCP - read-only
const publicMcp = new ExpressMCP(app, {
  mountPath: "/public/mcp",
  include: (route) => route.method === "GET",
});
```

## Testing Different Filters

Compare the exposed tools from each MCP instance:

```bash
# Default filters
curl http://localhost:3003/mcp/tools | jq '.tools | length'

# Whitelist approach
curl http://localhost:3003/mcp-whitelist/tools | jq '.tools | length'

# Pattern-based
curl http://localhost:3003/mcp-patterns/tools | jq '.tools | length'
```

## Benefits

1. **Security**: Don't expose sensitive endpoints
2. **Clarity**: Only show relevant tools to users
3. **Performance**: Fewer tools to manage
4. **Flexibility**: Different access levels for different contexts

## Next Steps

- See [Example 04](../04-separate-server) for standalone MCP server
- See [Example 08](../08-auth-token) for authentication integration
