/**
 * Example 09: Auth0 Authentication
 *
 * This example shows how to integrate Auth0 authentication with Express-MCP,
 * including JWT validation, user info retrieval, and permission checks.
 *
 * Note: This is a simulation of Auth0 integration. In production, use the
 * actual Auth0 SDK and configure with your Auth0 tenant.
 */

import crypto from "node:crypto";
import express, {
	type Request,
	type Response,
	type NextFunction,
} from "express";
import { ExpressMCP } from "../../src";

// JWT token interface
interface DecodedToken {
	sub: string;
	email: string;
	name: string;
	scope: string;
	permissions: string[];
	iat: number;
	exp: number;
}

// Extend Express Request to include user
interface AuthenticatedRequest extends Request {
	user?: DecodedToken;
}

// JWT verification middleware
const checkJwt = (req: Request, res: Response, next: NextFunction) => {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return res.status(401).json({
			error: "Unauthorized",
			message: "Bearer token required",
		});
	}

	const token = authHeader.substring(7);

	try {
		// Simple JWT verification (in real app, use proper JWT library)
		// This is a mock implementation for demo purposes
		const decoded = JSON.parse(
			Buffer.from(token.split(".")[1], "base64").toString(),
		) as DecodedToken;

		// Check if token is expired
		if (decoded.exp * 1000 < Date.now()) {
			return res.status(401).json({
				error: "Unauthorized",
				message: "Token expired",
			});
		}

		// Attach user info to request
		(req as AuthenticatedRequest).user = decoded;
		next();
	} catch (error) {
		return res.status(401).json({
			error: "Unauthorized",
			message: "Invalid token",
		});
	}
};

// Permission-based authorization middleware
const checkPermission = (permission: string) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const user = (req as AuthenticatedRequest).user;

		if (!user) {
			return res.status(401).json({
				error: "Unauthorized",
				message: "Authentication required",
			});
		}

		if (!user.permissions.includes(permission)) {
			return res.status(403).json({
				error: "Forbidden",
				message: `Permission '${permission}' required`,
			});
		}

		next();
	};
};

// Scope-based authorization middleware
const checkScope = (requiredScope: string) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const user = (req as AuthenticatedRequest).user;

		if (!user || !user.scope) {
			return res.status(401).json({
				error: "Unauthorized",
				message: "Authentication required",
			});
		}

		const userScopes = user.scope.split(" ");
		if (!userScopes.includes(requiredScope)) {
			return res.status(403).json({
				error: "Forbidden",
				message: `Scope '${requiredScope}' required`,
			});
		}

		next();
	};
};

const app = express();
app.use(express.json());

// Public endpoints (no auth required)
app.get("/", (_req: Request, res: Response) => {
	res.json({
		message: "Auth0-protected API",
		version: "1.0.0",
		endpoints: {
			public: ["GET /", "GET /health"],
			protected: [
				"GET /api/profile",
				"PUT /api/profile",
				"GET /api/email",
				"GET /api/admin/users",
			],
		},
	});
});

app.get("/health", (_req: Request, res: Response) => {
	res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Protected endpoints - require valid JWT
app.get("/api/profile", checkJwt, (req: Request, res: Response) => {
	const user = (req as AuthenticatedRequest).user as DecodedToken;
	res.json({
		profile: {
			id: user.sub,
			email: user.email,
			name: user.name,
			permissions: user.permissions,
			scopes: user.scope.split(" "),
		},
	});
});

app.put(
	"/api/profile",
	checkJwt,
	checkPermission("write:profile"),
	(req: Request, res: Response) => {
		const user = (req as AuthenticatedRequest).user as DecodedToken;
		const { name, email } = req.body;

		// In a real app, you would update the user profile in the database
		res.json({
			message: "Profile updated successfully",
			profile: {
				id: user.sub,
				email: email || user.email,
				name: name || user.name,
				updatedAt: new Date().toISOString(),
			},
		});
	},
);

app.get(
	"/api/email",
	checkJwt,
	checkScope("email"),
	(req: Request, res: Response) => {
		const user = (req as AuthenticatedRequest).user as DecodedToken;
		res.json({
			email: user.email,
			verified: true, // Mock verification status
		});
	},
);

app.get(
	"/api/admin/users",
	checkJwt,
	checkPermission("read:users"),
	(_req: Request, res: Response) => {
		// Mock user list (in real app, fetch from database)
		res.json({
			users: [
				{
					id: "user1",
					email: "user1@example.com",
					name: "User One",
					permissions: ["read:profile", "write:profile"],
				},
				{
					id: "user2",
					email: "user2@example.com",
					name: "User Two",
					permissions: ["read:profile"],
				},
			],
		});
	},
);

// Initialize ExpressMCP
const mcp = new ExpressMCP(app, {
	mountPath: "/mcp",
	// Exclude admin routes from MCP tools for security
	exclude: (route) => {
		return route.path.startsWith("/api/admin/");
	},
});

await mcp.init();
mcp.mount("/mcp");

const PORT = 3009;
app.listen(PORT, () => {
	console.log(`🔐 Auth0-protected API running on http://localhost:${PORT}`);
	console.log(`📡 MCP tools available at http://localhost:${PORT}/mcp/tools`);
	console.log(`🚀 MCP invoke endpoint at http://localhost:${PORT}/mcp/invoke`);

	// Demo: Show available tools
	setTimeout(() => {
		const tools = mcp.listTools();
		console.log(`\n🔧 Available MCP tools: ${tools.length}`);
		for (const tool of tools) {
			const toolObj = tool as { title: string; description: string };
			console.log(`   - ${toolObj.title}: ${toolObj.description}`);
		}
	});
});

// Helper function to find a specific tool
function findTool(toolName: string) {
	const tools = mcp.listTools();
	return tools.find((t) => {
		const toolObj = t as { name: string; title: string };
		return toolObj.name === toolName || toolObj.title === toolName;
	});
}
