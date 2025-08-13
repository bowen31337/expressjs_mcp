#!/usr/bin/env node

/**
 * Express MCP CLI
 * 
 * Native MCP server implementation using the official SDK.
 * This connects to an Express MCP server and exposes its tools as MCP tools.
 * 
 * Usage:
 *   expressjs-mcp [options]
 * 
 * Options:
 *   --url <url>    Express MCP URL (default: http://localhost:3000/mcp)
 *   --debug        Enable debug logging
 *   --help         Show help
 * 
 * Environment Variables:
 *   EXPRESS_MCP_URL - URL of Express MCP server
 *   DEBUG - Enable debug mode
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ErrorCode,
	ListToolsRequestSchema,
	McpError,
} from "@modelcontextprotocol/sdk/types.js";

interface ExpressMCPServerOptions {
	baseUrl?: string;
	debug?: boolean;
}

class ExpressMCPServer {
	private server: Server;
	private baseUrl: string;
	private debug: boolean;
	private tools: any[] = [];

	constructor(options: ExpressMCPServerOptions = {}) {
		this.baseUrl = options.baseUrl || "http://localhost:3000/mcp";
		this.debug = options.debug || false;

		this.server = new Server(
			{
				name: "expressjs-mcp",
				version: "1.0.0",
			},
			{
				capabilities: {
					tools: {},
					resources: {},
				},
			},
		);

		this.setupHandlers();
		this.log("Express MCP Server initialized");
	}

	private log(...args: any[]) {
		if (this.debug) {
			console.error("[Express MCP]", ...args);
		}
	}

	private async loadTools(): Promise<any[]> {
		try {
			const response = await fetch(`${this.baseUrl}/tools`);
			const data = await response.json();
			this.tools = data.tools || [];
			this.log(`Loaded ${this.tools.length} tools from ${this.baseUrl}`);
			return this.tools;
		} catch (error) {
			this.log("Failed to load tools:", error);
			this.tools = [];
			return [];
		}
	}

	private async invokeTool(toolName: string, args: any): Promise<any> {
		this.log(`Invoking tool: ${toolName}`, args);

		try {
			const response = await fetch(`${this.baseUrl}/invoke`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					toolName,
					args: args || {},
				}),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`HTTP ${response.status}: ${errorText}`);
			}

			const result = await response.json();
			return result;
		} catch (error) {
			this.log("Tool invocation error:", error);
			throw new McpError(
				ErrorCode.InternalError,
				`Tool execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	private setupHandlers() {
		// Handle tool listing
		this.server.setRequestHandler(ListToolsRequestSchema, async () => {
			await this.loadTools();

			return {
				tools: this.tools.map((tool) => ({
					name: tool.name || tool.title,
					description: tool.description || `Invoke ${tool.title}`,
					inputSchema: tool.inputSchema || {
						type: "object",
						properties: {},
						additionalProperties: true,
					},
				})),
			};
		});

		// Handle tool invocation
		this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
			const { name, arguments: args } = request.params;

			this.log(`Invoking tool: ${name}`, args);

			try {
				const result = await this.invokeTool(name, args || {});

				if (result.ok) {
					return {
						content: [
							{
								type: "text",
								text:
									typeof result.result === "string"
										? result.result
										: JSON.stringify(result.result, null, 2),
							},
						],
					};
				}

				throw new McpError(
					ErrorCode.InternalError,
					result.error || "Tool execution failed",
				);
			} catch (error: any) {
				this.log("Tool invocation error:", error);
				if (error instanceof McpError) {
					throw error;
				}
				throw new McpError(
					ErrorCode.InternalError,
					`Tool execution failed: ${error.message}`,
				);
			}
		});

		this.log("Request handlers configured");
	}

	async start() {
		const transport = new StdioServerTransport();
		await this.server.connect(transport);
		this.log("MCP Server connected via stdio");
		console.error("Express MCP Server ready");
		console.error(`Connected to: ${this.baseUrl}`);
	}
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: ExpressMCPServerOptions = {
	baseUrl: process.env.EXPRESS_MCP_URL || "http://localhost:3000/mcp",
	debug: process.env.DEBUG === "true",
};

for (let i = 0; i < args.length; i++) {
	switch (args[i]) {
		case "--url":
			options.baseUrl = args[++i];
			break;
		case "--debug":
			options.debug = true;
			break;
		case "--help":
		case "-h":
			console.log(`Express MCP Server

Usage:
  expressjs-mcp [options]

Options:
  --url <url>    Express MCP URL (default: http://localhost:3000/mcp)
  --debug        Enable debug logging
  --help         Show help

Environment Variables:
  EXPRESS_MCP_URL - URL of Express MCP server
  DEBUG - Enable debug mode

Examples:
  expressjs-mcp
  expressjs-mcp --url http://localhost:8080/mcp
  expressjs-mcp --debug
  EXPRESS_MCP_URL=http://api.example.com/mcp expressjs-mcp
`);
			process.exit(0);
			break;
		default:
			if (args[i].startsWith("-")) {
				console.error(`Unknown option: ${args[i]}`);
				console.error("Use --help for usage information");
				process.exit(1);
			}
	}
}

// Create and start server
const server = new ExpressMCPServer(options);

server.start().catch((error) => {
	console.error("Failed to start MCP server:", error);
	process.exit(1);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
	console.error("\nShutting down...");
	process.exit(0);
});

process.on("SIGTERM", () => {
	console.error("\nShutting down...");
	process.exit(0);
});