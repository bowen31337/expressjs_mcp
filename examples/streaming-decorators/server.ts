/**
 * Example: Streaming with Decorators
 * 
 * This example shows how to use decorators for streaming responses
 * with Express-MCP, supporting Server-Sent Events (SSE).
 */

import express, { Request, Response } from "express";
import { Controller, Get, Post, ApiOperation } from "../../src/decorators";
import { ExpressMCP } from "../../src/index";
import { z } from "zod";

// Streaming controller using decorators
@Controller("/stream")
export class StreamingController {
  @Get("/events")
  @ApiOperation({
    summary: "Stream server-sent events",
    description: "Streams a series of events to the client using SSE",
    tags: ["streaming"],
    operationId: "streamEvents",
  })
  async streamEvents(req: Request, res: Response) {
    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Streaming", "true");
    
    let counter = 0;
    const interval = setInterval(() => {
      counter++;
      const data = {
        id: counter,
        timestamp: new Date().toISOString(),
        message: `Event ${counter}`,
      };
      
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      
      if (counter >= 5) {
        clearInterval(interval);
        res.write("event: done\ndata: Stream complete\n\n");
        res.end();
      }
    }, 1000);
    
    // Handle client disconnect
    req.on("close", () => {
      clearInterval(interval);
      res.end();
    });
  }
  
  @Get("/numbers")
  @ApiOperation({
    summary: "Stream numbers",
    description: "Streams a sequence of numbers",
    tags: ["streaming"],
    operationId: "streamNumbers",
  })
  async streamNumbers(req: Request, res: Response) {
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");
    
    for (let i = 1; i <= 10; i++) {
      res.write(`${i}\n`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    res.end();
  }
  
  @Post("/chat")
  @ApiOperation({
    summary: "Stream chat response",
    description: "Simulates a streaming chat response like an AI assistant",
    tags: ["streaming", "chat"],
    operationId: "streamChat",
  })
  async streamChat(req: Request, res: Response) {
    const { message } = req.body;
    
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Streaming", "true");
    
    // Simulate typing response word by word
    const response = `Hello! You said: "${message}". This is a simulated streaming response that arrives word by word.`;
    const words = response.split(" ");
    
    for (const word of words) {
      res.write(`data: ${word} `);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    res.write("\n\ndata: [DONE]\n\n");
    res.end();
  }
  
  @Get("/progress/:taskId")
  @ApiOperation({
    summary: "Stream task progress",
    description: "Streams progress updates for a long-running task",
    tags: ["streaming", "progress"],
    operationId: "streamProgress",
  })
  async streamProgress(req: Request, res: Response) {
    const { taskId } = req.params;
    
    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("X-Streaming", "true");
    
    // Simulate task progress
    const stages = [
      { stage: "Initializing", progress: 0 },
      { stage: "Loading data", progress: 20 },
      { stage: "Processing", progress: 40 },
      { stage: "Analyzing", progress: 60 },
      { stage: "Finalizing", progress: 80 },
      { stage: "Complete", progress: 100 },
    ];
    
    for (const update of stages) {
      const data = {
        taskId,
        ...update,
        timestamp: new Date().toISOString(),
      };
      
      res.write(JSON.stringify(data) + "\n");
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    res.end();
  }
}

// Create Express app and register controller
const app = express();
app.use(express.json());

// Register streaming controller
import { registerController } from "../../src/decorators";
const streamingController = new StreamingController();
registerController(app, streamingController);

// Add non-streaming endpoints for comparison
app.get("/regular/data", (req: Request, res: Response) => {
  res.json({
    message: "This is a regular non-streaming response",
    timestamp: new Date().toISOString(),
  });
});

// Create ExpressMCP with streaming support
const mcp = new ExpressMCP(app, {
  mountPath: "/mcp",
  logging: {
    info: (...args) => console.log("[MCP]", ...args),
    error: (...args) => console.error("[MCP ERROR]", ...args),
  },
});

async function start() {
  await mcp.init();
  mcp.mount();
  
  const PORT = process.env.PORT || 3010;
  app.listen(PORT, () => {
    console.log(`✅ Express server running on http://localhost:${PORT}`);
    console.log(`📡 MCP tools available at http://localhost:${PORT}/mcp/tools`);
    
    console.log("\n🌊 Streaming Endpoints:");
    console.log("   GET  /stream/events   - Server-Sent Events");
    console.log("   GET  /stream/numbers  - Plain text streaming");
    console.log("   POST /stream/chat     - Chat-like streaming");
    console.log("   GET  /stream/progress/:id - Progress updates (NDJSON)");
    
    console.log("\n📝 Test Streaming via MCP:");
    console.log("\n1. Server-Sent Events:");
    console.log(`   curl -X POST http://localhost:${PORT}/mcp/invoke \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"toolName": "GET_/stream/events", "args": {}, "streaming": true}'`);
    
    console.log("\n2. Chat Streaming:");
    console.log(`   curl -X POST http://localhost:${PORT}/mcp/invoke \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"toolName": "POST_/stream/chat", "args": {"message": "Hello!"}, "streaming": true}'`);
    
    console.log("\n3. Progress Streaming:");
    console.log(`   curl -X POST http://localhost:${PORT}/mcp/invoke \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"toolName": "GET_/stream/progress/:taskId", "args": {"taskId": "task-123"}, "streaming": true}'`);
    
    console.log("\n💡 Note: Add 'streaming: true' to enable streaming mode");
  });
}

start().catch(console.error);
