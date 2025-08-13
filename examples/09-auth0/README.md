# Example 09: Auth0 Authentication

This example demonstrates how to integrate Auth0 authentication with Express-MCP, including JWT validation, permission-based access control, and OAuth2 scopes.

> **Note**: This example uses mock tokens for demonstration. In production, integrate with actual Auth0 using `express-jwt`, `jwks-rsa`, and Auth0 SDK.

## Features

- **JWT Validation**: Verify Auth0-issued JWTs
- **Permission-based Access**: Fine-grained permissions
- **OAuth2 Scopes**: Scope-based authorization
- **User Management**: Auth0 user profile integration
- **Token Passthrough**: Maintain auth through MCP layer

## Running the Example

```bash
# Install dependencies
pnpm install

# Run the example
pnpm tsx examples/09-auth0/server.ts
```

## Auth0 Setup (Production)

1. **Create Auth0 Application**:
   - Go to Auth0 Dashboard > Applications
   - Create a new Single Page Application
   - Note the Domain, Client ID, and Client Secret

2. **Configure API**:
   - Go to APIs > Create API
   - Set identifier (audience): `https://your-api.example.com`
   - Enable RBAC and Add Permissions in Token

3. **Define Permissions**:
   - `read:profile` - Read user profile
   - `write:profile` - Update user profile
   - `read:users` - List users
   - `write:users` - Create/update users
   - `admin:all` - Admin access

4. **Environment Variables**:
```env
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://your-api.example.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
```

## Authentication Flow

### 1. Login

```bash
curl -X POST http://localhost:3009/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password"
  }'
```

Response:
```json
{
  "access_token": "mock-jwt-user",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "sub": "auth0|user123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### 2. Use Token

```bash
curl http://localhost:3009/api/profile \
  -H "Authorization: Bearer mock-jwt-user"
```

### 3. MCP with Auth0

```bash
curl -X POST http://localhost:3009/mcp/invoke \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-jwt-user" \
  -d '{
    "toolName": "GET_/api/profile",
    "args": {}
  }'
```

## Permission Model

### User Roles and Permissions

| Role | Permissions | Access |
|------|------------|--------|
| User | `read:profile`, `write:profile` | Own profile |
| Admin | All permissions + `admin:all` | Everything |
| Viewer | `read:profile`, `read:users` | Read-only |

### Testing Permissions

```bash
# User can read their profile
curl -H "Authorization: Bearer mock-jwt-user" \
  http://localhost:3009/api/profile

# User cannot access admin endpoints
curl -H "Authorization: Bearer mock-jwt-user" \
  http://localhost:3009/api/admin/users
# Returns: 403 Forbidden

# Admin can access everything
curl -H "Authorization: Bearer mock-jwt-admin" \
  http://localhost:3009/api/admin/users
# Returns: 200 OK
```

## OAuth2 Scopes

### Scope-based Access

```bash
# Requires 'email' scope
curl http://localhost:3009/api/email \
  -H "Authorization: Bearer mock-jwt-user"
```

### Available Scopes

- `openid` - OpenID Connect
- `profile` - User profile information
- `email` - Email address
- `offline_access` - Refresh tokens

## Production Implementation

### 1. Install Dependencies

```bash
pnpm add express-jwt jwks-rsa auth0
```

### 2. JWT Middleware

```typescript
import { expressjwt } from "express-jwt";
import jwksRsa from "jwks-rsa";

const checkJwt = expressjwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`
  }),
  audience: AUTH0_AUDIENCE,
  issuer: `https://${AUTH0_DOMAIN}/`,
  algorithms: ["RS256"]
});
```

### 3. Permission Check

```typescript
const checkPermission = (permission: string) => {
  return (req, res, next) => {
    const { permissions } = req.auth;
    
    if (!permissions?.includes(permission)) {
      return res.status(403).json({
        error: "Insufficient permissions"
      });
    }
    
    next();
  };
};
```

### 4. User Info

```typescript
import { ManagementClient } from "auth0";

const management = new ManagementClient({
  domain: AUTH0_DOMAIN,
  clientId: AUTH0_CLIENT_ID,
  clientSecret: AUTH0_CLIENT_SECRET,
});

app.get("/api/user/:id", checkJwt, async (req, res) => {
  const user = await management.getUser({ id: req.params.id });
  res.json(user);
});
```

## MCP Integration

### Passing Auth0 Tokens

```typescript
// MCP invoke with Auth0 token
app.post("/mcp/invoke", async (req, res) => {
  const authHeader = req.headers.authorization;
  
  // Pass token to underlying routes
  const headers = {
    authorization: authHeader,
  };
  
  const result = await dispatcher.dispatch(
    route.method,
    route.path,
    args,
    headers
  );
});
```

### Protected MCP Tools

Tools automatically inherit Auth0 protection:
```bash
# Public tool - works without auth
curl -X POST http://localhost:3009/mcp/invoke \
  -d '{"toolName": "GET_/", "args": {}}'

# Protected tool - requires valid JWT
curl -X POST http://localhost:3009/mcp/invoke \
  -H "Authorization: Bearer mock-jwt-user" \
  -d '{"toolName": "GET_/api/profile", "args": {}}'
```

## Testing Scenarios

### Successful Flow

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3009/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin"}' \
  | jq -r .access_token)

# 2. Access protected endpoint
curl http://localhost:3009/api/profile \
  -H "Authorization: Bearer $TOKEN"

# 3. Invoke MCP tool
curl -X POST http://localhost:3009/mcp/invoke \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"toolName": "GET_/api/admin/users", "args": {}}'
```

### Error Scenarios

```bash
# No token
curl http://localhost:3009/api/profile
# 401: No token provided

# Invalid token
curl http://localhost:3009/api/profile \
  -H "Authorization: Bearer invalid"
# 401: Invalid token

# Insufficient permissions
curl http://localhost:3009/api/admin/users \
  -H "Authorization: Bearer mock-jwt-user"
# 403: Permission 'admin:all' required
```

## Security Best Practices

1. **Always Use HTTPS**: Protect tokens in transit
2. **Validate Tokens**: Verify signature and claims
3. **Check Permissions**: Enforce at API level
4. **Token Expiry**: Implement short-lived tokens
5. **Refresh Tokens**: Use refresh token rotation
6. **Audit Logging**: Log all auth events
7. **Rate Limiting**: Prevent token abuse

## Troubleshooting

### Common Issues

1. **Token Expired**:
   - Get a new token via login
   - Implement refresh token flow

2. **Invalid Audience**:
   - Check AUTH0_AUDIENCE matches API identifier
   - Verify token was issued for correct API

3. **Missing Permissions**:
   - Check user's assigned permissions in Auth0
   - Verify permissions are included in token

4. **CORS Issues**:
   - Configure CORS for your domain
   - Add Auth0 domain to allowed origins

## Next Steps

- Implement refresh token flow
- Add user registration via Auth0
- Configure social login providers
- Set up Auth0 Rules for custom claims
- Implement MFA (Multi-Factor Authentication)
- Add Auth0 Actions for custom logic
