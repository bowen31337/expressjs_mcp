/**
 * Example 09: Auth0 Authentication
 * 
 * This example shows how to integrate Auth0 authentication with Express-MCP,
 * including JWT validation, user info retrieval, and permission checks.
 * 
 * Note: This is a simulation of Auth0 integration. In production, use the
 * actual Auth0 SDK and configure with your Auth0 tenant.
 */

import express, { Request, Response, NextFunction } from "express";
import { ExpressMCP } from "../../src/index";
import crypto from "crypto";

// Simulated Auth0 configuration (in production, use environment variables)
const AUTH0_DOMAIN = "your-tenant.auth0.com";
const AUTH0_AUDIENCE = "https://your-api.example.com";
const AUTH0_CLIENT_ID = "your-client-id";

// Create Express app
const app = express();
app.use(express.json());

// Simulated JWT validation (in production, use express-jwt and jwks-rsa)
interface DecodedToken {
  sub: string;  // User ID
  email: string;
  name: string;
  permissions?: string[];
  scope?: string;
  exp: number;
  iat: number;
  aud: string;
  iss: string;
}

// Mock JWT tokens for testing
const mockTokens = new Map<string, DecodedToken>([
  ["mock-jwt-user", {
    sub: "auth0|user123",
    email: "user@example.com",
    name: "John Doe",
    permissions: ["read:profile", "write:profile"],
    scope: "openid profile email",
    exp: Date.now() / 1000 + 3600,
    iat: Date.now() / 1000,
    aud: AUTH0_AUDIENCE,
    iss: `https://${AUTH0_DOMAIN}/`,
  }],
  ["mock-jwt-admin", {
    sub: "auth0|admin456",
    email: "admin@example.com",
    name: "Jane Admin",
    permissions: ["read:profile", "write:profile", "read:users", "write:users", "admin:all"],
    scope: "openid profile email",
    exp: Date.now() / 1000 + 3600,
    iat: Date.now() / 1000,
    aud: AUTH0_AUDIENCE,
    iss: `https://${AUTH0_DOMAIN}/`,
  }],
  ["mock-jwt-readonly", {
    sub: "auth0|readonly789",
    email: "viewer@example.com",
    name: "View Only",
    permissions: ["read:profile", "read:users"],
    scope: "openid profile email",
    exp: Date.now() / 1000 + 3600,
    iat: Date.now() / 1000,
    aud: AUTH0_AUDIENCE,
    iss: `https://${AUTH0_DOMAIN}/`,
  }],
]);

// Auth0 JWT validation middleware (simplified)
const checkJwt = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "No token provided",
      message: "Authorization header with Bearer token required",
    });
  }
  
  const token = authHeader.substring(7);
  
  // In production, verify JWT signature with Auth0's public key
  const decoded = mockTokens.get(token);
  
  if (!decoded) {
    return res.status(401).json({
      error: "Invalid token",
      message: "Token validation failed",
    });
  }
  
  // Check token expiration
  if (decoded.exp < Date.now() / 1000) {
    return res.status(401).json({
      error: "Token expired",
      message: "Please obtain a new token",
    });
  }
  
  // Attach user info to request
  (req as any).user = decoded;
  next();
};

// Permission check middleware
const checkPermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as DecodedToken;
    
    if (!user) {
      return res.status(401).json({
        error: "Not authenticated",
        message: "User not found in request",
      });
    }
    
    if (!user.permissions || !user.permissions.includes(permission)) {
      return res.status(403).json({
        error: "Insufficient permissions",
        message: `Permission '${permission}' required`,
        userPermissions: user.permissions || [],
      });
    }
    
    next();
  };
};

// Scope check middleware (OAuth2 scopes)
const checkScope = (requiredScope: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as DecodedToken;
    
    if (!user || !user.scope) {
      return res.status(401).json({
        error: "No scope information",
        message: "Token does not contain scope information",
      });
    }
    
    const scopes = user.scope.split(" ");
    if (!scopes.includes(requiredScope)) {
      return res.status(403).json({
        error: "Insufficient scope",
        message: `Scope '${requiredScope}' required`,
        userScopes: scopes,
      });
    }
    
    next();
  };
};

// Public endpoints (no auth required)
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Auth0 Integration Example",
    endpoints: {
      public: ["/", "/auth/login"],
      protected: ["/api/profile", "/api/users"],
      admin: ["/api/admin/users", "/api/admin/permissions"],
    },
    auth0: {
      domain: AUTH0_DOMAIN,
      audience: AUTH0_AUDIENCE,
      clientId: AUTH0_CLIENT_ID,
    },
  });
});

// Auth0 login simulation (in production, use Auth0 Universal Login)
app.post("/auth/login", (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  // Simulate Auth0 authentication
  let token: string | null = null;
  
  if (email === "user@example.com" && password === "password") {
    token = "mock-jwt-user";
  } else if (email === "admin@example.com" && password === "admin") {
    token = "mock-jwt-admin";
  } else if (email === "viewer@example.com" && password === "readonly") {
    token = "mock-jwt-readonly";
  }
  
  if (token) {
    const user = mockTokens.get(token);
    res.json({
      access_token: token,
      token_type: "Bearer",
      expires_in: 3600,
      user: {
        sub: user?.sub,
        email: user?.email,
        name: user?.name,
      },
    });
  } else {
    res.status(401).json({
      error: "Invalid credentials",
      message: "Authentication failed",
    });
  }
});

// Protected endpoints - require valid JWT
app.get("/api/profile", checkJwt, (req: Request, res: Response) => {
  const user = (req as any).user as DecodedToken;
  res.json({
    profile: {
      id: user.sub,
      email: user.email,
      name: user.name,
    },
    permissions: user.permissions || [],
    scope: user.scope,
  });
});

// Endpoints with specific permissions
app.get("/api/users", 
  checkJwt, 
  checkPermission("read:users"),
  (req: Request, res: Response) => {
    res.json({
      users: [
        { id: "auth0|user123", name: "John Doe", email: "user@example.com" },
        { id: "auth0|admin456", name: "Jane Admin", email: "admin@example.com" },
        { id: "auth0|readonly789", name: "View Only", email: "viewer@example.com" },
      ],
    });
  }
);

app.post("/api/users",
  checkJwt,
  checkPermission("write:users"),
  (req: Request, res: Response) => {
    const { name, email } = req.body;
    res.status(201).json({
      id: `auth0|${crypto.randomBytes(6).toString("hex")}`,
      name,
      email,
      created: new Date().toISOString(),
    });
  }
);

app.put("/api/profile",
  checkJwt,
  checkPermission("write:profile"),
  (req: Request, res: Response) => {
    const user = (req as any).user as DecodedToken;
    const { name, email } = req.body;
    
    res.json({
      message: "Profile updated",
      profile: {
        id: user.sub,
        name: name || user.name,
        email: email || user.email,
      },
    });
  }
);

// Admin endpoints - require admin permission
app.get("/api/admin/users",
  checkJwt,
  checkPermission("admin:all"),
  (req: Request, res: Response) => {
    res.json({
      users: Array.from(mockTokens.values()).map(token => ({
        id: token.sub,
        email: token.email,
        name: token.name,
        permissions: token.permissions,
      })),
      total: mockTokens.size,
    });
  }
);

app.post("/api/admin/permissions",
  checkJwt,
  checkPermission("admin:all"),
  (req: Request, res: Response) => {
    const { userId, permissions } = req.body;
    res.json({
      message: "Permissions updated",
      userId,
      permissions,
    });
  }
);

// OAuth2 scope-based endpoints
app.get("/api/email",
  checkJwt,
  checkScope("email"),
  (req: Request, res: Response) => {
    const user = (req as any).user as DecodedToken;
    res.json({
      email: user.email,
      verified: true,
    });
  }
);

// Auth0 Management API simulation
app.get("/api/auth0/user/:id",
  checkJwt,
  checkPermission("read:users"),
  (req: Request, res: Response) => {
    const { id } = req.params;
    
    // Find user by sub
    const user = Array.from(mockTokens.values()).find(t => t.sub === id);
    
    if (user) {
      res.json({
        user_id: user.sub,
        email: user.email,
        name: user.name,
        permissions: user.permissions,
        created_at: new Date(user.iat * 1000).toISOString(),
      });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  }
);

// Create ExpressMCP with Auth0 integration
const mcp = new ExpressMCP(app, {
  mountPath: "/mcp",
  logging: {
    info: (...args) => console.log("[MCP]", ...args),
    error: (...args) => console.error("[MCP ERROR]", ...args),
  },
});

// Override MCP invoke to pass Auth0 tokens
app.post("/mcp/invoke", async (req: Request, res: Response) => {
  const { toolName, args } = req.body;
  const authHeader = req.headers.authorization;
  
  const tools = mcp.listTools();
  const tool = tools.find((t: any) => t.name === toolName || t.title === toolName);
  
  if (!tool) {
    return res.status(404).json({ error: "Tool not found" });
  }
  
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  
  // Pass Auth0 token through
  if (authHeader) {
    headers.authorization = authHeader;
  }
  
  try {
    const dispatcher = (mcp as any).dispatcher;
    const route = (tool as any).route;
    
    const result = await dispatcher.dispatch(
      route.method,
      route.path,
      args,
      headers,
      { timeout: 30000 }
    );
    
    res.status(200).json({
      ok: true,
      result: result.body,
      status: result.status,
    });
  } catch (error) {
    console.error("MCP invoke error:", error);
    res.status(500).json({
      ok: false,
      error: (error as Error).message,
    });
  }
});

async function start() {
  await mcp.init();
  mcp.mount("/mcp-base");
  
  const PORT = process.env.PORT || 3009;
  app.listen(PORT, () => {
    console.log(`✅ Express server with Auth0 running on http://localhost:${PORT}`);
    console.log(`📡 MCP tools available at http://localhost:${PORT}/mcp/tools`);
    
    console.log("\n🔐 Auth0 Configuration:");
    console.log(`   Domain:   ${AUTH0_DOMAIN}`);
    console.log(`   Audience: ${AUTH0_AUDIENCE}`);
    console.log(`   Client:   ${AUTH0_CLIENT_ID}`);
    
    console.log("\n🔑 Test Credentials:");
    console.log("   User:     user@example.com / password");
    console.log("   Admin:    admin@example.com / admin");
    console.log("   Viewer:   viewer@example.com / readonly");
    
    console.log("\n📝 Authentication Flow:");
    console.log("\n1. Login to get JWT:");
    console.log(`   curl -X POST http://localhost:${PORT}/auth/login \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"email": "user@example.com", "password": "password"}'`);
    
    console.log("\n2. Use JWT for protected endpoints:");
    console.log(`   curl http://localhost:${PORT}/api/profile \\`);
    console.log(`     -H "Authorization: Bearer mock-jwt-user"`);
    
    console.log("\n3. Invoke MCP tool with Auth0 token:");
    console.log(`   curl -X POST http://localhost:${PORT}/mcp/invoke \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -H "Authorization: Bearer mock-jwt-user" \\`);
    console.log(`     -d '{"toolName": "GET_/api/profile", "args": {}}'`);
    
    console.log("\n4. Permission-based access:");
    console.log(`   # Read users (user has permission)`);
    console.log(`   curl -X POST http://localhost:${PORT}/mcp/invoke \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -H "Authorization: Bearer mock-jwt-user" \\`);
    console.log(`     -d '{"toolName": "GET_/api/users", "args": {}}'`);
    
    console.log(`\n   # Admin endpoint (requires admin token)`);
    console.log(`   curl -X POST http://localhost:${PORT}/mcp/invoke \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -H "Authorization: Bearer mock-jwt-admin" \\`);
    console.log(`     -d '{"toolName": "GET_/api/admin/users", "args": {}}'`);
    
    console.log("\n🔒 Permissions:");
    console.log("   User:  read:profile, write:profile");
    console.log("   Admin: All permissions + admin:all");
    console.log("   Viewer: read:profile, read:users (no write)");
  });
}

start().catch(console.error);
