# Example 01: Basic Usage

This example demonstrates the simplest way to add MCP (Model Context Protocol) capabilities to an Express.js application.

## Features

- Automatic route discovery from Express app
- Zero-configuration MCP setup
- All routes exposed as MCP tools
- JSON schema inference from route handlers

## Running the Example

```bash
# Install dependencies
pnpm install

# Run the example
pnpm tsx examples/01-basic-usage/server.ts
```

## Testing

Once running, you can:

1. View available tools:
```bash
curl http://localhost:3001/mcp/tools
```

2. Invoke a tool (e.g., list items):
```bash
curl -X POST http://localhost:3001/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "GET_/items",
    "args": {
      "skip": 0,
      "limit": 10
    }
  }'
```

3. Create an item:
```bash
curl -X POST http://localhost:3001/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "POST_/items",
    "args": {
      "name": "Test Item",
      "price": 29.99,
      "tags": ["example", "test"]
    }
  }'
```

## MCP Configuration

This example uses minimal configuration:
- `mountPath`: Where to mount MCP endpoints (default: `/mcp`)
- Routes are automatically discovered from the Express app
- No schema annotations needed (uses permissive schemas)

## What's Happening

1. **ExpressMCP** wraps the Express app
2. `init()` discovers all routes using introspection
3. `mount()` adds MCP endpoints (`/mcp/tools` and `/mcp/invoke`)
4. Each route becomes an MCP tool with a generated name

## Next Steps

- See [Example 02](../02-full-schema) for schema validation with Zod
- See [Example 03](../03-custom-endpoints) for selective route exposure
- See [Example 04](../04-separate-server) for standalone MCP server
