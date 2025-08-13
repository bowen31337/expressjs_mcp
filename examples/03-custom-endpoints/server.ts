/**
 * Example 03: Custom Exposed Endpoints
 *
 * This example shows how to selectively expose only certain routes as MCP tools
 * using include/exclude filters.
 */

import express from "express";
import { ExpressMCP } from "../../src";

const app = express();
app.use(express.json());

// Sample routes
app.get("/public/hello", (_req, res) =>
	res.json({ message: "Hello, public!" }),
);
app.get("/public/status", (_req, res) => res.json({ status: "ok" }));

app.get("/admin/users", (_req, res) => res.json({ users: ["admin", "user1"] }));
app.post("/admin/users", (req, res) =>
	res.status(201).json({ id: "u1", ...req.body }),
);

app.get("/api/data", (_req, res) => res.json({ data: "sensitive" }));
app.post("/api/data", (req, res) => res.json({ processed: req.body }));

// Create different MCP instances with different configurations

// 1. Default (all routes)
const mcp = new ExpressMCP(app, { mountPath: "/mcp" });

// 2. Whitelist approach (only specific routes)
const mcpWhitelist = new ExpressMCP(app, {
	mountPath: "/mcp-whitelist",
	include: (route) => {
		// Only include public routes
		return route.path.startsWith("/public/");
	},
});

// 3. Pattern-based approach (exclude certain patterns)
const mcpPatterns = new ExpressMCP(app, {
	mountPath: "/mcp-patterns",
	exclude: (route) => {
		// Exclude admin routes
		return route.path.startsWith("/admin/");
	},
});

// Initialize all MCP instances
await Promise.all([mcp.init(), mcpWhitelist.init(), mcpPatterns.init()]);

// Mount all MCP endpoints
mcp.mount("/mcp");
mcpWhitelist.mount("/mcp-whitelist");
mcpPatterns.mount("/mcp-patterns");

const PORT = 3002;
app.listen(PORT, () => {
	console.log(`✅ Express server running on http://localhost:${PORT}`);
	console.log("\n🔧 MCP Endpoints:");
	console.log("1️⃣ Default approach (/mcp):");
	console.log(`   Found ${mcp.listTools().length} tools:`);
	for (const tool of mcp.listTools()) {
		const toolObj = tool as { title: string };
		console.log(`   - ${toolObj.title}`);
	}

	console.log("\n2️⃣ Whitelist approach (/mcp-whitelist):");
	console.log(`   Found ${mcpWhitelist.listTools().length} tools:`);
	for (const tool of mcpWhitelist.listTools()) {
		const toolObj = tool as { title: string };
		console.log(`   - ${toolObj.title}`);
	}

	console.log("\n3️⃣ Pattern-based (/mcp-patterns):");
	console.log(`   Found ${mcpPatterns.listTools().length} tools:`);
	for (const tool of mcpPatterns.listTools()) {
		const toolObj = tool as { title: string };
		console.log(`   - ${toolObj.title}`);
	}

	console.log("\n🔍 Test the different endpoints:");
	console.log(`   curl http://localhost:${PORT}/mcp/tools`);
	console.log(`   curl http://localhost:${PORT}/mcp-whitelist/tools`);
	console.log(`   curl http://localhost:${PORT}/mcp-patterns/tools`);
});
