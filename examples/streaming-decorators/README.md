# Example: Streaming with Decorators

This example demonstrates how to implement streaming responses using TypeScript decorators with Express-MCP.

## Features

- **Server-Sent Events (SSE)**: Real-time event streaming
- **Plain Text Streaming**: Simple text chunks
- **NDJSON Streaming**: Newline-delimited JSON
- **Chat-like Streaming**: Simulated AI response streaming
- **Progress Updates**: Long-running task progress

## Streaming Protocols Supported

### 1. Server-Sent Events (SSE)

```typescript
res.setHeader("Content-Type", "text/event-stream");
res.write(`data: ${JSON.stringify(data)}\n\n`);
```

### 2. Plain Text Streaming

```typescript
res.setHeader("Content-Type", "text/plain");
res.setHeader("Transfer-Encoding", "chunked");
res.write("chunk\n");
```

### 3. NDJSON (Newline-Delimited JSON)

```typescript
res.setHeader("Content-Type", "application/x-ndjson");
res.write(JSON.stringify(data) + "\n");
```

## Running the Example

```bash
# Install dependencies
pnpm install

# Run the example
pnpm tsx examples/streaming-decorators/server.ts
```

## Testing Streaming

### Direct Endpoint Testing

```bash
# Server-Sent Events
curl http://localhost:3010/stream/events

# Plain text streaming
curl http://localhost:3010/stream/numbers

# Chat streaming
curl -X POST http://localhost:3010/stream/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello world!"}'

# Progress updates
curl http://localhost:3010/stream/progress/task-123
```

### MCP Streaming Invocation

Enable streaming by adding `"streaming": true` to the request:

```bash
curl -X POST http://localhost:3010/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "GET_/stream/events",
    "args": {},
    "streaming": true
  }'
```

## Decorator Pattern

The example uses decorators to define streaming endpoints:

```typescript
@Controller("/stream")
export class StreamingController {
  @Get("/events")
  @ApiOperation({
    summary: "Stream server-sent events",
    description: "Streams events using SSE",
    tags: ["streaming"],
  })
  async streamEvents(req: Request, res: Response) {
    res.setHeader("Content-Type", "text/event-stream");
    // ... streaming logic
  }
}
```

## Streaming Detection

Express-MCP automatically detects streaming responses by:

1. **Content-Type Headers**:
   - `text/event-stream` (SSE)
   - `text/plain` with chunks
   - `application/x-ndjson`
   - `application/octet-stream`

2. **Transfer Encoding**:
   - `Transfer-Encoding: chunked`

3. **Custom Headers**:
   - `X-Streaming: true`
   - `X-Content-Stream: true`

## Use Cases

### Real-time Updates

```typescript
// Stock prices, live scores, notifications
res.setHeader("Content-Type", "text/event-stream");
setInterval(() => {
  res.write(`data: ${JSON.stringify(getLatestPrice())}\n\n`);
}, 1000);
```

### AI Response Streaming

```typescript
// ChatGPT-like streaming responses
for (const token of generateTokens(prompt)) {
  res.write(`data: ${token}`);
  await delay(50);
}
```

### File Downloads

```typescript
// Stream large files
const stream = fs.createReadStream(filePath);
res.setHeader("Content-Type", "application/octet-stream");
stream.pipe(res);
```

### Progress Monitoring

```typescript
// Long-running task progress
for (let i = 0; i <= 100; i += 10) {
  res.write(JSON.stringify({ progress: i }) + "\n");
  await processChunk();
}
```

## Client-Side Handling

### JavaScript EventSource

```javascript
const source = new EventSource('/stream/events');
source.onmessage = (event) => {
  console.log('Received:', event.data);
};
```

### Fetch API with Streaming

```javascript
const response = await fetch('/stream/numbers');
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log(decoder.decode(value));
}
```

## Best Practices

1. **Set Appropriate Headers**: Always set correct Content-Type
2. **Handle Disconnections**: Clean up resources on client disconnect
3. **Use Heartbeats**: Send periodic keep-alive messages for SSE
4. **Buffer Management**: Control buffering for real-time data
5. **Error Handling**: Stream errors as part of the protocol

## Performance Considerations

- **Memory Usage**: Streaming reduces memory for large responses
- **Latency**: First byte arrives faster than buffered responses
- **Scalability**: Better for concurrent connections
- **Network**: More efficient for slow connections

## Next Steps

- See [Example 01](../01-basic-usage) for basic MCP setup
- See [Example 07](../07-timeout) for timeout configuration
- See main [Streaming Documentation](../../docs/STREAMING.md)
