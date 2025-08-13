#!/usr/bin/env node

/**
 * Express MCP Bridge
 * 
 * Connects MCP clients (Claude Desktop, Cursor, VS Code) to express_mcp HTTP gateway
 * via stdio protocol.
 * 
 * Usage:
 *   node mcp-bridge.js
 * 
 * Environment Variables:
 *   EXPRESS_MCP_URL - URL of your express_mcp HTTP gateway (default: http://localhost:3000/mcp)
 *   DEBUG - Enable debug logging (default: false)
 */

const http = require('http');
const https = require('https');

const EXPRESS_MCP_URL = process.env.EXPRESS_MCP_URL || 'http://localhost:3000/mcp';
const DEBUG = process.env.DEBUG === 'true';

function debug(...args) {
  if (DEBUG) {
    console.error('[DEBUG]', ...args);
  }
}

class ExpressMCPBridge {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    debug('Bridge initialized with URL:', baseUrl);
  }

  async listTools() {
    try {
      debug('Listing tools...');
      const response = await this.httpRequest('GET', '/tools');
      const tools = response.tools || [];
      debug('Found', tools.length, 'tools');
      return tools;
    } catch (error) {
      console.error('Failed to list tools:', error.message);
      return [];
    }
  }

  async invokeTool(toolName, args) {
    try {
      debug('Invoking tool:', toolName, 'with args:', args);
      const response = await this.httpRequest('POST', '/invoke', {
        toolName,
        args
      });
      debug('Tool response:', response);
      return response;
    } catch (error) {
      console.error('Failed to invoke tool:', toolName, error.message);
      throw error;
    }
  }

  httpRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'express-mcp-bridge/1.0'
        },
        timeout: 10000
      };

      debug('HTTP request:', method, url.toString());

      const req = httpModule.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          debug('HTTP response:', res.statusCode, body.substring(0, 200));
          try {
            if (res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${body}`));
              return;
            }
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch (e) {
            resolve({ body });
          }
        });
      });

      req.on('error', (error) => {
        debug('HTTP error:', error.message);
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }
}

// MCP Protocol Implementation
class MCPServer {
  constructor() {
    this.bridge = new ExpressMCPBridge(EXPRESS_MCP_URL);
  }

  async handleRequest(request) {
    const { method, params } = request;
    debug('Handling MCP request:', method, params);

    try {
      switch (method) {
        case 'initialize':
          return {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'express-mcp-bridge',
              version: '1.0.0'
            }
          };

        case 'tools/list':
          const tools = await this.bridge.listTools();
          return { 
            tools: tools.map(tool => ({
              name: tool.name,
              description: tool.description,
              inputSchema: tool.inputSchema
            }))
          };

        case 'tools/call':
          const { name, arguments: args } = params;
          const result = await this.bridge.invokeTool(name, args);
          
          // Format response for MCP
          let content;
          if (result.ok) {
            content = [{
              type: 'text',
              text: JSON.stringify(result.result, null, 2)
            }];
          } else {
            content = [{
              type: 'text', 
              text: `Error: ${result.error}`
            }];
          }

          return { content };

        default:
          throw new Error(`Unknown method: ${method}`);
      }
    } catch (error) {
      debug('Error handling request:', error.message);
      throw error;
    }
  }
}

// Stdio communication handler
const server = new MCPServer();
let buffer = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', async (chunk) => {
  buffer += chunk;
  
  // Process complete JSON messages (separated by newlines)
  const lines = buffer.split('\n');
  buffer = lines.pop() || ''; // Keep incomplete line in buffer
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    try {
      const request = JSON.parse(line);
      debug('Received request:', request);
      
      const response = await server.handleRequest(request);
      
      const reply = {
        jsonrpc: '2.0',
        id: request.id,
        result: response
      };
      
      debug('Sending response:', reply);
      process.stdout.write(JSON.stringify(reply) + '\n');
      
    } catch (error) {
      const errorReply = {
        jsonrpc: '2.0',
        id: request?.id || null,
        error: {
          code: -1,
          message: error.message
        }
      };
      
      debug('Sending error:', errorReply);
      process.stdout.write(JSON.stringify(errorReply) + '\n');
    }
  }
});

process.stdin.on('end', () => {
  debug('Stdin ended, exiting...');
  process.exit(0);
});

process.on('SIGINT', () => {
  debug('Received SIGINT, exiting...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  debug('Received SIGTERM, exiting...');
  process.exit(0);
});

// Startup message
console.error('Express MCP Bridge started');
console.error('Connecting to:', EXPRESS_MCP_URL);
console.error('Debug mode:', DEBUG ? 'enabled' : 'disabled');
console.error('Ready for MCP requests...');
