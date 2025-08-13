# Streaming Support in Express MCP

Express MCP provides comprehensive streaming support for real-time data transmission across three different protocols:

## 🌊 **Streaming Types Overview**

| Type | Protocol | Content-Type | Use Case |
|------|----------|--------------|----------|
| **HTTP Chunked** | HTTP/1.1 | `text/plain`, `Transfer-Encoding: chunked` | File downloads, progress updates |
| **Server-Sent Events** | HTTP/1.1 | `text/event-stream` | Real-time notifications, live data |
| **NDJSON/JSON Lines** | HTTP/1.1 | `application/x-ndjson` | Structured data streaming |
| **stdio** | MCP Bridge | JSON-RPC over stdio | MCP client communication |

## 📡 **1. Server-Sent Events (SSE)**

Perfect for real-time notifications and live data updates.

### Implementation
```typescript
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  let eventId = 0;
  const interval = setInterval(() => {
    const data = {
      id: ++eventId,
      timestamp: new Date().toISOString(),
      message: `Event ${eventId}`,
      data: { temperature: Math.random() * 30 + 10 }
    };
    
    res.write(`id: ${eventId}\n`);
    res.write(`event: update\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    
    if (eventId >= 10) {
      clearInterval(interval);
      res.write('event: close\n');
      res.write('data: Stream ended\n\n');
      res.end();
    }
  }, 1000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
});
```

### Testing SSE
```bash
# Direct access
curl -N http://localhost:3000/api/events

# Via MCP
curl -X POST http://localhost:3000/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{"toolName": "GET /api/events", "args": {}, "streaming": true}'
```

## 🌊 **2. HTTP Chunked Streaming**

Ideal for file downloads and progress indicators.

### Implementation
```typescript
app.get('/api/download/:filename', (req, res) => {
  const { filename } = req.params;
  
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Transfer-Encoding', 'chunked');

  // Simulate large file download
  const totalChunks = 20;
  let currentChunk = 0;
  
  const interval = setInterval(() => {
    const progress = Math.round((currentChunk / totalChunks) * 100);
    const chunkData = `Chunk ${currentChunk + 1}/${totalChunks} (${progress}%)\n`;
    
    res.write(chunkData);
    currentChunk++;
    
    if (currentChunk >= totalChunks) {
      clearInterval(interval);
      res.write('\n--- Download Complete ---\n');
      res.end();
    }
  }, 200);

  req.on('close', () => {
    clearInterval(interval);
  });
});
```

### Testing Chunked Streaming
```bash
# Direct download
curl http://localhost:3000/api/download/myfile.txt

# Via MCP with streaming
curl -X POST http://localhost:3000/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{"toolName": "GET /api/download/myfile.txt", "args": {"filename": "myfile.txt"}, "streaming": true}'
```

## 📄 **3. NDJSON/JSON Lines Streaming**

Perfect for structured data streaming and log processing.

### NDJSON Implementation
```typescript
app.get('/api/users/stream', (req, res) => {
  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Cache-Control', 'no-cache');

  const users = [
    { id: 1, name: 'Alice', role: 'admin', active: true },
    { id: 2, name: 'Bob', role: 'user', active: false },
    { id: 3, name: 'Charlie', role: 'moderator', active: true },
    { id: 4, name: 'Diana', role: 'user', active: true },
  ];

  let index = 0;
  const interval = setInterval(() => {
    if (index < users.length) {
      const user = {
        ...users[index],
        timestamp: new Date().toISOString(),
        processed_at: Date.now()
      };
      
      res.write(JSON.stringify(user) + '\n');
      index++;
    } else {
      clearInterval(interval);
      res.end();
    }
  }, 500);

  req.on('close', () => {
    clearInterval(interval);
  });
});
```

### JSON Lines Implementation
```typescript
app.get('/api/logs/stream', (req, res) => {
  res.setHeader('Content-Type', 'application/jsonlines');
  res.setHeader('X-Streaming', 'true');

  const logLevels = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
  const services = ['auth', 'api', 'db', 'cache'];
  
  let logCount = 0;
  const interval = setInterval(() => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: logLevels[Math.floor(Math.random() * logLevels.length)],
      service: services[Math.floor(Math.random() * services.length)],
      message: `Log entry ${++logCount}`,
      request_id: `req_${Math.random().toString(36).substr(2, 9)}`
    };
    
    res.write(JSON.stringify(logEntry) + '\n');
    
    if (logCount >= 15) {
      clearInterval(interval);
      res.end();
    }
  }, 300);

  req.on('close', () => {
    clearInterval(interval);
  });
});
```

### Testing NDJSON/JSON Lines
```bash
# Test NDJSON
curl http://localhost:3000/api/users/stream

# Test JSON Lines
curl http://localhost:3000/api/logs/stream

# Process with jq
curl -s http://localhost:3000/api/users/stream | jq -c 'select(.active == true)'
```

## 🔌 **4. stdio Streaming (MCP Bridge)**

For MCP client communication with progressive updates.

### How it Works
1. MCP client sends request with `_streaming: true` flag
2. Bridge makes HTTP streaming request to Express server
3. Bridge sends progressive notifications over stdio
4. Final response includes complete streamed data

### MCP Bridge Usage
```bash
# Start the bridge
npx express-mcp bridge --debug

# Send streaming request
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"GET /api/events","arguments":{"_streaming":true}}}' | \
  npx express-mcp bridge
```

### Progressive Notifications
The bridge sends notifications during streaming:
```json
{"jsonrpc":"2.0","method":"notifications/progress","params":{"progressToken":"stream_1","value":{"kind":"report","message":"data: {\"id\":1,\"message\":\"Event 1\"}\n\n"}}}
{"jsonrpc":"2.0","method":"notifications/progress","params":{"progressToken":"stream_1","value":{"kind":"report","message":"data: {\"id\":2,\"message\":\"Event 2\"}\n\n"}}}
```

## 🛠 **Custom Streaming Headers**

Express MCP automatically detects streaming based on headers:

```typescript
app.get('/api/custom-stream', (req, res) => {
  // Any of these headers will trigger streaming mode:
  res.setHeader('Content-Type', 'text/event-stream');     // SSE
  res.setHeader('Content-Type', 'application/x-ndjson');  // NDJSON
  res.setHeader('Content-Type', 'application/jsonlines'); // JSON Lines
  res.setHeader('Transfer-Encoding', 'chunked');          // Chunked
  res.setHeader('X-Streaming', 'true');                   // Custom flag
  res.setHeader('X-Content-Stream', 'true');              // Custom flag
  
  // Your streaming logic here
});
```

## 🧪 **Testing Streaming**

### Complete Test Suite
```bash
#!/bin/bash
# test-streaming.sh

BASE_URL="http://localhost:3000"

echo "🧪 Testing Express MCP Streaming Support"
echo "========================================"

# Test 1: Server-Sent Events
echo "📡 Testing SSE..."
timeout 5s curl -N "$BASE_URL/api/events" || echo "SSE test completed"

# Test 2: NDJSON Streaming
echo -e "\n📄 Testing NDJSON..."
curl -s "$BASE_URL/api/users/stream" | head -2

# Test 3: Chunked Transfer
echo -e "\n🌊 Testing Chunked..."
timeout 3s curl "$BASE_URL/api/download/test.txt" || echo "Chunked test completed"

# Test 4: MCP HTTP Streaming
echo -e "\n🔗 Testing MCP HTTP Streaming..."
curl -X POST "$BASE_URL/mcp/invoke" \
  -H "Content-Type: application/json" \
  -d '{"toolName": "GET /api/events", "args": {}, "streaming": true}' | \
  head -5

# Test 5: MCP stdio Streaming
echo -e "\n🔌 Testing MCP stdio Streaming..."
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"GET /api/users/stream","arguments":{"_streaming":true}}}' | \
  timeout 5s npx express-mcp bridge || echo "stdio streaming test completed"

echo -e "\n✅ All streaming tests completed!"
```

## 📊 **Performance Considerations**

### Memory Management
```typescript
// Good: Clean up intervals on disconnect
app.get('/api/stream', (req, res) => {
  const interval = setInterval(() => {
    // streaming logic
  }, 1000);

  req.on('close', () => {
    clearInterval(interval); // Prevent memory leaks
  });
});
```

### Backpressure Handling
```typescript
app.get('/api/large-stream', (req, res) => {
  const stream = createLargeDataStream();
  
  stream.on('data', (chunk) => {
    const canContinue = res.write(chunk);
    if (!canContinue) {
      // Wait for drain event before continuing
      res.once('drain', () => {
        stream.resume();
      });
      stream.pause();
    }
  });
});
```

### Error Handling
```typescript
app.get('/api/reliable-stream', (req, res) => {
  try {
    // Set up streaming
    const interval = setInterval(() => {
      try {
        res.write(data);
      } catch (error) {
        clearInterval(interval);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Streaming failed' });
        }
      }
    }, 1000);

    req.on('close', () => clearInterval(interval));
    req.on('error', () => clearInterval(interval));
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to start stream' });
  }
});
```

## 🔧 **Configuration Options**

### Timeout Configuration
```typescript
const mcp = new ExpressMCP(app, {
  // Configure streaming timeouts
  streaming: {
    timeout: 30000,        // 30 second default timeout
    maxChunkSize: 64 * 1024, // 64KB max chunk size
    bufferSize: 16 * 1024    // 16KB buffer size
  }
});
```

### Schema Annotations for Streaming
```typescript
const mcp = new ExpressMCP(app, {
  schemaAnnotations: {
    'GET /api/events': {
      description: 'Get real-time events via Server-Sent Events',
      streaming: true,
      output: {
        type: 'string',
        description: 'SSE stream with event data',
        format: 'text/event-stream'
      }
    },
    'GET /api/users/stream': {
      description: 'Stream user data as NDJSON',
      streaming: true,
      output: {
        type: 'string',
        description: 'NDJSON stream with user records',
        format: 'application/x-ndjson'
      }
    }
  }
});
```

## 🎯 **Best Practices**

1. **Always clean up resources** on client disconnect
2. **Use appropriate content types** for different streaming formats
3. **Handle backpressure** for large data streams
4. **Set reasonable timeouts** to prevent hanging connections
5. **Include progress indicators** for long-running streams
6. **Test with real network conditions** (slow connections, interruptions)
7. **Monitor memory usage** during streaming operations
8. **Use compression** for text-based streams when appropriate

## 🚀 **Examples Repository**

See the complete streaming examples in:
- `examples/streaming/server.ts` - Full streaming server implementation
- `tests/streaming.test.ts` - Comprehensive streaming tests
- `scripts/test-streaming.sh` - Automated testing script

Express MCP's streaming support enables real-time, efficient data transmission across all major streaming protocols! 🌊📡📄🔌
