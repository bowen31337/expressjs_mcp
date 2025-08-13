/**
 * Example 01: Basic Usage
 *
 * This example demonstrates the simplest way to add MCP capabilities to an Express app.
 * It automatically exposes all routes as MCP tools with minimal configuration.
 */

import express from "express";
import { ExpressMCP } from "../../src";

const app = express();
app.use(express.json());

app.get("/hello", (_req, res) => res.json({ message: "world" }));
app.post("/order", (req, res) =>
	res.status(201).json({ id: "o1", ...req.body }),
);

const mcp = new ExpressMCP(app, { mountPath: "/mcp" });
await mcp.init();
mcp.mount("/mcp");

app.listen(3000, () =>
	console.log("App on http://localhost:3000 → /mcp/tools, /mcp/invoke"),
);

// Demo: List available tools
if (process.env.NODE_ENV !== "production") {
	// Show available tools in development
	setTimeout(() => {
		const tools = mcp.listTools();
		console.log(`\n🔧 Discovered ${tools.length} MCP tools:`);
		for (const tool of tools) {
			const toolObj = tool as { title: string; description: string };
			console.log(`  - ${toolObj.title}: ${toolObj.description}`);
		}
	});
}
