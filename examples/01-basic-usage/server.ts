/**
 * Example 01: Basic Usage
 * 
 * This example demonstrates the simplest way to add MCP capabilities to an Express app.
 * It automatically exposes all routes as MCP tools with minimal configuration.
 */

import { app } from "../shared/app";
import { ExpressMCP } from "../../src/index";

// Create and configure ExpressMCP
const mcp = new ExpressMCP(app, {
  // Basic configuration - uses defaults for most settings
  mountPath: "/mcp",
});

// Initialize MCP (discovers routes and creates tools)
async function start() {
  await mcp.init();
  
  // Mount MCP endpoints to the Express app
  mcp.mount();
  
  // Start the Express server
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`✅ Express server running on http://localhost:${PORT}`);
    console.log(`📡 MCP tools available at http://localhost:${PORT}/mcp/tools`);
    console.log(`🚀 MCP invoke endpoint at http://localhost:${PORT}/mcp/invoke`);
    
    // List discovered tools
    const tools = mcp.listTools();
    console.log(`\n🔧 Discovered ${tools.length} MCP tools:`);
    tools.forEach((tool: any) => {
      console.log(`  - ${tool.title}: ${tool.description}`);
    });
  });
}

// Start the server
start().catch(console.error);
