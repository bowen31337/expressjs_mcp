import express from "express";
import { ExpressMCP } from "../../src/index";

const app = express();
app.use(express.json());

// Regular API routes
app.get("/api/users", (req, res) => {
	res.json([
		{ id: 1, name: "John Doe", email: "john@example.com" },
		{ id: 2, name: "Jane Smith", email: "jane@example.com" },
	]);
});

app.post("/api/users", (req, res) => {
	const newUser = { id: Date.now(), ...req.body };
	res.status(201).json(newUser);
});

// Streaming routes
app.get("/api/stream", (req, res) => {
	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("Connection", "keep-alive");
	res.setHeader("Access-Control-Allow-Origin", "*");

	let count = 0;
	const interval = setInterval(() => {
		const data = {
			timestamp: new Date().toISOString(),
			count: ++count,
			message: `Event ${count}`,
		};
		res.write(`data: ${JSON.stringify(data)}\n\n`);

		if (count >= 10) {
			clearInterval(interval);
			res.write("data: [DONE]\n\n");
			res.end();
		}
	}, 1000);

	// Clean up on client disconnect
	req.on("close", () => {
		clearInterval(interval);
	});
});

app.get("/api/logs", (req, res) => {
	res.setHeader("Content-Type", "text/plain");
	res.setHeader("Transfer-Encoding", "chunked");

	const logLevels = ["INFO", "WARN", "ERROR", "DEBUG"];
	const messages = [
		"Server started successfully",
		"Database connection established",
		"User authentication successful",
		"Cache miss - fetching from database",
		"Request processed in 45ms",
		"Memory usage: 128MB",
		"Background job completed",
		"Health check passed",
		"Rate limit exceeded",
		"Session expired",
	];

	let index = 0;
	const interval = setInterval(() => {
		const timestamp = new Date().toISOString();
		const level = logLevels[Math.floor(Math.random() * logLevels.length)];
		const message = messages[Math.floor(Math.random() * messages.length)];

		const logEntry = `[${timestamp}] ${level}: ${message}\n`;
		res.write(logEntry);

		if (++index >= 15) {
			clearInterval(interval);
			res.end();
		}
	}, 500);

	req.on("close", () => {
		clearInterval(interval);
	});
});

// File download simulation
app.get("/api/download/:filename", (req, res) => {
	const { filename } = req.params;

	res.setHeader("Content-Type", "application/octet-stream");
	res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
	res.setHeader("Transfer-Encoding", "chunked");

	const fileContent = `This is the content of ${filename}\n`.repeat(100);
	const chunks = fileContent.match(/.{1,50}/g) || [];

	let chunkIndex = 0;
	const interval = setInterval(() => {
		if (chunkIndex < chunks.length) {
			res.write(chunks[chunkIndex]);
			chunkIndex++;
		} else {
			clearInterval(interval);
			res.end();
		}
	}, 100);

	req.on("close", () => {
		clearInterval(interval);
	});
});

// NDJSON streaming endpoint
app.get("/api/ndjson", (req, res) => {
	res.setHeader("Content-Type", "application/x-ndjson");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("Connection", "keep-alive");

	const data = [
		{ id: 1, name: "Alice", status: "active" },
		{ id: 2, name: "Bob", status: "inactive" },
		{ id: 3, name: "Charlie", status: "pending" },
		{ id: 4, name: "Diana", status: "active" },
		{ id: 5, name: "Eve", status: "suspended" },
	];

	let index = 0;
	const interval = setInterval(() => {
		if (index < data.length) {
			const record = { ...data[index], timestamp: new Date().toISOString() };
			res.write(`${JSON.stringify(record)}\n`);
			index++;
		} else {
			clearInterval(interval);
			res.end();
		}
	}, 800);

	req.on("close", () => {
		clearInterval(interval);
	});
});

// JSON Lines streaming endpoint
app.get("/api/jsonlines", (req, res) => {
	res.setHeader("Content-Type", "application/jsonlines");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("X-Streaming", "true");

	const events = [
		{ event: "user_login", userId: 123, timestamp: Date.now() },
		{
			event: "page_view",
			userId: 123,
			page: "/dashboard",
			timestamp: Date.now() + 1000,
		},
		{
			event: "button_click",
			userId: 123,
			button: "save",
			timestamp: Date.now() + 2000,
		},
		{ event: "user_logout", userId: 123, timestamp: Date.now() + 3000 },
	];

	let index = 0;
	const interval = setInterval(() => {
		if (index < events.length) {
			const event = { ...events[index], timestamp: Date.now() };
			res.write(`${JSON.stringify(event)}\n`);
			index++;
		} else {
			clearInterval(interval);
			res.end();
		}
	}, 1200);

	req.on("close", () => {
		clearInterval(interval);
	});
});

// Custom streaming endpoint with custom headers
app.get("/api/custom-stream", (req, res) => {
	res.setHeader("Content-Type", "text/plain");
	res.setHeader("X-Content-Stream", "true");
	res.setHeader("X-Stream-Type", "custom");
	res.setHeader("Cache-Control", "no-cache");

	const messages = [
		"🚀 Starting process...",
		"📊 Loading data...",
		"⚙️ Processing records...",
		"✅ Validation complete...",
		"💾 Saving results...",
		"🎉 Process finished!",
	];

	let index = 0;
	const interval = setInterval(() => {
		if (index < messages.length) {
			const timestamp = new Date().toISOString();
			res.write(`[${timestamp}] ${messages[index]}\n`);
			index++;
		} else {
			clearInterval(interval);
			res.end();
		}
	}, 1500);

	req.on("close", () => {
		clearInterval(interval);
	});
});

// Initialize Express MCP
const mcp = new ExpressMCP(app, {
	mountPath: "/mcp",
	schemaAnnotations: {
		"GET /api/users": {
			description: "Get all users",
			output: {
				type: "array",
				items: {
					type: "object",
					properties: {
						id: { type: "number" },
						name: { type: "string" },
						email: { type: "string" },
					},
				},
			},
		},
		"POST /api/users": {
			description: "Create a new user",
			input: {
				type: "object",
				properties: {
					name: { type: "string" },
					email: { type: "string" },
				},
				required: ["name", "email"],
			},
			output: {
				type: "object",
				properties: {
					id: { type: "number" },
					name: { type: "string" },
					email: { type: "string" },
				},
			},
		},
		"GET /api/stream": {
			description: "Get real-time streaming events (Server-Sent Events)",
			output: {
				type: "string",
				description: "Streaming response with event data",
			},
		},
		"GET /api/logs": {
			description: "Get real-time log stream",
			output: {
				type: "string",
				description: "Streaming log entries",
			},
		},
		"GET /api/download/:filename": {
			description: "Download a file with streaming response",
			input: {
				type: "object",
				properties: {
					filename: { type: "string" },
				},
				required: ["filename"],
			},
			output: {
				type: "string",
				description: "File content stream",
			},
		},
		"GET /api/ndjson": {
			description: "Get NDJSON (Newline Delimited JSON) streaming data",
			output: {
				type: "string",
				description: "NDJSON stream with user records",
			},
		},
		"GET /api/jsonlines": {
			description: "Get JSON Lines streaming events",
			output: {
				type: "string",
				description: "JSON Lines stream with user events",
			},
		},
		"GET /api/custom-stream": {
			description: "Get custom streaming messages with progress indicators",
			output: {
				type: "string",
				description: "Custom text stream with timestamped messages",
			},
		},
	},
});

async function startServer() {
	await mcp.init();
	mcp.mount("/mcp");

	const port = process.env.PORT || 3000;
	app.listen(port, () => {
		console.log(`🚀 Server running on http://localhost:${port}`);
		console.log(`📊 MCP tools: http://localhost:${port}/mcp/tools`);
		console.log("📡 Streaming endpoints:");
		console.log(`   - SSE: http://localhost:${port}/api/stream`);
		console.log(`   - Logs: http://localhost:${port}/api/logs`);
		console.log(`   - NDJSON: http://localhost:${port}/api/ndjson`);
		console.log(`   - JSON Lines: http://localhost:${port}/api/jsonlines`);
		console.log(`   - Custom: http://localhost:${port}/api/custom-stream`);
		console.log(
			`   - Download: http://localhost:${port}/api/download/test.txt`,
		);
		console.log("\n🧪 Test streaming with:");
		console.log("   # HTTP Streaming:");
		console.log(`   curl -X POST http://localhost:${port}/mcp/invoke \\`);
		console.log(`     -H "Content-Type: application/json" \\`);
		console.log(
			`     -d '{"toolName": "GET /api/stream", "args": {}, "streaming": true}'`,
		);
		console.log("\n   # stdio Streaming:");
		console.log(
			`   echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"GET /api/ndjson","arguments":{"_streaming":true}}}' | \\`,
		);
		console.log("     node scripts/mcp-bridge.cjs");
	});
}

startServer().catch(console.error);
