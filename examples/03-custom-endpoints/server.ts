/**
 * Example 03: Custom Exposed Endpoints
 * 
 * This example shows how to selectively expose only certain routes as MCP tools
 * using include/exclude filters.
 */

import { app } from "../shared/app";
import { ExpressMCP, RouteInfo } from "../../src/index";

// Create ExpressMCP with custom filters
const mcp = new ExpressMCP(app, {
  mountPath: "/mcp",
  
  // Include only specific routes
  include: (route: RouteInfo) => {
    // Only expose routes that:
    // 1. Are under /items path
    // 2. Are GET or POST methods
    // 3. Are not the search endpoint
    return (
      route.path.startsWith("/items") &&
      ["GET", "POST"].includes(route.method) &&
      !route.path.includes("search")
    );
  },
  
  // Exclude specific routes (applied after include)
  exclude: (route: RouteInfo) => {
    // Exclude bulk operations
    return route.path.includes("bulk");
  },
  
  logging: {
    info: (...args) => console.log("[MCP]", ...args),
    error: (...args) => console.error("[MCP ERROR]", ...args),
  },
});

// Alternative: Using a whitelist approach
const mcpWhitelist = new ExpressMCP(app, {
  mountPath: "/mcp-whitelist",
  
  // Only expose specific endpoints by exact match
  include: (route: RouteInfo) => {
    const allowedEndpoints = [
      "GET /items",
      "GET /items/:id",
      "POST /items",
    ];
    return allowedEndpoints.includes(`${route.method} ${route.path}`);
  },
});

// Alternative: Using a pattern-based approach
const mcpPatterns = new ExpressMCP(app, {
  mountPath: "/mcp-patterns",
  
  include: (route: RouteInfo) => {
    // Complex filtering logic
    const isReadOnly = route.method === "GET";
    const isItemRoute = /^\/items(\/\d+)?$/.test(route.path);
    const isHealthCheck = route.path === "/health";
    
    // Only expose read-only item routes and health check
    return (isReadOnly && isItemRoute) || isHealthCheck;
  },
});

async function start() {
  // Initialize all MCP instances
  await mcp.init();
  await mcpWhitelist.init();
  await mcpPatterns.init();
  
  // Mount all MCP instances at different paths
  mcp.mount();
  mcpWhitelist.mount();
  mcpPatterns.mount();
  
  const PORT = process.env.PORT || 3003;
  app.listen(PORT, () => {
    console.log(`✅ Express server running on http://localhost:${PORT}`);
    console.log("\n📡 MCP Endpoints:");
    
    // Show filtered tools
    console.log("\n1️⃣ Default filters (/mcp):");
    const tools1 = mcp.listTools();
    console.log(`   Found ${tools1.length} tools:`);
    tools1.forEach((tool: any) => {
      console.log(`   - ${tool.title}`);
    });
    
    console.log("\n2️⃣ Whitelist approach (/mcp-whitelist):");
    const tools2 = mcpWhitelist.listTools();
    console.log(`   Found ${tools2.length} tools:`);
    tools2.forEach((tool: any) => {
      console.log(`   - ${tool.title}`);
    });
    
    console.log("\n3️⃣ Pattern-based (/mcp-patterns):");
    const tools3 = mcpPatterns.listTools();
    console.log(`   Found ${tools3.length} tools:`);
    tools3.forEach((tool: any) => {
      console.log(`   - ${tool.title}`);
    });
    
    console.log("\n🔍 Test the different endpoints:");
    console.log(`   curl http://localhost:${PORT}/mcp/tools`);
    console.log(`   curl http://localhost:${PORT}/mcp-whitelist/tools`);
    console.log(`   curl http://localhost:${PORT}/mcp-patterns/tools`);
  });
}

start().catch(console.error);
