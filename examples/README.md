# Express MCP Examples

This directory contains example implementations demonstrating different features of Express MCP.

## 📁 **Available Examples**

### 1. **Basic Example** (`basic/`)
- Simple Express server with basic CRUD operations
- Demonstrates core MCP integration
- Perfect for getting started

### 2. **Streaming Example** (`streaming/`)
- Advanced streaming capabilities
- Multiple streaming protocols (SSE, NDJSON, Chunked)
- Real-time data transmission examples

## 🚀 **Quick Start**

### Prerequisites
```bash
# Install dependencies (from project root)
pnpm install

# Build the project
pnpm build
```

### Running Examples

#### Basic Example
```bash
# Navigate to basic example
cd examples/basic

# Start the server
npx tsx server.ts
# or
node server.js

# Server will start on http://localhost:3000
# MCP endpoints: /mcp/tools and /mcp/invoke
```

#### Streaming Example
```bash
# Navigate to streaming example
cd examples/streaming

# Start the server
npx tsx server.ts

# Server will start on http://localhost:3000
# Includes multiple streaming endpoints
```

## 🔧 **MCP Client Configuration**

### Claude Desktop

Create or update `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "expressjs-mcp-basic": {
      "command": "node",
      "args": ["/path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs"],
      "env": {
        "EXPRESS_MCP_URL": "http://localhost:3000/mcp"
      }
    }
  }
}
```

**Note**: Replace `/path/to/your/expressjs_mcp` with your actual project path.

### Cursor IDE

Add to your Cursor settings (`.cursor-settings/settings.json`):

```json
{
  "mcp.servers": {
    "expressjs-mcp-basic": {
      "command": "node",
      "args": ["/path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs"],
      "env": {
        "EXPRESS_MCP_URL": "http://localhost:3000/mcp"
      }
    }
  }
}
```

**Note**: Replace `/path/to/your/expressjs_mcp` with your actual project path.

### VS Code with MCP Extension

Add to VS Code settings:

```json
{
  "mcp.servers": [
    {
      "name": "expressjs-mcp-basic",
      "command": "node",
      "args": ["/path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs"],
      "env": {
        "EXPRESS_MCP_URL": "http://localhost:3000/mcp"
      }
    }
  ]
}
```

**Note**: Replace `/path/to/your/expressjs_mcp` with your actual project path.

## 📋 **Step-by-Step Setup Guide**

### 1. **Start the Example Server**

Choose your example and start the server:

```bash
# For basic example
cd examples/basic && npx tsx server.ts

# For streaming example  
cd examples/streaming && npx tsx server.ts
```

You should see output like:
```
🚀 Server running on http://localhost:3000
📊 MCP tools: http://localhost:3000/mcp/tools
🔗 MCP invoke: http://localhost:3000/mcp/invoke
```

### 2. **Verify Server is Running**

Test the MCP endpoints:

```bash
# List available tools
curl http://localhost:3000/mcp/tools

# Test a simple tool invocation
curl -X POST http://localhost:3000/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{"toolName": "GET /api/users", "args": {}}'
```

### 3. **Configure Your MCP Client**

Choose your preferred MCP client and add the configuration above.

### 4. **Test the Integration**

#### Using Claude Desktop:
1. Restart Claude Desktop after configuration
2. Start a new conversation
3. Ask Claude to "list the available tools" or "get users from the API"

#### Using Cursor:
1. Restart Cursor after configuration
2. Open the command palette (Cmd/Ctrl + Shift + P)
3. Search for "MCP" commands
4. Test tool invocation

#### Using VS Code:
1. Restart VS Code after configuration
2. Use the MCP extension interface
3. Browse and invoke available tools

## 🧪 **Testing Examples**

### Basic Example Testing

```bash
# Start the basic server
cd examples/basic && npx tsx server.ts &

# Test basic endpoints
curl http://localhost:3000/api/users
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'

# Test MCP integration
curl http://localhost:3000/mcp/tools
curl -X POST http://localhost:3000/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{"toolName": "GET /api/users", "args": {}}'
```

### Streaming Example Testing

```bash
# Start the streaming server
cd examples/streaming && npx tsx server.ts &

# Test streaming endpoints directly
curl http://localhost:3000/api/stream          # Server-Sent Events
curl http://localhost:3000/api/ndjson         # NDJSON streaming
curl http://localhost:3000/api/jsonlines      # JSON Lines streaming

# Test streaming via MCP
curl -X POST http://localhost:3000/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{"toolName": "GET /api/stream", "args": {}, "streaming": true}'

# Test stdio streaming via MCP bridge
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"GET /api/ndjson","arguments":{"_streaming":true}}}' | \
  node /path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs
```

## 🔍 **Troubleshooting**

### Common Issues

#### Server Not Starting
```bash
# Check if port 3000 is already in use
lsof -i :3000

# Kill existing processes
pkill -f "npx tsx server.ts"

# Try a different port
PORT=3001 npx tsx server.ts
```

#### MCP Client Not Connecting
```bash
# Test MCP bridge manually
node /path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs

# Check if server is accessible
curl http://localhost:3000/mcp/tools

# Verify environment variables
echo $EXPRESS_MCP_URL
```

#### Tools Not Appearing
```bash
# Verify tools are registered
curl http://localhost:3000/mcp/tools | jq '.tools[].name'

# Check MCP bridge logs
DEBUG=1 node /path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs
```

### Debug Mode

Enable debug logging for troubleshooting:

```bash
# Start server with debug logging
DEBUG=expressjs-mcp npx tsx server.ts

# Start MCP bridge with debug logging
node /path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs
```
```

## 📚 **Example Walkthroughs**

### Basic Example Walkthrough

1. **Start the server**: `cd examples/basic && npx tsx server.ts`
2. **Explore available tools**: Visit http://localhost:3000/mcp/tools
3. **Test user management**:
   - Get users: `{"toolName": "GET /api/users", "args": {}}`
   - Create user: `{"toolName": "POST /api/users", "args": {"name": "Alice", "email": "alice@example.com"}}`
4. **Configure Claude/Cursor** with the MCP bridge
5. **Ask your AI assistant** to manage users through the API

### Streaming Example Walkthrough

1. **Start the streaming server**: `cd examples/streaming && npx tsx server.ts`
2. **Test different streaming types**:
   - Server-Sent Events: Visit http://localhost:3000/api/stream
   - NDJSON: `curl http://localhost:3000/api/ndjson`
   - JSON Lines: `curl http://localhost:3000/api/jsonlines`
3. **Test streaming via MCP**:
   - HTTP streaming: Use `streaming: true` flag in invoke requests
   - stdio streaming: Use `_streaming: true` in MCP bridge
4. **Configure your MCP client** for streaming support
5. **Ask your AI assistant** to stream real-time data

## 🎯 **Next Steps**

1. **Customize the examples** for your specific use case
2. **Add authentication** using Express middleware
3. **Implement your own streaming endpoints**
4. **Create custom MCP tool schemas** with Zod annotations
5. **Deploy to production** with proper error handling and logging

## 📖 **Additional Resources**

- [Express MCP Documentation](../docs/)
- [MCP Client Setup Guide](../docs/MCP_CLIENT_SETUP.md)
- [Streaming Documentation](../docs/STREAMING.md)
- [Quick Setup Guide](../docs/QUICK_MCP_SETUP.md)

Happy coding! 🚀
