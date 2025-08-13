# Example 02: Full Schema Description

This example demonstrates how to provide detailed schema information for MCP tools using Zod schemas.

## Features

- **Zod Schema Validation**: Automatic input/output validation
- **Rich Type Information**: Detailed schemas for MCP clients
- **Examples**: Provide usage examples for each tool
- **Better Error Messages**: Schema validation errors are descriptive

## Running the Example

```bash
# Install dependencies
pnpm install

# Run the example
pnpm tsx examples/02-full-schema/server.ts
```

## Schema Annotations

This example uses `schemaAnnotations` to provide:

1. **Input Schema**: Validates incoming arguments
2. **Output Schema**: Validates response data
3. **Description**: Human-readable tool description
4. **Examples**: Sample inputs for documentation

```typescript
const schemaAnnotations = {
  "GET /items": {
    description: "List all items with pagination",
    input: ListItemsQuerySchema,
    output: ItemsListResponseSchema,
    examples: [{ skip: 0, limit: 10 }],
  },
  // ... more routes
};
```

## Testing with Schema Validation

1. **Valid Request** - Works as expected:
```bash
curl -X POST http://localhost:3002/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "POST_/items",
    "args": {
      "name": "Valid Item",
      "price": 29.99,
      "tags": ["test"]
    }
  }'
```

2. **Invalid Request** - Schema validation error:
```bash
curl -X POST http://localhost:3002/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "POST_/items",
    "args": {
      "name": "",
      "price": -10
    }
  }'
```

The invalid request will return a validation error with details about what's wrong.

## Benefits of Schema Annotations

1. **Type Safety**: Ensures data conforms to expected shapes
2. **Auto-documentation**: Schemas serve as API documentation
3. **Client Generation**: MCP clients can generate typed interfaces
4. **Error Prevention**: Catches issues before they reach business logic

## Zod Integration

The example uses [Zod](https://zod.dev) for schema definition:

```typescript
const ItemSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  price: z.number().positive(),
  tags: z.array(z.string()).default([]),
});
```

Zod schemas are automatically converted to JSON Schema for MCP tools.

## Next Steps

- See [Example 03](../03-custom-endpoints) for selective route exposure
- See [Example 04](../04-separate-server) for standalone MCP server
- See [Example 07](../07-timeout) for timeout configuration
