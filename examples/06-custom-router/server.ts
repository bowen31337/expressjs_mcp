/**
 * Example 06: Custom MCP Router
 *
 * This example shows how to create custom MCP routers with different
 * configurations, middleware, and routing strategies.
 */

import express, {
	type Request,
	type Response,
	type NextFunction,
	Router,
} from "express";
import { z } from "zod";
import { ExpressMCP } from "../../src/index";

// Create main Express app
const app = express();
app.use(express.json());

// Create multiple routers with different purposes
const publicRouter = Router();
const adminRouter = Router();
const apiV1Router = Router();
const apiV2Router = Router();

// Middleware for different routers
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
	const token = req.headers.authorization?.replace("Bearer ", "");
	if (!token) {
		return res.status(401).json({ error: "Unauthorized" });
	}
	// Simple token validation (in production, verify JWT)
	if (token === "admin-token") {
		(req as any).user = { role: "admin", id: 1 };
		next();
	} else {
		res.status(403).json({ error: "Invalid token" });
	}
};

const rateLimitMiddleware = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	// Simple rate limiting (in production, use redis)
	const ip = req.ip;
	if (!rateLimitMiddleware.requests) {
		rateLimitMiddleware.requests = new Map();
	}

	const now = Date.now();
	const requests = rateLimitMiddleware.requests.get(ip) || [];
	const recentRequests = requests.filter((t: number) => now - t < 60000);

	if (recentRequests.length >= 10) {
		return res.status(429).json({ error: "Rate limit exceeded" });
	}

	recentRequests.push(now);
	rateLimitMiddleware.requests.set(ip, recentRequests);
	next();
};
rateLimitMiddleware.requests = new Map();

const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
	const start = Date.now();
	res.on("finish", () => {
		console.log(
			`[LOG] ${req.method} ${req.path} - ${res.statusCode} - ${Date.now() - start}ms`,
		);
	});
	next();
};

// Public Router - No authentication required
publicRouter.get("/status", (req: Request, res: Response) => {
	res.json({ status: "operational", timestamp: new Date().toISOString() });
});

publicRouter.get("/products", (req: Request, res: Response) => {
	res.json([
		{ id: 1, name: "Product A", price: 99.99 },
		{ id: 2, name: "Product B", price: 149.99 },
	]);
});

publicRouter.get("/products/:id", (req: Request, res: Response) => {
	const id = Number.parseInt(req.params.id);
	res.json({ id, name: `Product ${id}`, price: 99.99 });
});

// Admin Router - Requires authentication
adminRouter.use(authMiddleware);

adminRouter.get("/users", (req: Request, res: Response) => {
	res.json([
		{ id: 1, username: "admin", role: "admin" },
		{ id: 2, username: "user1", role: "user" },
	]);
});

adminRouter.post("/users", (req: Request, res: Response) => {
	const { username, role } = req.body;
	res.status(201).json({ id: Date.now(), username, role });
});

adminRouter.delete("/users/:id", (req: Request, res: Response) => {
	res.json({ message: `User ${req.params.id} deleted` });
});

adminRouter.get("/analytics", (req: Request, res: Response) => {
	res.json({
		totalUsers: 100,
		activeUsers: 75,
		revenue: 50000,
		timestamp: new Date().toISOString(),
	});
});

// API v1 Router - Legacy API
apiV1Router.use(loggingMiddleware);
apiV1Router.use(rateLimitMiddleware);

apiV1Router.get("/data", (req: Request, res: Response) => {
	res.json({ version: "1.0", data: ["item1", "item2"], deprecated: true });
});

apiV1Router.post("/data", (req: Request, res: Response) => {
	res.status(201).json({ version: "1.0", id: Date.now(), deprecated: true });
});

// API v2 Router - Current API
apiV2Router.use(loggingMiddleware);

apiV2Router.get("/data", (req: Request, res: Response) => {
	const { page = 1, limit = 10 } = req.query;
	res.json({
		version: "2.0",
		data: Array.from({ length: Number(limit) }, (_, i) => ({
			id: (Number(page) - 1) * Number(limit) + i + 1,
			value: `Item ${i + 1}`,
		})),
		pagination: { page: Number(page), limit: Number(limit) },
	});
});

apiV2Router.post("/data", (req: Request, res: Response) => {
	const { value } = req.body;
	res.status(201).json({
		version: "2.0",
		id: Date.now(),
		value,
		created: new Date().toISOString(),
	});
});

apiV2Router.get("/stream", (req: Request, res: Response) => {
	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache");

	let counter = 0;
	const interval = setInterval(() => {
		res.write(
			`data: ${JSON.stringify({ version: "2.0", count: ++counter })}\n\n`,
		);
		if (counter >= 5) {
			clearInterval(interval);
			res.end();
		}
	}, 1000);

	req.on("close", () => {
		clearInterval(interval);
	});
});

// Mount routers to main app
app.use("/public", publicRouter);
app.use("/admin", adminRouter);
app.use("/api/v1", apiV1Router);
app.use("/api/v2", apiV2Router);

// Create separate MCP instances for each router
const publicMcp = new ExpressMCP(app, {
	mountPath: "/mcp/public",
	include: (route) => route.path.startsWith("/public"),
	logging: {
		info: (...args) => console.log("[Public MCP]", ...args),
		error: (...args) => console.error("[Public MCP ERROR]", ...args),
	},
});

const adminMcp = new ExpressMCP(app, {
	mountPath: "/mcp/admin",
	include: (route) => route.path.startsWith("/admin"),
	logging: {
		info: (...args) => console.log("[Admin MCP]", ...args),
		error: (...args) => console.error("[Admin MCP ERROR]", ...args),
	},
});

const apiV1Mcp = new ExpressMCP(app, {
	mountPath: "/mcp/api/v1",
	include: (route) => route.path.startsWith("/api/v1"),
	logging: {
		info: (...args) => console.log("[API v1 MCP]", ...args),
		error: (...args) => console.error("[API v1 MCP ERROR]", ...args),
	},
});

const apiV2Mcp = new ExpressMCP(app, {
	mountPath: "/mcp/api/v2",
	include: (route) => route.path.startsWith("/api/v2"),
	logging: {
		info: (...args) => console.log("[API v2 MCP]", ...args),
		error: (...args) => console.error("[API v2 MCP ERROR]", ...args),
	},
});

// Unified MCP router that combines all
const unifiedMcp = new ExpressMCP(app, {
	mountPath: "/mcp/all",
	logging: {
		info: (...args) => console.log("[Unified MCP]", ...args),
		error: (...args) => console.error("[Unified MCP ERROR]", ...args),
	},
});

// Custom MCP endpoint with additional metadata
app.get("/mcp/custom/tools", async (req: Request, res: Response) => {
	const allTools = [];

	// Gather tools from all MCP instances
	const instances = [
		{ name: "public", mcp: publicMcp, auth: false },
		{ name: "admin", mcp: adminMcp, auth: true },
		{ name: "api_v1", mcp: apiV1Mcp, auth: false, deprecated: true },
		{ name: "api_v2", mcp: apiV2Mcp, auth: false },
	];

	for (const instance of instances) {
		const tools = instance.mcp.listTools();
		allTools.push(
			...tools.map((tool: any) => ({
				...tool,
				category: instance.name,
				requiresAuth: instance.auth,
				deprecated: instance.deprecated || false,
			})),
		);
	}

	res.json({
		tools: allTools,
		categories: instances.map((i) => ({
			name: i.name,
			count: i.mcp.listTools().length,
			requiresAuth: i.auth,
			deprecated: i.deprecated || false,
		})),
		total: allTools.length,
	});
});

// Custom invocation with routing logic
app.post("/mcp/custom/invoke", async (req: Request, res: Response) => {
	const { toolName, args, category } = req.body;

	// Route to appropriate MCP instance based on category
	let targetMcp: ExpressMCP;
	switch (category) {
		case "public":
			targetMcp = publicMcp;
			break;
		case "admin": {
			// Check auth for admin tools
			const token = req.headers.authorization?.replace("Bearer ", "");
			if (token !== "admin-token") {
				return res.status(401).json({ error: "Admin authentication required" });
			}
			targetMcp = adminMcp;
			break;
		}
		case "api_v1":
			targetMcp = apiV1Mcp;
			break;
		case "api_v2":
			targetMcp = apiV2Mcp;
			break;
		default:
			targetMcp = unifiedMcp;
	}

	// Forward to appropriate MCP instance
	// Note: In real implementation, you'd call the dispatcher directly
	res.json({
		message: `Would invoke ${toolName} via ${category || "unified"} MCP`,
		args,
	});
});

async function start() {
	// Initialize all MCP instances
	await publicMcp.init();
	await adminMcp.init();
	await apiV1Mcp.init();
	await apiV2Mcp.init();
	await unifiedMcp.init();

	// Mount all MCP instances
	publicMcp.mount();
	adminMcp.mount();
	apiV1Mcp.mount();
	apiV2Mcp.mount();
	unifiedMcp.mount();

	const PORT = process.env.PORT || 3006;
	app.listen(PORT, () => {
		console.log(`✅ Express server running on http://localhost:${PORT}`);

		console.log("\n🔀 Custom MCP Routers:");
		console.log(`   Public MCP: http://localhost:${PORT}/mcp/public/tools`);
		console.log(
			`   Admin MCP:  http://localhost:${PORT}/mcp/admin/tools (auth required)`,
		);
		console.log(
			`   API v1 MCP: http://localhost:${PORT}/mcp/api/v1/tools (deprecated)`,
		);
		console.log(`   API v2 MCP: http://localhost:${PORT}/mcp/api/v2/tools`);
		console.log(`   Unified:    http://localhost:${PORT}/mcp/all/tools`);
		console.log(`   Custom:     http://localhost:${PORT}/mcp/custom/tools`);

		console.log("\n📊 Router Statistics:");
		console.log(`   Public routes:  ${publicMcp.listTools().length} tools`);
		console.log(
			`   Admin routes:   ${adminMcp.listTools().length} tools (protected)`,
		);
		console.log(
			`   API v1 routes:  ${apiV1Mcp.listTools().length} tools (legacy)`,
		);
		console.log(`   API v2 routes:  ${apiV2Mcp.listTools().length} tools`);
		console.log(`   Total unified:  ${unifiedMcp.listTools().length} tools`);

		console.log("\n📝 Test Commands:");
		console.log("\n1. Public tools (no auth):");
		console.log(`   curl http://localhost:${PORT}/mcp/public/tools`);

		console.log("\n2. Admin tools (requires auth):");
		console.log(`   curl http://localhost:${PORT}/mcp/admin/tools \\`);
		console.log(`     -H "Authorization: Bearer admin-token"`);

		console.log("\n3. Custom aggregated view:");
		console.log(`   curl http://localhost:${PORT}/mcp/custom/tools`);

		console.log("\n4. Invoke with category routing:");
		console.log(
			`   curl -X POST http://localhost:${PORT}/mcp/custom/invoke \\`,
		);
		console.log(`     -H "Content-Type: application/json" \\`);
		console.log(
			`     -d '{"toolName": "GET_/public/products", "category": "public", "args": {}}'`,
		);
	});
}

start().catch(console.error);
