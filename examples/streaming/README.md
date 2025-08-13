# Streaming Express MCP Example

An advanced Express.js server demonstrating comprehensive streaming capabilities with Express MCP, including Server-Sent Events, NDJSON, JSON Lines, and real-time data transmission.

## 🎯 **What This Example Demonstrates**

- ✅ **Server-Sent Events (SSE)** streaming
- ✅ **NDJSON** (Newline Delimited JSON) streaming
- ✅ **JSON Lines** streaming
- ✅ **Chunked Transfer Encoding** streaming
- ✅ **Custom streaming headers** detection
- ✅ **Binary streaming** support
- ✅ **HTTP streaming** via MCP invoke
- ✅ **stdio streaming** via MCP bridge
- ✅ **Real-time progress indicators**
- ✅ **File download simulation**

## 🚀 **Quick Start**

### 1. Start the Streaming Server

```bash
# From the streaming example directory
cd examples/streaming

# Start with TypeScript (recommended)
npx tsx server.ts
```

Expected output:
```
🚀 Server running on http://localhost:3000
📊 MCP tools: http://localhost:3000/mcp/tools
📡 Streaming endpoints:
   - SSE: http://localhost:3000/api/stream
   - Logs: http://localhost:3000/api/logs
   - NDJSON: http://localhost:3000/api/ndjson
   - JSON Lines: http://localhost:3000/api/jsonlines
   - Custom: http://localhost:3000/api/custom-stream
   - Download: http://localhost:3000/api/download/test.txt

🧪 Test streaming with:
   # HTTP Streaming:
   curl -X POST http://localhost:3000/mcp/invoke \
     -H "Content-Type: application/json" \
     -d '{"toolName": "GET /api/stream", "args": {}, "streaming": true}'

   # stdio Streaming:
   echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"GET /api/ndjson","arguments":{"_streaming":true}}}' | \
     node /path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs
```

### 2. Test Streaming Endpoints Directly

```bash
# Server-Sent Events (will stream for 10 seconds)
curl -N http://localhost:3000/api/stream

# NDJSON streaming
curl http://localhost:3000/api/ndjson

# JSON Lines streaming
curl http://localhost:3000/api/jsonlines

# Real-time log streaming
curl http://localhost:3000/api/logs

# Custom streaming with progress indicators
curl http://localhost:3000/api/custom-stream

# File download simulation
curl http://localhost:3000/api/download/myfile.txt
```

### 3. Test Streaming via MCP

```bash
# HTTP streaming via MCP invoke
curl -X POST http://localhost:3000/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{"toolName": "GET /api/stream", "args": {}, "streaming": true}'

# Test different streaming types
curl -X POST http://localhost:3000/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{"toolName": "GET /api/ndjson", "args": {}, "streaming": true}'

curl -X POST http://localhost:3000/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{"toolName": "GET /api/jsonlines", "args": {}, "streaming": true}'
```

### 4. Test stdio Streaming via MCP Bridge

```bash
# Start MCP bridge in debug mode
node /path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs

# In another terminal, send streaming request
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"GET /api/ndjson","arguments":{"_streaming":true}}}' | \
  node /path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs
```

**Note**: Replace `/path/to/your/expressjs_mcp` with your actual project path.

## 🔧 **MCP Client Configuration**

### Claude Desktop (with Streaming Support)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "express-streaming-example": {
      "command": "node",
      "args": ["/path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs"],
      "env": {
        "EXPRESS_MCP_URL": "http://localhost:3000/mcp",
        "STREAMING_ENABLED": "true",
        "DEBUG": "false"
      }
    }
  }
}
```

**Note**: Replace `/path/to/your/expressjs_mcp` with your actual project path.

### Cursor IDE (with Streaming Support)

Add to `.cursor-settings/settings.json`:

```json
{
  "mcp.servers": {
    "express-streaming-example": {
      "command": "node",
      "args": ["/path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs"],
      "env": {
        "EXPRESS_MCP_URL": "http://localhost:3000/mcp",
        "STREAMING_ENABLED": "true",
        "DEBUG": "false"
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
      "name": "express-streaming-example",
      "command": "node",
      "args": ["/path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs"],
      "env": {
        "EXPRESS_MCP_URL": "http://localhost:3000/mcp",
        "STREAMING_ENABLED": "true"
      }
    }
  ]
}
```

**Note**: Replace `/path/to/your/expressjs_mcp` with your actual project path.

## 📡 **Available Streaming Endpoints**

| Endpoint | Type | Description | Content-Type | MCP Tool Name |
|----------|------|-------------|--------------|---------------|
| `/api/stream` | **SSE** | Real-time events | `text/event-stream` | `GET /api/stream` |
| `/api/logs` | **Chunked** | Log streaming | `text/plain` | `GET /api/logs` |
| `/api/ndjson` | **NDJSON** | User records | `application/x-ndjson` | `GET /api/ndjson` |
| `/api/jsonlines` | **JSON Lines** | Event stream | `application/jsonlines` | `GET /api/jsonlines` |
| `/api/custom-stream` | **Custom** | Progress updates | `text/plain` | `GET /api/custom-stream` |
| `/api/download/:filename` | **Binary** | File download | `application/octet-stream` | `GET /api/download/:filename` |

### Regular API Endpoints (Non-Streaming)

| Endpoint | Description | MCP Tool Name |
|----------|-------------|---------------|
| `/api/users` | Get all users | `GET /api/users` |
| `/api/users` | Create user | `POST /api/users` |

## 🌊 **Streaming Types Explained**

### 1. Server-Sent Events (SSE)
```bash
# Test SSE streaming
curl -N http://localhost:3000/api/stream
```

**Output Format**:
```
data: {"timestamp":"2024-01-01T12:00:00.000Z","count":1,"message":"Event 1"}

data: {"timestamp":"2024-01-01T12:00:01.000Z","count":2,"message":"Event 2"}

data: [DONE]
```

**Use Cases**: Real-time notifications, live updates, chat messages

### 2. NDJSON (Newline Delimited JSON)
```bash
# Test NDJSON streaming
curl http://localhost:3000/api/ndjson
```

**Output Format**:
```json
{"id":1,"name":"Alice","status":"active","timestamp":"2024-01-01T12:00:00.000Z"}
{"id":2,"name":"Bob","status":"inactive","timestamp":"2024-01-01T12:00:01.000Z"}
{"id":3,"name":"Charlie","status":"pending","timestamp":"2024-01-01T12:00:02.000Z"}
```

**Use Cases**: Bulk data export, database streaming, ETL processes

### 3. JSON Lines
```bash
# Test JSON Lines streaming
curl http://localhost:3000/api/jsonlines
```

**Output Format**:
```json
{"event":"user_login","userId":123,"timestamp":1704110400000}
{"event":"page_view","userId":123,"page":"/dashboard","timestamp":1704110401000}
{"event":"user_logout","userId":123,"timestamp":1704110402000}
```

**Use Cases**: Event logging, analytics data, audit trails

### 4. Chunked Transfer Encoding
```bash
# Test chunked streaming
curl http://localhost:3000/api/logs
```

**Output Format**:
```
[2024-01-01T12:00:00.000Z] INFO: Application started
[2024-01-01T12:00:01.000Z] WARN: High memory usage detected
[2024-01-01T12:00:02.000Z] ERROR: Database connection failed
```

**Use Cases**: Log streaming, progress updates, file processing

### 5. Custom Streaming Headers
```bash
# Test custom streaming
curl http://localhost:3000/api/custom-stream
```

**Headers Used**:
- `X-Streaming: true`
- `X-Content-Stream: true`
- `Content-Type: text/plain`

**Use Cases**: Custom protocols, specialized streaming formats

## 🧪 **Testing with MCP Clients**

### Using Claude Desktop

1. **Start the streaming server**: `npx tsx server.ts`
2. **Configure Claude** with the MCP server settings above
3. **Restart Claude Desktop**
4. **Test with streaming prompts**:
   - "Stream real-time events from the API"
   - "Get streaming user data in NDJSON format"
   - "Show me live log updates"
   - "Download a file with progress updates"

### Using Cursor IDE

1. **Start the streaming server**: `npx tsx server.ts`
2. **Configure Cursor** with the MCP server settings above
3. **Restart Cursor**
4. **Use MCP commands** with streaming enabled
5. **Test streaming tool invocation**

### Manual Testing Script

Create a test script `test-streaming.sh`:

```bash
#!/bin/bash

# Test all streaming endpoints
echo "🧪 Testing Express MCP Streaming"
echo "================================"

# Test SSE
echo "📡 Testing Server-Sent Events..."
timeout 5s curl -N http://localhost:3000/api/stream

echo -e "\n📄 Testing NDJSON..."
curl -s http://localhost:3000/api/ndjson

echo -e "\n📋 Testing JSON Lines..."
curl -s http://localhost:3000/api/jsonlines

echo -e "\n🌊 Testing Chunked Streaming..."
timeout 3s curl http://localhost:3000/api/logs

echo -e "\n🔗 Testing MCP HTTP Streaming..."
curl -X POST http://localhost:3000/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{"toolName": "GET /api/stream", "args": {}, "streaming": true}' | head -5

echo -e "\n✅ All tests completed!"
```

## 🔍 **Code Walkthrough**

### Server-Sent Events Implementation

```typescript
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

  req.on("close", () => {
    clearInterval(interval);
  });
});
```

### NDJSON Streaming Implementation

```typescript
app.get("/api/ndjson", (req, res) => {
  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache");

  const data = [
    { id: 1, name: "Alice", status: "active" },
    { id: 2, name: "Bob", status: "inactive" },
    // ... more data
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
```

### Express MCP Integration with Schema Annotations

```typescript
const mcp = new ExpressMCP(app, {
  mountPath: "/mcp",
  schemaAnnotations: {
    "GET /api/stream": {
      description: "Get real-time streaming events (Server-Sent Events)",
      output: {
        type: "string",
        description: "Streaming response with event data",
      },
    },
    "GET /api/ndjson": {
      description: "Get NDJSON (Newline Delimited JSON) streaming data",
      output: {
        type: "string",
        description: "NDJSON stream with user records",
      },
    },
    // ... more annotations
  },
});
```

## 🎯 **Advanced Usage**

### Custom Streaming Detection

Express MCP automatically detects streaming based on:

- `Content-Type: text/event-stream` (SSE)
- `Content-Type: application/x-ndjson` (NDJSON)
- `Content-Type: application/jsonlines` (JSON Lines)
- `Transfer-Encoding: chunked` (Chunked)
- `X-Streaming: true` (Custom)
- `X-Content-Stream: true` (Custom)

### Streaming with Authentication

```typescript
// Add authentication to streaming endpoints
app.use('/api/stream', authenticateToken);

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.sendStatus(401);
  }
  
  // Verify token logic here
  next();
}
```

### Error Handling in Streams

```typescript
app.get("/api/robust-stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  
  try {
    const interval = setInterval(() => {
      try {
        // Streaming logic here
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (error) {
        clearInterval(interval);
        res.write(`event: error\ndata: ${error.message}\n\n`);
        res.end();
      }
    }, 1000);

    req.on('close', () => clearInterval(interval));
    req.on('error', () => clearInterval(interval));
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to start stream' });
  }
});
```

## 🚨 **Troubleshooting**

### Streaming Not Working

```bash
# Check if streaming headers are set correctly
curl -I http://localhost:3000/api/stream

# Verify MCP streaming detection
curl -X POST http://localhost:3000/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{"toolName": "GET /api/stream", "args": {}, "streaming": true}' -v
```

### MCP Bridge Streaming Issues

```bash
# Test MCP bridge with streaming
node /path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs

# Check for streaming support
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"GET /api/stream","arguments":{"_streaming":true}}}' | \
  node /path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs
```

**Note**: Replace `/path/to/your/expressjs_mcp` with your actual project path.

### Performance Issues

```bash
# Monitor server performance during streaming
top -p $(pgrep -f "npx tsx server.ts")

# Check memory usage
ps aux | grep "npx tsx server.ts"

# Test concurrent streaming
for i in {1..5}; do
  curl -X POST http://localhost:3000/mcp/invoke \
    -H "Content-Type: application/json" \
    -d '{"toolName": "GET /api/stream", "args": {}, "streaming": true}' &
done
```

## 📊 **Performance Considerations**

### Memory Management

- **Clean up intervals** on client disconnect
- **Limit concurrent streams** to prevent memory leaks
- **Use backpressure handling** for large data streams
- **Monitor memory usage** in production

### Scaling Streaming

- **Use Redis** for multi-instance streaming
- **Implement connection pooling** for database streams
- **Add rate limiting** to prevent abuse
- **Use CDN** for static streaming content

## 🔗 **Related Documentation**

- [Streaming Documentation](../../docs/STREAMING.md)
- [Basic Example](../basic/README.md)
- [MCP Client Setup](../../docs/MCP_CLIENT_SETUP.md)
- [Express MCP Overview](../../README.md)

## 🎉 **Next Steps**

1. **Implement your own streaming endpoints**
2. **Add authentication and rate limiting**
3. **Integrate with real-time data sources**
4. **Deploy with proper monitoring**
5. **Scale with Redis and clustering**

Happy streaming! 🌊🚀
