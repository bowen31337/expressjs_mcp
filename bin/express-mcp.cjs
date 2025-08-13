#!/usr/bin/env node

const { program } = require("commander");
const path = require("node:path");
const { spawn } = require("node:child_process");
const fs = require("node:fs");

program
	.name("expressjs-mcp")
	.description("Express MCP CLI tools")
	.version("1.0.0");

program
	.command("bridge")
	.description("Start MCP bridge for stdio communication")
	.option("-u, --url <url>", "Express MCP URL", "http://localhost:3000/mcp")
	.option("-d, --debug", "Enable debug logging")
	.option("-t, --timeout <ms>", "Request timeout in milliseconds", "30000")
	.action((options) => {
		const env = {
			...process.env,
			EXPRESS_MCP_URL: options.url,
			DEBUG: options.debug ? "true" : "false",
			TIMEOUT: options.timeout,
		};

		const bridgePath = path.join(__dirname, "..", "scripts", "mcp-bridge.cjs");
		const child = spawn("node", [bridgePath], {
			env,
			stdio: "inherit",
		});

		child.on("exit", (code) => process.exit(code || 0));

		// Handle graceful shutdown
		process.on("SIGINT", () => {
			child.kill("SIGINT");
		});

		process.on("SIGTERM", () => {
			child.kill("SIGTERM");
		});
	});

program
	.command("init")
	.description("Initialize expressjs-mcp in current project")
	.option("--typescript", "Generate TypeScript configuration")
	.action((options) => {
		console.log("🚀 Initializing expressjs-mcp in current project...");

		const isTypeScript = options.typescript || fs.existsSync("tsconfig.json");
		const ext = isTypeScript ? "ts" : "js";

		// Create example server file
		const serverContent = isTypeScript
			? `
import express from 'express';
import { ExpressMCP } from 'expressjs-mcp';

const app = express();
app.use(express.json());

// Your API routes
app.get('/api/users', (req, res) => {
  res.json([{ id: 1, name: 'John Doe' }]);
});

app.post('/api/users', (req, res) => {
  res.status(201).json({ id: 2, ...req.body });
});

// Add MCP support
const mcp = new ExpressMCP(app, { 
  mountPath: '/mcp',
  schemaAnnotations: {
    'GET /api/users': {
      description: 'Get all users',
      output: { type: 'array', items: { type: 'object' } }
    }
  }
});

await mcp.init();
mcp.mount('/mcp');

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(\`Server running on http://localhost:\${port}\`);
  console.log(\`MCP tools: http://localhost:\${port}/mcp/tools\`);
});
`
			: `
const express = require('express');
const { ExpressMCP } = require('expressjs-mcp');

const app = express();
app.use(express.json());

// Your API routes
app.get('/api/users', (req, res) => {
  res.json([{ id: 1, name: 'John Doe' }]);
});

app.post('/api/users', (req, res) => {
  res.status(201).json({ id: 2, ...req.body });
});

// Add MCP support
async function setupMCP() {
  const mcp = new ExpressMCP(app, { 
    mountPath: '/mcp',
    schemaAnnotations: {
      'GET /api/users': {
        description: 'Get all users',
        output: { type: 'array', items: { type: 'object' } }
      }
    }
  });

  await mcp.init();
  mcp.mount('/mcp');

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(\`Server running on http://localhost:\${port}\`);
    console.log(\`MCP tools: http://localhost:\${port}/mcp/tools\`);
  });
}

setupMCP().catch(console.error);
`;

		// Write server file
		fs.writeFileSync(`server.${ext}`, serverContent.trim());
		console.log(`✅ Created server.${ext}`);

		// Create MCP client config example
		const mcpConfig = {
			mcpServers: {
				"express-api": {
					command: "npx",
					args: ["expressjs-mcp", "bridge"],
					env: {
						EXPRESS_MCP_URL: "http://localhost:3000/mcp",
					},
				},
			},
		};

		fs.writeFileSync("mcp-config.json", JSON.stringify(mcpConfig, null, 2));
		console.log("✅ Created mcp-config.json");

		console.log("\n📋 Next steps:");
		console.log(`1. Start your server: node server.${ext}`);
		console.log("2. Add mcp-config.json to your MCP client");
		console.log("3. Test: curl http://localhost:3000/mcp/tools");
		console.log("\n🎉 Express MCP setup complete!");
	});

program
	.command("test")
	.description("Test MCP connection")
	.option("-u, --url <url>", "Express MCP URL", "http://localhost:3000/mcp")
	.action(async (options) => {
		console.log(`🧪 Testing MCP connection to ${options.url}...`);

		try {
			const http = require("node:http");
			// Extract base URL and construct proper path
			const baseUrl = options.url.replace(/\/mcp$/, "");
			const url = new URL("/mcp/tools", baseUrl);

			const response = await new Promise((resolve, reject) => {
				const req = http.get(url, resolve);
				req.on("error", reject);
				req.setTimeout(5000, () => {
					req.destroy();
					reject(new Error("Request timeout"));
				});
			});

			let body = "";
			response.on("data", (chunk) => {
				body += chunk;
			});
			response.on("end", () => {
				try {
					const data = JSON.parse(body);
					console.log("✅ Connection successful!");
					console.log(`📊 Found ${data.tools?.length || 0} tools:`);
					data.tools?.forEach((tool, i) => {
						console.log(`  ${i + 1}. ${tool.title || tool.name}`);
					});
				} catch (e) {
					console.log("⚠️  Connected but invalid JSON response");
					console.log("Response:", body.substring(0, 200));
				}
			});
		} catch (error) {
			console.log("❌ Connection failed:", error.message);
			console.log(
				"\n💡 Make sure your Express server is running with MCP enabled",
			);
		}
	});

program.parse();
