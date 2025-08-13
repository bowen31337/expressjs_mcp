/**
 * Native MCP Server Implementation
 * 
 * This replaces the bridge scripts by directly implementing the MCP protocol
 * using the official @modelcontextprotocol/sdk package.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { ExpressMCP } from "./index";
import type { Application } from "express";

export interface MCPServerOptions {
  name?: string;
  version?: string;
  expressApp?: Application;
  baseUrl?: string;
  debug?: boolean;
}

export class ExpressMCPServer {
  private server: Server;
  private expressMcp?: ExpressMCP;
  private baseUrl: string;
  private debug: boolean;
  private tools: any[] = [];

  constructor(options: MCPServerOptions = {}) {
    this.baseUrl = options.baseUrl || process.env.EXPRESS_MCP_URL || "http://localhost:3000/mcp";
    this.debug = options.debug || process.env.DEBUG === "true";
    
    this.server = new Server(
      {
        name: options.name || "expressjs-mcp",
        version: options.version || "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    if (options.expressApp) {
      this.expressMcp = new ExpressMCP(options.expressApp);
    }

    this.setupHandlers();
    this.log("MCP Server initialized");
  }

  private log(...args: any[]) {
    if (this.debug) {
      console.error("[MCP Server]", ...args);
    }
  }

  private async loadTools(): Promise<any[]> {
    if (this.expressMcp) {
      // Load tools from local Express app
      await this.expressMcp.init();
      this.tools = this.expressMcp.listTools();
      this.log(`Loaded ${this.tools.length} tools from Express app`);
    } else {
      // Load tools from remote HTTP endpoint
      try {
        const response = await this.httpRequest("GET", "/tools");
        this.tools = response.tools || [];
        this.log(`Loaded ${this.tools.length} tools from ${this.baseUrl}`);
      } catch (error) {
        console.error("Failed to load tools:", error);
        this.tools = [];
      }
    }
    return this.tools;
  }

  private async invokeTool(toolName: string, args: any): Promise<any> {
    if (this.expressMcp) {
      // Invoke tool directly through Express app
      const dispatcher = (this.expressMcp as any).dispatcher;
      const tool = this.tools.find(t => t.name === toolName || t.title === toolName);
      
      if (!tool) {
        throw new Error(`Tool not found: ${toolName}`);
      }

      const route = tool.route;
      const result = await dispatcher.dispatch(
        route.method,
        route.path,
        args,
        {},
        { timeout: 30000 }
      );

      return {
        ok: true,
        result: result.body,
        status: result.status,
      };
    } else {
      // Invoke tool via HTTP
      return await this.httpRequest("POST", "/invoke", {
        toolName,
        args,
      });
    }
  }

  private async httpRequest(method: string, path: string, data?: any): Promise<any> {
    const url = new URL(path, this.baseUrl);
    
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "expressjs-mcp/1.0",
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    this.log(`HTTP ${method} ${url.toString()}`);

    try {
      const response = await fetch(url.toString(), options);
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      return await response.json();
    } catch (error) {
      this.log("HTTP error:", error);
      throw error;
    }
  }

  private setupHandlers() {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      await this.loadTools();
      
      return {
        tools: this.tools.map(tool => ({
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
                text: typeof result.result === "string" 
                  ? result.result 
                  : JSON.stringify(result.result, null, 2),
              },
            ],
          };
        } else {
          throw new McpError(
            ErrorCode.InternalError,
            result.error || "Tool execution failed"
          );
        }
      } catch (error: any) {
        this.log("Tool invocation error:", error);
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
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

  async startWithApp(app: Application, options?: { port?: number }) {
    // Initialize Express MCP
    this.expressMcp = new ExpressMCP(app);
    await this.expressMcp.init();
    
    // Mount MCP endpoints
    this.expressMcp.mount();
    
    // Start Express server if port provided
    if (options?.port) {
      app.listen(options.port, () => {
        console.log(`Express server running on port ${options.port}`);
      });
    }
    
    // Start MCP server
    await this.start();
  }
}

// Export for CLI usage
export default ExpressMCPServer;
