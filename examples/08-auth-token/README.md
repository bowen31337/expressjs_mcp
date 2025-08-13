# Example 08: Auth Token Passthrough

This example demonstrates how to pass authentication tokens through the MCP layer to underlying Express routes, maintaining security across all layers.

## Features

- **Token Passthrough**: Auth headers forwarded from MCP to Express
- **Multiple Auth Schemes**: Bearer tokens, API keys, session tokens
- **Role-Based Access**: Different permissions for different roles
- **Session Management**: Dynamic token generation and validation
- **Security Preservation**: No auth bypass through MCP

## Running the Example

```bash
# Install dependencies
pnpm install

# Run the example
pnpm tsx examples/08-auth-token/server.ts
```

## Authentication Schemes

### 1. Bearer Token

Static tokens for testing:
```bash
curl http://localhost:3008/user/profile \
  -H "Authorization: Bearer user-token-123"
```

### 2. API Key

Service authentication:
```bash
curl http://localhost:3008/service/metrics \
  -H "Authorization: ApiKey api-key-789"
```

### 3. Session Token

Dynamic tokens from login:
```bash
# Login
curl -X POST http://localhost:3008/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "password123"}'

# Use returned token
curl http://localhost:3008/user/profile \
  -H "Authorization: Bearer session-xxxxx"
```

## MCP with Authentication

### Authenticated Tool Invocation

The auth header is passed through to the underlying route:

```bash
# User endpoint via MCP
curl -X POST http://localhost:3008/mcp/invoke \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer user-token-123" \
  -d '{"toolName": "GET_/user/profile", "args": {}}'
```

### Admin Endpoints

Requires admin role:
```bash
# Admin endpoint via MCP
curl -X POST http://localhost:3008/mcp/invoke \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token-456" \
  -d '{"toolName": "GET_/admin/users", "args": {}}'
```

### Public Endpoints

No authentication required:
```bash
# Public endpoint via MCP
curl -X POST http://localhost:3008/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{"toolName": "GET_/public/info", "args": {}}'
```

## Implementation Details

### Auth Passthrough in MCP

```typescript
app.post("/mcp/invoke", async (req, res) => {
  const authHeader = req.headers.authorization;
  
  // Pass auth header to dispatcher
  const headers = {
    "content-type": "application/json",
    ...(authHeader && { authorization: authHeader }),
  };
  
  const result = await dispatcher.dispatch(
    route.method,
    route.path,
    args,
    headers // Auth included here
  );
});
```

### Middleware Chain

```typescript
// Auth middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = users.get(token);
  
  if (!user) {
    return res.status(401).json({ error: "Invalid token" });
  }
  
  req.user = user;
  next();
};

// Role middleware
const requireRole = (role) => (req, res, next) => {
  if (req.user.role !== role) {
    return res.status(403).json({ error: `Requires ${role} role` });
  }
  next();
};
```

## Security Patterns

### 1. No Auth Bypass

MCP doesn't bypass authentication:
```typescript
// ❌ Without auth header - fails
curl -X POST http://localhost:3008/mcp/invoke \
  -d '{"toolName": "GET_/user/profile", "args": {}}'
// Returns: 401 Unauthorized

// ✅ With auth header - succeeds
curl -X POST http://localhost:3008/mcp/invoke \
  -H "Authorization: Bearer user-token-123" \
  -d '{"toolName": "GET_/user/profile", "args": {}}'
```

### 2. Role Enforcement

Roles are enforced at the Express level:
```typescript
app.get("/admin/users", 
  authenticate,           // First check auth
  requireRole("admin"),   // Then check role
  handler
);
```

### 3. Token Validation

All tokens validated before processing:
```typescript
if (!user) {
  return res.status(401).json({ error: "Invalid token" });
}
```

## Testing Scenarios

### Successful Authentication

```bash
# Valid user token
curl -X POST http://localhost:3008/mcp/invoke \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer user-token-123" \
  -d '{"toolName": "GET_/user/data", "args": {}}'

# Response: 200 OK with user data
```

### Failed Authentication

```bash
# Invalid token
curl -X POST http://localhost:3008/mcp/invoke \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid-token" \
  -d '{"toolName": "GET_/user/data", "args": {}}'

# Response: 401 Unauthorized
```

### Insufficient Permissions

```bash
# User token for admin endpoint
curl -X POST http://localhost:3008/mcp/invoke \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer user-token-123" \
  -d '{"toolName": "GET_/admin/users", "args": {}}'

# Response: 403 Forbidden - Requires admin role
```

## Available Test Tokens

| Token | Role | Access Level |
|-------|------|--------------|
| `user-token-123` | user | User endpoints |
| `admin-token-456` | admin | All endpoints |
| `api-key-789` | service | Service endpoints |
| Dynamic session | varies | Based on login |

## Use Cases

### 1. Multi-tenant SaaS

Different tokens for different tenants:
```typescript
const tenantToken = req.headers["x-tenant-token"];
req.tenant = tenants.get(tenantToken);
```

### 2. OAuth Integration

Pass OAuth tokens through MCP:
```typescript
const oauthToken = req.headers.authorization?.replace("Bearer ", "");
const user = await verifyOAuthToken(oauthToken);
```

### 3. API Gateway

Forward auth to microservices:
```typescript
const serviceResponse = await fetch(serviceUrl, {
  headers: {
    authorization: req.headers.authorization,
  },
});
```

## Best Practices

1. **Always Validate**: Never trust tokens without validation
2. **Use HTTPS**: Protect tokens in transit
3. **Token Expiry**: Implement token expiration
4. **Refresh Tokens**: Support token refresh flow
5. **Audit Logging**: Log authentication attempts
6. **Rate Limiting**: Prevent brute force attacks

## Next Steps

- See [Example 09](../09-auth0) for Auth0 integration
- See [Example 06](../06-custom-router) for router-specific auth
