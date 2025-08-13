# Example 06: Custom MCP Router

This example demonstrates how to create custom MCP routers with different configurations, middleware, and routing strategies.

## Features

- **Multiple Routers**: Separate routers for different API sections
- **Custom Middleware**: Auth, rate limiting, logging per router
- **Category-based Routing**: Route tools to appropriate MCP instances
- **Aggregated Views**: Combine tools from multiple sources
- **API Versioning**: Different MCP instances for API versions

## Running the Example

```bash
# Install dependencies
pnpm install

# Run the example
pnpm tsx examples/06-custom-router/server.ts
```

## Router Architecture

```
Express App
├── /public (Public Router) ──→ Public MCP
├── /admin (Admin Router) ────→ Admin MCP (Auth Required)
├── /api/v1 (Legacy API) ─────→ API v1 MCP (Deprecated)
├── /api/v2 (Current API) ────→ API v2 MCP
└── /mcp/custom ──────────────→ Custom Aggregator
```

## MCP Instances

### 1. Public MCP

No authentication required:
```bash
curl http://localhost:3006/mcp/public/tools
```

### 2. Admin MCP

Requires authentication:
```bash
curl http://localhost:3006/mcp/admin/tools \
  -H "Authorization: Bearer admin-token"
```

### 3. API v1 MCP (Legacy)

Deprecated API with rate limiting:
```bash
curl http://localhost:3006/mcp/api/v1/tools
```

### 4. API v2 MCP (Current)

Current API version:
```bash
curl http://localhost:3006/mcp/api/v2/tools
```

### 5. Unified MCP

All routes combined:
```bash
curl http://localhost:3006/mcp/all/tools
```

### 6. Custom Aggregator

Enhanced metadata and routing:
```bash
curl http://localhost:3006/mcp/custom/tools
```

Response:
```json
{
  "tools": [
    {
      "name": "GET_/public/products",
      "category": "public",
      "requiresAuth": false,
      "deprecated": false
    },
    {
      "name": "GET_/admin/users",
      "category": "admin",
      "requiresAuth": true,
      "deprecated": false
    }
  ],
  "categories": [
    { "name": "public", "count": 3, "requiresAuth": false },
    { "name": "admin", "count": 4, "requiresAuth": true },
    { "name": "api_v1", "count": 2, "deprecated": true },
    { "name": "api_v2", "count": 3, "requiresAuth": false }
  ],
  "total": 12
}
```

## Middleware Configuration

### Authentication Middleware

```typescript
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token === "admin-token") {
    req.user = { role: "admin" };
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
};

adminRouter.use(authMiddleware);
```

### Rate Limiting Middleware

```typescript
const rateLimitMiddleware = (req, res, next) => {
  // Track requests per IP
  if (recentRequests.length >= 10) {
    return res.status(429).json({ error: "Rate limit exceeded" });
  }
  next();
};

apiV1Router.use(rateLimitMiddleware);
```

### Logging Middleware

```typescript
const loggingMiddleware = (req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${Date.now() - start}ms`);
  });
  next();
};
```

## Custom Routing Logic

### Category-based Invocation

```bash
curl -X POST http://localhost:3006/mcp/custom/invoke \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token" \
  -d '{
    "toolName": "GET_/admin/analytics",
    "category": "admin",
    "args": {}
  }'
```

### Automatic Router Selection

The custom invoke endpoint routes to the appropriate MCP instance:
```typescript
switch (category) {
  case "public":
    targetMcp = publicMcp;
    break;
  case "admin":
    // Check auth for admin tools
    if (!isAuthenticated) {
      return res.status(401).json({ error: "Auth required" });
    }
    targetMcp = adminMcp;
    break;
  // ...
}
```

## Use Cases

### 1. Multi-tenant Applications

Different MCP instances per tenant:
```typescript
const tenantMcp = new ExpressMCP(app, {
  mountPath: `/mcp/tenant/${tenantId}`,
  include: (route) => route.path.startsWith(`/tenant/${tenantId}`),
});
```

### 2. Role-based Access

Different tools for different roles:
```typescript
const userMcp = new ExpressMCP(app, {
  include: (route) => !route.path.includes("admin"),
});

const adminMcp = new ExpressMCP(app, {
  include: (route) => true, // All routes
});
```

### 3. API Gateway

Route to different microservices:
```typescript
const serviceAMcp = new ExpressMCP(serviceA, {
  mountPath: "/mcp/service-a",
});

const serviceBMcp = new ExpressMCP(serviceB, {
  mountPath: "/mcp/service-b",
});
```

### 4. Progressive Migration

Gradual migration from v1 to v2:
```typescript
const migrationMcp = new ExpressMCP(app, {
  include: (route) => {
    if (featureFlags.useV2) {
      return route.path.startsWith("/api/v2");
    }
    return route.path.startsWith("/api/v1");
  },
});
```

## Testing Different Routers

```bash
# Test public endpoints (no auth)
curl http://localhost:3006/public/products

# Test admin endpoints (auth required)
curl http://localhost:3006/admin/users \
  -H "Authorization: Bearer admin-token"

# Test rate-limited v1 API
for i in {1..12}; do
  curl http://localhost:3006/api/v1/data
done
# Should get rate limit error after 10 requests

# Test v2 streaming
curl http://localhost:3006/api/v2/stream
```

## Best Practices

1. **Separate Concerns**: Use different routers for different domains
2. **Apply Middleware**: Add appropriate middleware per router
3. **Version APIs**: Maintain backward compatibility with versioned routers
4. **Document Categories**: Clearly indicate auth requirements and deprecation
5. **Monitor Usage**: Track which routers/tools are most used

## Next Steps

- See [Example 08](../08-auth-token) for authentication patterns
- See [Example 09](../09-auth0) for Auth0 integration
