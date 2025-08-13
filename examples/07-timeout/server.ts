/**
 * Example 07: Configure HTTP Timeout
 * 
 * This example shows how to configure timeouts for MCP tool invocations.
 * Useful for:
 * - Long-running operations
 * - Preventing hung requests
 * - Different timeout requirements per tool
 */

import express, { Request, Response } from "express";
import { ExpressMCP } from "../../src/index";
import { app as baseApp } from "../shared/app";

// Create an extended app with slow endpoints
const app = express();
app.use(express.json());

// Copy routes from base app
app.use(baseApp);

// Add endpoints with different response times
app.get("/slow/short", async (req: Request, res: Response) => {
  // 2 second delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  res.json({ message: "Short delay completed", duration: "2s" });
});

app.get("/slow/medium", async (req: Request, res: Response) => {
  // 5 second delay
  await new Promise(resolve => setTimeout(resolve, 5000));
  res.json({ message: "Medium delay completed", duration: "5s" });
});

app.get("/slow/long", async (req: Request, res: Response) => {
  // 10 second delay
  await new Promise(resolve => setTimeout(resolve, 10000));
  res.json({ message: "Long delay completed", duration: "10s" });
});

app.get("/slow/very-long", async (req: Request, res: Response) => {
  // 35 second delay (will timeout with default settings)
  await new Promise(resolve => setTimeout(resolve, 35000));
  res.json({ message: "Very long delay completed", duration: "35s" });
});

// Create MCP with default timeout (30 seconds)
const mcpDefault = new ExpressMCP(app, {
  mountPath: "/mcp-default",
  logging: {
    info: (...args) => console.log("[MCP Default]", ...args),
    error: (...args) => console.error("[MCP Default ERROR]", ...args),
  },
});

// Create MCP with short timeout (3 seconds)
const mcpShort = new ExpressMCP(app, {
  mountPath: "/mcp-short",
  logging: {
    info: (...args) => console.log("[MCP Short]", ...args),
    error: (...args) => console.error("[MCP Short ERROR]", ...args),
  },
});

// Create MCP with long timeout (60 seconds)
const mcpLong = new ExpressMCP(app, {
  mountPath: "/mcp-long",
  logging: {
    info: (...args) => console.log("[MCP Long]", ...args),
    error: (...args) => console.error("[MCP Long ERROR]", ...args),
  },
});

async function start() {
  // Initialize all MCP instances
  await mcpDefault.init();
  await mcpShort.init();
  await mcpLong.init();
  
  // Mount all MCP instances
  mcpDefault.mount();
  mcpShort.mount();
  mcpLong.mount();
  
  // Add custom invoke endpoints with timeout handling
  app.post("/mcp-short/invoke", async (req: Request, res: Response, next) => {
    // Override timeout for short MCP
    req.body.timeout = 3000;
    next();
  });
  
  app.post("/mcp-long/invoke", async (req: Request, res: Response, next) => {
    // Override timeout for long MCP
    req.body.timeout = 60000;
    next();
  });
  
  const PORT = process.env.PORT || 3007;
  app.listen(PORT, () => {
    console.log(`✅ Express server running on http://localhost:${PORT}`);
    console.log("\n⏱️  Timeout Configuration:");
    console.log("   /mcp-default: 30s timeout (default)");
    console.log("   /mcp-short:   3s timeout");
    console.log("   /mcp-long:    60s timeout");
    
    console.log("\n🐢 Slow Endpoints:");
    console.log("   GET /slow/short     - 2s delay");
    console.log("   GET /slow/medium    - 5s delay");
    console.log("   GET /slow/long      - 10s delay");
    console.log("   GET /slow/very-long - 35s delay");
    
    console.log("\n📝 Test Commands:");
    console.log("\n1. Short timeout (will fail on medium/long endpoints):");
    console.log(`   curl -X POST http://localhost:${PORT}/mcp-short/invoke \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"toolName": "GET_/slow/medium", "args": {}}'`);
    
    console.log("\n2. Default timeout (will fail on very-long endpoint):");
    console.log(`   curl -X POST http://localhost:${PORT}/mcp-default/invoke \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"toolName": "GET_/slow/very-long", "args": {}}'`);
    
    console.log("\n3. Long timeout (handles all endpoints):");
    console.log(`   curl -X POST http://localhost:${PORT}/mcp-long/invoke \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"toolName": "GET_/slow/very-long", "args": {}}'`);
    
    console.log("\n4. Per-request timeout override:");
    console.log(`   curl -X POST http://localhost:${PORT}/mcp-default/invoke \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"toolName": "GET_/slow/medium", "args": {}, "timeout": 10000}'`);
  });
}

start().catch(console.error);
