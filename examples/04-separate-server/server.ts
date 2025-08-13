/**
 * Example 04: Separate MCP Server
 * 
 * This example shows how to run the MCP server as a standalone HTTP gateway,
 * separate from the main Express application. This is useful for:
 * - Microservices architecture
 * - Different scaling requirements
 * - Security isolation
 */

import { app } from "../shared/app";
import { ExpressMCP } from "../../src/index";

// Start the main Express app on its own port
async function startMainApp() {
  const PORT = process.env.APP_PORT || 3004;
  
  app.listen(PORT, () => {
    console.log(`✅ Main Express app running on http://localhost:${PORT}`);
    console.log(`   - GET  http://localhost:${PORT}/items`);
    console.log(`   - POST http://localhost:${PORT}/items`);
    console.log(`   - GET  http://localhost:${PORT}/health`);
  });
}

// Start the MCP server as a standalone HTTP gateway
async function startMCPServer() {
  const mcp = new ExpressMCP(app, {
    logging: {
      info: (...args) => console.log("[MCP Gateway]", ...args),
      error: (...args) => console.error("[MCP Gateway ERROR]", ...args),
    },
  });
  
  // Initialize MCP
  await mcp.init();
  
  // Start standalone MCP server on a different port
  const MCP_PORT = process.env.MCP_PORT || 7878;
  await mcp.startStandalone({ port: Number(MCP_PORT) });
  
  console.log(`\n📡 MCP Gateway running separately on http://localhost:${MCP_PORT}`);
  console.log(`   - GET  http://localhost:${MCP_PORT}/mcp/tools`);
  console.log(`   - POST http://localhost:${MCP_PORT}/mcp/invoke`);
  
  // Display available tools
  const tools = mcp.listTools();
  console.log(`\n🔧 MCP Gateway serving ${tools.length} tools`);
}

// Start both servers
async function start() {
  console.log("Starting servers...\n");
  
  // Start main app
  await startMainApp();
  
  // Start MCP gateway
  await startMCPServer();
  
  console.log("\n🎯 Architecture:");
  console.log("   Main App (port 3004) ← MCP Gateway (port 7878) ← MCP Clients");
  console.log("\n📝 Notes:");
  console.log("   - Main app handles regular HTTP traffic");
  console.log("   - MCP gateway handles MCP protocol traffic");
  console.log("   - MCP gateway internally dispatches to main app handlers");
  console.log("   - No network calls between servers (in-memory dispatch)");
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\nShutting down servers...");
  process.exit(0);
});

start().catch(console.error);
