/**
 * Example 02: Full Schema Description
 * 
 * This example shows how to provide detailed schema information for MCP tools
 * using Zod schemas. This enables:
 * - Automatic input/output validation
 * - Rich type information for MCP clients
 * - Better error messages
 */

import { app } from "../shared/app";
import { ExpressMCP } from "../../src/index";
import { z } from "zod";
import {
  ItemSchema,
  CreateItemSchema,
  UpdateItemSchema,
  ListItemsQuerySchema,
  ItemsListResponseSchema,
  ItemResponseSchema,
} from "../shared/models/item";

// Define schema annotations for each route
const schemaAnnotations = {
  "GET /items": {
    description: "List all items with pagination support",
    input: ListItemsQuerySchema,
    output: ItemsListResponseSchema,
    examples: [
      { skip: 0, limit: 10 },
      { skip: 10, limit: 20 },
    ],
  },
  "GET /items/:id": {
    description: "Get a specific item by ID",
    input: z.object({
      id: z.coerce.number().int().positive().describe("The item ID"),
    }),
    output: ItemResponseSchema,
    examples: [
      { id: 1 },
      { id: 42 },
    ],
  },
  "POST /items": {
    description: "Create a new item",
    input: CreateItemSchema,
    output: ItemResponseSchema,
    examples: [
      {
        name: "Laptop",
        description: "High-performance laptop",
        price: 1299.99,
        tags: ["electronics", "computers"],
      },
      {
        name: "Coffee Mug",
        price: 12.99,
        tags: ["kitchen"],
      },
    ],
  },
  "PUT /items/:id": {
    description: "Update an existing item",
    input: z.object({
      id: z.coerce.number().int().positive(),
      ...UpdateItemSchema.shape,
    }),
    output: ItemResponseSchema,
    examples: [
      {
        id: 1,
        name: "Updated Item Name",
        price: 99.99,
      },
    ],
  },
  "DELETE /items/:id": {
    description: "Delete an item",
    input: z.object({
      id: z.coerce.number().int().positive(),
    }),
    output: z.void(),
    examples: [
      { id: 1 },
    ],
  },
  "POST /items/bulk": {
    description: "Create multiple items at once",
    input: z.array(CreateItemSchema),
    output: z.array(ItemResponseSchema),
    examples: [
      [
        { name: "Item 1", price: 10.99, tags: ["bulk"] },
        { name: "Item 2", price: 20.99, tags: ["bulk"] },
      ],
    ],
  },
  "GET /items/search": {
    description: "Search items by name or tag",
    input: z.object({
      q: z.string().min(1).describe("Search query"),
      tag: z.string().optional().describe("Filter by tag"),
    }),
    output: z.array(ItemResponseSchema),
    examples: [
      { q: "laptop" },
      { q: "coffee", tag: "kitchen" },
    ],
  },
};

// Create ExpressMCP with schema annotations
const mcp = new ExpressMCP(app, {
  mountPath: "/mcp",
  schemaAnnotations,
  // Enable logging for better debugging
  logging: {
    info: (...args) => console.log("[MCP]", ...args),
    error: (...args) => console.error("[MCP ERROR]", ...args),
  },
});

async function start() {
  await mcp.init();
  mcp.mount();

  const PORT = process.env.PORT || 3002;
  app.listen(PORT, () => {
    console.log(`✅ Express server running on http://localhost:${PORT}`);
    console.log(`📡 MCP tools available at http://localhost:${PORT}/mcp/tools`);
    console.log(`🚀 MCP invoke endpoint at http://localhost:${PORT}/mcp/invoke`);
    
    // Show tools with their schemas
    const tools = mcp.listTools();
    console.log(`\n🔧 Discovered ${tools.length} MCP tools with full schemas:`);
    tools.forEach((tool: any) => {
      console.log(`\n  📌 ${tool.title}`);
      console.log(`     ${tool.description}`);
      if (tool.inputSchema) {
        console.log(`     Input: ${JSON.stringify(tool.inputSchema.properties ? Object.keys(tool.inputSchema.properties) : tool.inputSchema.type)}`);
      }
      if (tool.outputSchema) {
        console.log(`     Output: ${tool.outputSchema.type}`);
      }
      if (tool.examples?.length > 0) {
        console.log(`     Examples: ${tool.examples.length} provided`);
      }
    });
  });
}

start().catch(console.error);
