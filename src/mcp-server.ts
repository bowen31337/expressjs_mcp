/**
 * Native MCP Server Implementation
 *
 * This replaces the bridge scripts by directly implementing the MCP protocol
 * using the official @modelcontextprotocol/sdk package.
 */

import type { Application } from "express";
import type { ExpressMCP } from "./index";

interface MCPServerOptions {
	port?: number;
	url?: string;
	debug?: boolean;
	expressMcp?: ExpressMCP;
}

interface MCPTool {
	name: string;
	title: string;
	description: string;
	inputSchema?: unknown;
	outputSchema?: unknown;
}

interface MCPResponse {
	ok: boolean;
	result?: unknown;
	error?: string;
	status?: number;
}

class McpError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "McpError";
	}
}

export class MCPServer {
	private baseUrl: string;
	private debug: boolean;
	private tools: MCPTool[] = [];

	constructor(options: MCPServerOptions = {}) {
		this.baseUrl = options.url || "http://localhost:3000";
		this.debug = options.debug || false;
	}

	async start(): Promise<void> {
		this.tools = await this.loadTools();
		this.log("MCP Server started with", this.tools.length, "tools");
	}

	private log(...args: unknown[]) {
		if (this.debug) {
			console.error("[MCP Server]", ...args);
		}
	}

	private async loadTools(): Promise<MCPTool[]> {
		if (this.expressMcp) {
			// Load tools from local Express app
			return this.expressMcp.listTools() as MCPTool[];
		}
		// Load tools from remote Express app
		try {
			const response = await fetch(`${this.baseUrl}/mcp/tools`);
			const data = await response.json();
			return data.tools || [];
		} catch (error) {
			this.log("Failed to load tools:", error);
			return [];
		}
	}

	private async invokeTool(toolName: string, args: unknown): Promise<unknown> {
		if (this.expressMcp) {
			// Invoke tool directly through Express app
			const dispatcher = (
				this.expressMcp as {
					dispatcher: {
						dispatch: (
							method: string,
							path: string,
							args: unknown,
							headers: Record<string, string>,
						) => Promise<MCPResponse>;
					};
				}
			).dispatcher;
			const tool = this.tools.find(
				(t) => t.name === toolName || t.title === toolName,
			);

			if (!tool) {
				throw new McpError(`Tool '${toolName}' not found`);
			}

			// This is a simplified implementation - in practice, you'd need to map tool names to routes
			const result = await dispatcher.dispatch("POST", "/mcp/invoke", args, {
				"content-type": "application/json",
			});

			return result;
		}
		// Invoke tool through remote Express app
		return this.makeRequest("POST", "/mcp/invoke", {
			toolName,
			args,
		});
	}

	private async makeRequest(
		method: string,
		path: string,
		data?: unknown,
	): Promise<unknown> {
		const url = new URL(path, this.baseUrl);

		try {
			const response = await fetch(url.toString(), {
				method,
				headers: {
					"Content-Type": "application/json",
				},
				body: data ? JSON.stringify(data) : undefined,
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			return await response.json();
		} catch (error) {
			this.log("Request failed:", error);
			throw error;
		}
	}

	async handleRequest(request: {
		method: string;
		params: unknown;
	}): Promise<unknown> {
		try {
			switch (request.method) {
				case "tools/list":
					return {
						tools: this.tools.map((tool) => ({
							name: tool.name,
							description: tool.description,
							inputSchema: tool.inputSchema,
						})),
					};

				case "tools/call": {
					const { name, arguments: args } = request.params as {
						name: string;
						arguments: unknown;
					};
					const result = await this.invokeTool(name, args);
					return { content: [{ type: "text", text: JSON.stringify(result) }] };
				}

				default:
					throw new McpError(`Unknown method: ${request.method}`);
			}
		} catch (error) {
			this.log("Request handling error:", error);
			if (error instanceof McpError) {
				throw error;
			}
			throw new McpError(
				error instanceof Error ? error.message : "Unknown error",
			);
		}
	}
}
