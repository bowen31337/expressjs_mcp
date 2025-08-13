/**
 * Example 05: Re-register Tools Dynamically
 *
 * This example shows how to dynamically add, remove, and update MCP tools
 * at runtime without restarting the server.
 */

import express, { type Request, type Response } from "express";
import { z } from "zod";
import { ExpressMCP, type RouteInfo } from "../../src/index";

// Create base Express app
const app = express();
app.use(express.json());

// Initial routes
app.get("/health", (req: Request, res: Response) => {
	res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.get("/api/v1/users", (req: Request, res: Response) => {
	res.json([
		{ id: 1, name: "Alice" },
		{ id: 2, name: "Bob" },
	]);
});

// Create ExpressMCP instance
const mcp = new ExpressMCP(app, {
	mountPath: "/mcp",
	logging: {
		info: (...args) => console.log("[MCP]", ...args),
		error: (...args) => console.error("[MCP ERROR]", ...args),
	},
});

// Track dynamically added routes
const dynamicRoutes = new Map<string, any>();

// Admin endpoints to manage tools
app.post("/admin/tools/add", async (req: Request, res: Response) => {
	const { path, method = "GET", handler, schema } = req.body;

	if (!path) {
		return res.status(400).json({ error: "Path is required" });
	}

	const routeKey = `${method} ${path}`;

	// Check if route already exists
	if (dynamicRoutes.has(routeKey)) {
		return res.status(409).json({ error: "Route already exists" });
	}

	// Create handler function
	const routeHandler = handler
		? new Function("req", "res", handler)
		: (req: Request, res: Response) => {
				res.json({
					message: `Dynamic route: ${method} ${path}`,
					timestamp: new Date().toISOString(),
					params: req.params,
					query: req.query,
				});
			};

	// Add route to Express
	const methodLower = method.toLowerCase() as keyof typeof app;
	if (["get", "post", "put", "delete", "patch"].includes(methodLower)) {
		(app as any)[methodLower](path, routeHandler);
		dynamicRoutes.set(routeKey, {
			path,
			method,
			handler: routeHandler,
			schema,
		});

		// Re-initialize MCP to discover new route
		await mcp.init();

		res.json({
			message: "Tool added successfully",
			tool: routeKey,
			totalTools: mcp.listTools().length,
		});
	} else {
		res.status(400).json({ error: "Invalid HTTP method" });
	}
});

app.delete("/admin/tools/remove", async (req: Request, res: Response) => {
	const { path, method = "GET" } = req.body;
	const routeKey = `${method} ${path}`;

	if (!dynamicRoutes.has(routeKey)) {
		return res.status(404).json({ error: "Route not found" });
	}

	// Note: Express doesn't provide a clean way to remove routes
	// In production, you'd need to rebuild the router or use a more sophisticated approach
	dynamicRoutes.delete(routeKey);

	// Re-initialize MCP with filter to exclude removed route
	const originalExclude = mcp.options.exclude;
	mcp.options.exclude = (route: RouteInfo) => {
		const key = `${route.method} ${route.path}`;
		if (dynamicRoutes.has(key) && !dynamicRoutes.get(key)) {
			return true; // Exclude removed routes
		}
		return originalExclude ? originalExclude(route) : false;
	};

	await mcp.init();

	res.json({
		message: "Tool removed successfully",
		tool: routeKey,
		totalTools: mcp.listTools().length,
	});
});

app.get("/admin/tools/list", (req: Request, res: Response) => {
	const tools = mcp.listTools();
	const dynamicToolsList = Array.from(dynamicRoutes.keys());

	res.json({
		total: tools.length,
		static: tools.filter((t: any) => !dynamicToolsList.includes(t.title))
			.length,
		dynamic: dynamicToolsList.length,
		tools: tools.map((t: any) => ({
			name: t.name,
			title: t.title,
			isDynamic: dynamicToolsList.includes(t.title),
		})),
	});
});

app.post("/admin/tools/refresh", async (req: Request, res: Response) => {
	// Force re-initialization to discover any changes
	await mcp.init();

	const tools = mcp.listTools();
	res.json({
		message: "Tools refreshed",
		totalTools: tools.length,
		tools: tools.map((t: any) => t.title),
	});
});

// Batch operations
app.post("/admin/tools/batch", async (req: Request, res: Response) => {
	const { operations } = req.body;

	if (!Array.isArray(operations)) {
		return res.status(400).json({ error: "Operations must be an array" });
	}

	const results = [];

	for (const op of operations) {
		const { action, path, method = "GET", handler, schema } = op;
		const routeKey = `${method} ${path}`;

		try {
			switch (action) {
				case "add":
					if (!dynamicRoutes.has(routeKey)) {
						const routeHandler = handler
							? new Function("req", "res", handler)
							: (req: Request, res: Response) => {
									res.json({
										message: `Dynamic route: ${method} ${path}`,
										timestamp: new Date().toISOString(),
									});
								};

						const methodLower = method.toLowerCase() as keyof typeof app;
						(app as any)[methodLower](path, routeHandler);
						dynamicRoutes.set(routeKey, {
							path,
							method,
							handler: routeHandler,
							schema,
						});
						results.push({ route: routeKey, status: "added" });
					} else {
						results.push({ route: routeKey, status: "already_exists" });
					}
					break;

				case "remove":
					if (dynamicRoutes.has(routeKey)) {
						dynamicRoutes.delete(routeKey);
						results.push({ route: routeKey, status: "removed" });
					} else {
						results.push({ route: routeKey, status: "not_found" });
					}
					break;

				default:
					results.push({ route: routeKey, status: "invalid_action" });
			}
		} catch (error) {
			results.push({
				route: routeKey,
				status: "error",
				error: (error as Error).message,
			});
		}
	}

	// Re-initialize MCP after batch operations
	await mcp.init();

	res.json({
		message: "Batch operations completed",
		results,
		totalTools: mcp.listTools().length,
	});
});

// Example: Add tools based on configuration
app.post("/admin/tools/load-config", async (req: Request, res: Response) => {
	const { config } = req.body;

	const exampleConfig = config || [
		{ path: "/api/v2/products", method: "GET" },
		{ path: "/api/v2/products/:id", method: "GET" },
		{ path: "/api/v2/products", method: "POST" },
		{ path: "/api/v2/orders", method: "GET" },
		{ path: "/api/v2/orders/:id", method: "GET" },
	];

	for (const route of exampleConfig) {
		const routeKey = `${route.method} ${route.path}`;
		if (!dynamicRoutes.has(routeKey)) {
			const handler = (req: Request, res: Response) => {
				res.json({
					endpoint: routeKey,
					timestamp: new Date().toISOString(),
					params: req.params,
					query: req.query,
				});
			};

			const methodLower = route.method.toLowerCase() as keyof typeof app;
			(app as any)[methodLower](route.path, handler);
			dynamicRoutes.set(routeKey, { ...route, handler });
		}
	}

	await mcp.init();

	res.json({
		message: "Configuration loaded",
		routesAdded: exampleConfig.length,
		totalTools: mcp.listTools().length,
	});
});

async function start() {
	await mcp.init();
	mcp.mount();

	const PORT = process.env.PORT || 3005;
	app.listen(PORT, () => {
		console.log(`✅ Express server running on http://localhost:${PORT}`);
		console.log(`📡 MCP tools available at http://localhost:${PORT}/mcp/tools`);

		console.log("\n🔧 Dynamic Tool Management:");
		console.log("   POST   /admin/tools/add      - Add a new tool");
		console.log("   DELETE /admin/tools/remove   - Remove a tool");
		console.log("   GET    /admin/tools/list     - List all tools");
		console.log("   POST   /admin/tools/refresh  - Refresh tool discovery");
		console.log("   POST   /admin/tools/batch    - Batch operations");
		console.log("   POST   /admin/tools/load-config - Load from config");

		console.log("\n📝 Test Commands:");
		console.log("\n1. Add a dynamic tool:");
		console.log(`   curl -X POST http://localhost:${PORT}/admin/tools/add \\`);
		console.log(`     -H "Content-Type: application/json" \\`);
		console.log(`     -d '{"path": "/api/dynamic/test", "method": "GET"}'`);

		console.log("\n2. Load example configuration:");
		console.log(
			`   curl -X POST http://localhost:${PORT}/admin/tools/load-config \\`,
		);
		console.log(`     -H "Content-Type: application/json" \\`);
		console.log(`     -d '{}'`);

		console.log("\n3. List all tools:");
		console.log(`   curl http://localhost:${PORT}/admin/tools/list`);

		console.log("\n4. Test dynamic tool via MCP:");
		console.log(`   curl -X POST http://localhost:${PORT}/mcp/invoke \\`);
		console.log(`     -H "Content-Type: application/json" \\`);
		console.log(`     -d '{"toolName": "GET_/api/dynamic/test", "args": {}}'`);
	});
}

start().catch(console.error);
