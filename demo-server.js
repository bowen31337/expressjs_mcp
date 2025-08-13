import express from "express";
import { ExpressMCP } from "./dist/index.js";

const app = express();
app.use(express.json());

// Sample users data
const users = [
	{
		id: 1,
		name: "Alice Johnson",
		email: "alice@company.com",
		role: "Senior Developer",
		department: "Engineering",
	},
	{
		id: 2,
		name: "Bob Smith",
		email: "bob@company.com",
		role: "UI/UX Designer",
		department: "Design",
	},
	{
		id: 3,
		name: "Carol Davis",
		email: "carol@company.com",
		role: "Product Manager",
		department: "Product",
	},
	{
		id: 4,
		name: "David Wilson",
		email: "david@company.com",
		role: "DevOps Engineer",
		department: "Engineering",
	},
	{
		id: 5,
		name: "Emma Brown",
		email: "emma@company.com",
		role: "Marketing Manager",
		department: "Marketing",
	},
];

// API endpoints
app.get("/api/users", (req, res) => {
	res.json(users);
});

// SSE endpoint - Real-time user activity stream (MUST be before parameterized route)
app.get("/api/users/stream", (req, res) => {
	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("Connection", "keep-alive");
	res.setHeader("Access-Control-Allow-Origin", "*");

	let eventId = 0;
	const interval = setInterval(() => {
		const randomUser = users[Math.floor(Math.random() * users.length)];
		const activities = [
			"logged in",
			"updated profile",
			"viewed dashboard",
			"completed task",
			"logged out",
		];
		const activity = activities[Math.floor(Math.random() * activities.length)];

		const data = {
			id: ++eventId,
			timestamp: new Date().toISOString(),
			user: randomUser.name,
			activity: activity,
			department: randomUser.department,
		};

		res.write(`id: ${eventId}\n`);
		res.write("event: user_activity\n");
		res.write(`data: ${JSON.stringify(data)}\n\n`);

		if (eventId >= 10) {
			clearInterval(interval);
			res.write("event: close\n");
			res.write("data: Stream ended\n\n");
			res.end();
		}
	}, 1000);

	// Clean up on client disconnect
	req.on("close", () => {
		clearInterval(interval);
	});
});

// Parameterized route AFTER specific routes
app.get("/api/users/:id", (req, res) => {
	const user = users.find((u) => u.id === Number.parseInt(req.params.id));
	if (!user) {
		return res.status(404).json({ error: "User not found" });
	}
	res.json(user);
});

// SSE endpoint - System metrics stream
app.get("/api/system/metrics", (req, res) => {
	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("Connection", "keep-alive");
	res.setHeader("Access-Control-Allow-Origin", "*");

	let metricId = 0;
	const interval = setInterval(() => {
		const metrics = {
			id: ++metricId,
			timestamp: new Date().toISOString(),
			cpu_usage: Math.random() * 100,
			memory_usage: Math.random() * 16,
			active_users: Math.floor(Math.random() * 50) + 10,
			requests_per_second: Math.floor(Math.random() * 200) + 50,
		};

		res.write(`id: ${metricId}\n`);
		res.write("event: metrics_update\n");
		res.write(`data: ${JSON.stringify(metrics)}\n\n`);

		if (metricId >= 15) {
			clearInterval(interval);
			res.write("event: close\n");
			res.write("data: Metrics stream ended\n\n");
			res.end();
		}
	}, 800);

	req.on("close", () => {
		clearInterval(interval);
	});
});

// MCP SSE endpoint for n8n integration (separate from message endpoint)
app.get("/mcp/sse", (req, res) => {
	console.log("🔌 MCP SSE connection established from:", req.ip);

	// Set SSE headers
	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("Connection", "keep-alive");
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

	// Send MCP initialization immediately
	res.write(
		`data: ${JSON.stringify({
			jsonrpc: "2.0",
			id: "initialize",
			result: {
				protocolVersion: "2024-11-05",
				capabilities: {
					tools: {},
					logging: {},
					prompts: {},
					resources: {},
				},
				serverInfo: {
					name: "express-mcp-demo",
					version: "1.0.0",
				},
			},
		})}\n\n`,
	);

	// Send tools list immediately after initialization
	res.write(
		`data: ${JSON.stringify({
			jsonrpc: "2.0",
			id: "tools/list",
			result: {
				tools: [
					{
						name: "get_users",
						description: "Get all users in the system",
						inputSchema: {
							type: "object",
							properties: {},
							additionalProperties: false,
						},
					},
					{
						name: "get_user_by_id",
						description: "Get a specific user by ID",
						inputSchema: {
							type: "object",
							properties: {
								id: {
									type: "string",
									description: "User ID to retrieve",
								},
							},
							required: ["id"],
							additionalProperties: false,
						},
					},
					{
						name: "get_user_activity_stream",
						description: "Get real-time user activity stream",
						inputSchema: {
							type: "object",
							properties: {},
							additionalProperties: false,
						},
					},
					{
						name: "get_system_metrics",
						description: "Get real-time system metrics stream",
						inputSchema: {
							type: "object",
							properties: {},
							additionalProperties: false,
						},
					},
				],
			},
		})}\n\n`,
	);

	// Keep connection alive with heartbeat
	const heartbeat = setInterval(() => {
		res.write(
			`data: ${JSON.stringify({
				jsonrpc: "2.0",
				method: "notifications/heartbeat",
				params: {
					timestamp: new Date().toISOString(),
					status: "connected",
				},
			})}\n\n`,
		);
	}, 30000);

	// Clean up on client disconnect
	req.on("close", () => {
		console.log("🔌 MCP SSE connection closed");
		clearInterval(heartbeat);
	});

	req.on("error", (err) => {
		console.log("🔌 MCP SSE connection error:", err);
		clearInterval(heartbeat);
	});
});

// MCP Message endpoint for n8n tool invocations (separate from SSE endpoint)
app.post("/mcp/message", express.json(), async (req, res) => {
	console.log("🔧 MCP tool invocation:", req.body);

	try {
		const { method, params } = req.body;

		if (method === "tools/call") {
			const { name, arguments: args = {} } = params;

			// Map n8n tool names to API endpoints
			const toolMapping = {
				get_users: { method: "GET", path: "/api/users" },
				get_user_by_id: { method: "GET", path: `/api/users/${args.id}` },
				get_user_activity_stream: { method: "GET", path: "/api/users/stream" },
				get_system_metrics: { method: "GET", path: "/api/system/metrics" },
			};

			const mapping = toolMapping[name];
			if (!mapping) {
				return res.status(400).json({
					jsonrpc: "2.0",
					id: req.body.id || null,
					error: {
						code: -32601,
						message: `Tool '${name}' not found`,
					},
				});
			}

			// Execute the corresponding API call
			let result;
			if (mapping.path === "/api/users") {
				result = users;
			} else if (mapping.path.startsWith("/api/users/")) {
				const userId = args.id;
				const user = users.find((u) => u.id === Number.parseInt(userId));
				if (!user) {
					return res.status(404).json({
						jsonrpc: "2.0",
						id: req.body.id || null,
						error: {
							code: -32602,
							message: `User with ID ${userId} not found`,
						},
					});
				}
				result = user;
			} else if (
				mapping.path === "/api/users/stream" ||
				mapping.path === "/api/system/metrics"
			) {
				// For streaming endpoints, return a sample response
				result = {
					message: `Streaming endpoint ${mapping.path} would start streaming data`,
					timestamp: new Date().toISOString(),
					streaming: true,
				};
			}

			return res.json({
				jsonrpc: "2.0",
				id: req.body.id || null,
				result: {
					content: [
						{
							type: "text",
							text:
								typeof result === "string"
									? result
									: JSON.stringify(result, null, 2),
						},
					],
				},
			});
		}

		// Handle other MCP methods
		res.status(400).json({
			jsonrpc: "2.0",
			id: req.body.id || null,
			error: {
				code: -32601,
				message: `Method '${method}' not found`,
			},
		});
	} catch (error) {
		console.error("MCP tool invocation error:", error);
		res.status(500).json({
			jsonrpc: "2.0",
			id: req.body.id || null,
			error: {
				code: -32603,
				message: "Internal server error",
			},
		});
	}
});

// MCP configuration endpoint - tells n8n about the SSE and Message endpoints
app.get("/mcp", (req, res) => {
	res.json({
		mcp: {
			description: "Express MCP Demo Server",
			version: "1.0.0",
			endpoints: {
				sse: "/mcp/sse",
				message: "/mcp/message",
			},
			transport: {
				type: "sse",
				sse_url: `http://${req.get("host")}/mcp/sse`,
				message_url: `http://${req.get("host")}/mcp/message`,
			},
			capabilities: ["tools"],
			tools_available: 4,
		},
	});
});

// Add MCP support
const mcp = new ExpressMCP(app, {
	mountPath: "/mcp",
	schemaAnnotations: {
		"GET /api/users": {
			description: "Get all users in the system",
			output: {
				type: "array",
				items: {
					type: "object",
					properties: {
						id: { type: "number" },
						name: { type: "string" },
						email: { type: "string" },
						role: { type: "string" },
						department: { type: "string" },
					},
				},
			},
		},
		"GET /api/users/:id": {
			description: "Get a specific user by ID",
			input: {
				type: "object",
				properties: {
					id: { type: "string", description: "User ID" },
				},
			},
		},
		"GET /api/users/stream": {
			description: "Get real-time user activity stream (Server-Sent Events)",
			output: {
				type: "string",
				description:
					"Real-time stream of user activities with timestamps and departments",
			},
		},
		"GET /api/system/metrics": {
			description: "Get real-time system metrics stream (Server-Sent Events)",
			output: {
				type: "string",
				description:
					"Real-time stream of system metrics including CPU, memory, and user activity",
			},
		},
	},
});

async function startServer() {
	await mcp.init();
	mcp.mount("/mcp");

	const port = 3000;
	const host = "0.0.0.0";
	app.listen(port, host, () => {
		console.log(`🚀 Demo Server running on http://0.0.0.0:${port}`);
		console.log(`📋 MCP tools: http://0.0.0.0:${port}/mcp/tools`);
		console.log("🌐 Accessible from external networks");
		console.log("✅ Ready for MCP queries!");
	});
}

startServer().catch(console.error);
