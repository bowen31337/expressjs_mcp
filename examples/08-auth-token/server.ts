/**
 * Example 08: Auth Token Passthrough
 *
 * This example shows how to pass authentication tokens through MCP
 * to the underlying Express routes, maintaining security across the MCP layer.
 */

import crypto from "node:crypto";
import express, {
	type Request,
	type Response,
	type NextFunction,
} from "express";
import { ExpressMCP } from "../../src/index";

// Create Express app
const app = express();
app.use(express.json());

// Simple in-memory user store
const users = new Map([
	["user-token-123", { id: 1, username: "alice", role: "user" }],
	["admin-token-456", { id: 2, username: "bob", role: "admin" }],
	["api-key-789", { id: 3, username: "service", role: "service" }],
]);

// Session store for JWT-like tokens
const sessions = new Map<string, any>();

// Authentication middleware
const authenticate = (req: Request, res: Response, next: NextFunction) => {
	const authHeader = req.headers.authorization;

	if (!authHeader) {
		return res.status(401).json({ error: "No authorization header" });
	}

	// Support multiple auth schemes
	if (authHeader.startsWith("Bearer ")) {
		const token = authHeader.substring(7);
		const user = users.get(token) || sessions.get(token);

		if (!user) {
			return res.status(401).json({ error: "Invalid token" });
		}

		(req as any).user = user;
		next();
	} else if (authHeader.startsWith("ApiKey ")) {
		const apiKey = authHeader.substring(7);
		const user = users.get(apiKey);

		if (!user) {
			return res.status(401).json({ error: "Invalid API key" });
		}

		(req as any).user = user;
		next();
	} else {
		res.status(401).json({ error: "Unsupported auth scheme" });
	}
};

// Role-based access control middleware
const requireRole = (role: string) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const user = (req as any).user;

		if (!user) {
			return res.status(401).json({ error: "Not authenticated" });
		}

		if (user.role !== role && user.role !== "admin") {
			return res.status(403).json({ error: `Requires ${role} role` });
		}

		next();
	};
};

// Public endpoints (no auth required)
app.get("/public/info", (req: Request, res: Response) => {
	res.json({
		message: "Public information",
		timestamp: new Date().toISOString(),
	});
});

app.post("/auth/login", (req: Request, res: Response) => {
	const { username, password } = req.body;

	// Simple auth check (in production, hash passwords)
	if (username === "alice" && password === "password123") {
		const token = `session-${crypto.randomBytes(16).toString("hex")}`;
		const user = { id: 1, username: "alice", role: "user" };
		sessions.set(token, user);

		res.json({
			token,
			user,
			expiresIn: 3600,
		});
	} else if (username === "bob" && password === "admin123") {
		const token = `session-${crypto.randomBytes(16).toString("hex")}`;
		const user = { id: 2, username: "bob", role: "admin" };
		sessions.set(token, user);

		res.json({
			token,
			user,
			expiresIn: 3600,
		});
	} else {
		res.status(401).json({ error: "Invalid credentials" });
	}
});

// Protected endpoints (auth required)
app.get("/user/profile", authenticate, (req: Request, res: Response) => {
	const user = (req as any).user;
	res.json({
		profile: {
			id: user.id,
			username: user.username,
			role: user.role,
		},
		timestamp: new Date().toISOString(),
	});
});

app.get("/user/data", authenticate, (req: Request, res: Response) => {
	const user = (req as any).user;
	res.json({
		data: `Private data for user ${user.username}`,
		userId: user.id,
	});
});

app.put("/user/settings", authenticate, (req: Request, res: Response) => {
	const user = (req as any).user;
	const { settings } = req.body;

	res.json({
		message: "Settings updated",
		userId: user.id,
		settings,
	});
});

// Admin endpoints (admin role required)
app.get(
	"/admin/users",
	authenticate,
	requireRole("admin"),
	(req: Request, res: Response) => {
		res.json({
			users: Array.from(users.entries()).map(([token, user]) => ({
				...user,
				token: `${token.substring(0, 10)}...`,
			})),
			sessions: sessions.size,
		});
	},
);

app.delete(
	"/admin/sessions",
	authenticate,
	requireRole("admin"),
	(req: Request, res: Response) => {
		const count = sessions.size;
		sessions.clear();
		res.json({
			message: `Cleared ${count} sessions`,
		});
	},
);

app.post(
	"/admin/grant",
	authenticate,
	requireRole("admin"),
	(req: Request, res: Response) => {
		const { userId, role } = req.body;
		res.json({
			message: `Granted ${role} role to user ${userId}`,
			timestamp: new Date().toISOString(),
		});
	},
);

// Service endpoints (service role required)
app.get(
	"/service/metrics",
	authenticate,
	requireRole("service"),
	(req: Request, res: Response) => {
		res.json({
			metrics: {
				requests: 1000,
				errors: 5,
				latency: 45,
			},
			timestamp: new Date().toISOString(),
		});
	},
);

// Create ExpressMCP with auth passthrough configuration
const mcp = new ExpressMCP(app, {
	mountPath: "/mcp",
	logging: {
		info: (...args) => console.log("[MCP]", ...args),
		error: (...args) => console.error("[MCP ERROR]", ...args),
	},
});

// Override the MCP invoke endpoint to pass through auth headers
app.post("/mcp/invoke", async (req: Request, res: Response) => {
	const { toolName, args } = req.body;

	// Extract auth header from the MCP request
	const authHeader = req.headers.authorization;

	// Find the route
	const tools = mcp.listTools();
	const tool = tools.find(
		(t: any) => t.name === toolName || t.title === toolName,
	);

	if (!tool) {
		return res.status(404).json({ error: "Tool not found" });
	}

	// Create headers object with auth passthrough
	const headers: Record<string, string> = {
		"content-type": "application/json",
	};

	if (authHeader) {
		headers.authorization = authHeader;
	}

	try {
		// Use the dispatcher with auth headers
		const dispatcher = (mcp as any).dispatcher;
		const route = (tool as any).route;

		const result = await dispatcher.dispatch(
			route.method,
			route.path,
			args,
			headers, // Pass auth headers
			{ timeout: 30000 },
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

// Test endpoint to verify auth passthrough
app.get("/test/auth-info", authenticate, (req: Request, res: Response) => {
	const user = (req as any).user;
	const authHeader = req.headers.authorization;

	res.json({
		message: "Auth passthrough successful",
		user,
		authScheme: authHeader?.split(" ")[0],
		tokenPreview: `${authHeader?.substring(0, 20)}...`,
	});
});

async function start() {
	await mcp.init();
	mcp.mount("/mcp-base"); // Mount at different path since we override /mcp/invoke

	const PORT = process.env.PORT || 3008;
	app.listen(PORT, () => {
		console.log(`✅ Express server running on http://localhost:${PORT}`);
		console.log(`📡 MCP tools available at http://localhost:${PORT}/mcp/tools`);

		console.log("\n🔐 Authentication Examples:");
		console.log("\n1. Login to get session token:");
		console.log(`   curl -X POST http://localhost:${PORT}/auth/login \\`);
		console.log(`     -H "Content-Type: application/json" \\`);
		console.log(`     -d '{"username": "alice", "password": "password123"}'`);

		console.log("\n2. Use Bearer token for protected endpoint:");
		console.log(`   curl http://localhost:${PORT}/user/profile \\`);
		console.log(`     -H "Authorization: Bearer user-token-123"`);

		console.log("\n3. Invoke MCP tool with auth passthrough:");
		console.log(`   curl -X POST http://localhost:${PORT}/mcp/invoke \\`);
		console.log(`     -H "Content-Type: application/json" \\`);
		console.log(`     -H "Authorization: Bearer user-token-123" \\`);
		console.log(`     -d '{"toolName": "GET_/user/profile", "args": {}}'`);

		console.log("\n4. Admin endpoint with admin token:");
		console.log(`   curl -X POST http://localhost:${PORT}/mcp/invoke \\`);
		console.log(`     -H "Content-Type: application/json" \\`);
		console.log(`     -H "Authorization: Bearer admin-token-456" \\`);
		console.log(`     -d '{"toolName": "GET_/admin/users", "args": {}}'`);

		console.log("\n5. API key authentication:");
		console.log(`   curl -X POST http://localhost:${PORT}/mcp/invoke \\`);
		console.log(`     -H "Content-Type: application/json" \\`);
		console.log(`     -H "Authorization: ApiKey api-key-789" \\`);
		console.log(`     -d '{"toolName": "GET_/service/metrics", "args": {}}'`);

		console.log("\n📌 Available Tokens:");
		console.log("   User:    Bearer user-token-123");
		console.log("   Admin:   Bearer admin-token-456");
		console.log("   Service: ApiKey api-key-789");
		console.log("   Session: Login to get dynamic token");
	});
}

start().catch(console.error);
