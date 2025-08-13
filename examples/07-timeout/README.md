# Example 07: Configure HTTP Timeout

This example demonstrates how to configure timeouts for MCP tool invocations to handle long-running operations.

## Features

- **Default Timeout**: 30 seconds for standard operations
- **Custom Timeouts**: Different timeout values per MCP instance
- **Per-Request Override**: Specify timeout in the request
- **Timeout Error Handling**: Graceful handling of timeout errors

## Running the Example

```bash
# Install dependencies
pnpm install

# Run the example
pnpm tsx examples/07-timeout/server.ts
```

## Timeout Configuration

### 1. Default Timeout (30 seconds)

```typescript
const mcp = new ExpressMCP(app);
// Uses default 30-second timeout
```

### 2. Custom Timeout per Instance

```typescript
// Short timeout for quick operations
app.post("/mcp-short/invoke", (req, res, next) => {
  req.body.timeout = 3000; // 3 seconds
  next();
});

// Long timeout for heavy operations
app.post("/mcp-long/invoke", (req, res, next) => {
  req.body.timeout = 60000; // 60 seconds
  next();
});
```

### 3. Per-Request Timeout

```json
{
  "toolName": "GET_/slow/operation",
  "args": {},
  "timeout": 15000
}
```

## Test Scenarios

### Successful Request (Within Timeout)

```bash
# 2s operation with 3s timeout - SUCCESS
curl -X POST http://localhost:3007/mcp-short/invoke \
  -H "Content-Type: application/json" \
  -d '{"toolName": "GET_/slow/short", "args": {}}'
```

### Timeout Error

```bash
# 5s operation with 3s timeout - TIMEOUT ERROR
curl -X POST http://localhost:3007/mcp-short/invoke \
  -H "Content-Type: application/json" \
  -d '{"toolName": "GET_/slow/medium", "args": {}}'

# Response:
# {
#   "ok": false,
#   "error": "Request timeout after 3000ms"
# }
```

### Override Timeout

```bash
# 5s operation with custom 10s timeout - SUCCESS
curl -X POST http://localhost:3007/mcp-default/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "GET_/slow/medium",
    "args": {},
    "timeout": 10000
  }'
```

## Use Cases

### Quick Operations

Use short timeouts for operations that should be fast:
```typescript
// Health checks, simple queries
timeout: 3000 // 3 seconds
```

### Standard Operations

Default timeout for most operations:
```typescript
// CRUD operations, standard queries
timeout: 30000 // 30 seconds (default)
```

### Heavy Operations

Long timeouts for complex operations:
```typescript
// Reports, batch processing, complex calculations
timeout: 60000 // 60 seconds or more
```

## Timeout Strategies

### 1. Global Configuration

Set a global timeout for all operations:
```typescript
const DEFAULT_TIMEOUT = 20000; // 20 seconds
```

### 2. Route-Based

Different timeouts based on route patterns:
```typescript
if (route.path.includes("/report")) {
  timeout = 60000; // Reports need more time
} else if (route.path.includes("/health")) {
  timeout = 5000; // Health checks should be quick
}
```

### 3. Method-Based

Different timeouts based on HTTP method:
```typescript
const timeouts = {
  GET: 10000,   // Reads should be quick
  POST: 30000,  // Creates might take longer
  PUT: 30000,   // Updates might take longer
  DELETE: 20000 // Deletes moderate time
};
```

## Error Handling

Timeout errors return:
```json
{
  "ok": false,
  "error": "Request timeout after {timeout}ms"
}
```

## Best Practices

1. **Set Reasonable Defaults**: 30 seconds works for most operations
2. **Short for Health Checks**: Keep health/status endpoints fast
3. **Long for Batch Operations**: Give batch operations enough time
4. **Monitor Timeouts**: Log timeout errors for optimization
5. **User Feedback**: Inform users about long-running operations

## Next Steps

- See [Example 08](../08-auth-token) for authentication
- See [Streaming Example](../streaming) for real-time responses
