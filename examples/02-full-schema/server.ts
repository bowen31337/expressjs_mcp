/**
 * Example 02: Full Schema Description
 *
 * This example shows how to provide detailed schema information for MCP tools
 * using Zod schemas. This enables:
 * - Automatic input/output validation
 * - Rich type information for MCP clients
 * - Better error messages
 */

import express from "express";
import { z } from "zod";
import { ExpressMCP } from "../../src";

// Define schemas using Zod
const ItemSchema = z.object({
	id: z.number().int().positive(),
	name: z.string().min(1),
	price: z.number().positive(),
	tags: z.array(z.string()).default([]),
});

const CreateItemSchema = ItemSchema.omit({ id: true });
const UpdateItemSchema = ItemSchema.partial().omit({ id: true });

// In-memory database
const itemsDb = new Map<number, z.infer<typeof ItemSchema>>();
let nextId = 1;

const app = express();
app.use(express.json());

// Routes with schema annotations
app.get("/items", (req, res) => {
	const { skip = 0, limit = 10 } = req.query;
	const items = Array.from(itemsDb.values());
	const paginatedItems = items.slice(
		Number(skip),
		Number(skip) + Number(limit),
	);
	res.json(paginatedItems);
});

app.get("/items/:id", (req, res) => {
	const id = Number.parseInt(req.params.id);
	const item = itemsDb.get(id);
	if (!item) {
		return res.status(404).json({ error: "Item not found" });
	}
	res.json(item);
});

app.post("/items", (req, res) => {
	try {
		const data = CreateItemSchema.parse(req.body);
		const item = { ...data, id: nextId++ };
		itemsDb.set(item.id, item);
		res.status(201).json(item);
	} catch (error) {
		res.status(400).json({ error: "Invalid data", details: error });
	}
});

app.put("/items/:id", (req, res) => {
	const id = Number.parseInt(req.params.id);
	const existingItem = itemsDb.get(id);
	if (!existingItem) {
		return res.status(404).json({ error: "Item not found" });
	}
	try {
		const data = UpdateItemSchema.parse(req.body);
		const updatedItem = { ...existingItem, ...data, id };
		itemsDb.set(id, updatedItem);
		res.json(updatedItem);
	} catch (error) {
		res.status(400).json({ error: "Invalid data", details: error });
	}
});

app.delete("/items/:id", (req, res) => {
	const id = Number.parseInt(req.params.id);
	const item = itemsDb.get(id);
	if (!item) {
		return res.status(404).json({ error: "Item not found" });
	}
	itemsDb.delete(id);
	res.status(204).send();
});

// Initialize ExpressMCP with OpenAPI schema
const openapiSchema = {
	openapi: "3.0.0",
	info: {
		title: "Items API",
		version: "1.0.0",
		description: "API for managing items with full schema validation",
	},
	paths: {
		"/items": {
			get: {
				summary: "List items",
				description: "Get a paginated list of items",
				parameters: [
					{
						name: "skip",
						in: "query",
						schema: { type: "integer", minimum: 0, default: 0 },
						description: "Number of items to skip",
					},
					{
						name: "limit",
						in: "query",
						schema: { type: "integer", minimum: 1, maximum: 100, default: 10 },
						description: "Number of items to return",
					},
				],
				responses: {
					"200": {
						description: "List of items",
						content: {
							"application/json": {
								schema: {
									type: "array",
									items: {
										type: "object",
										properties: {
											id: { type: "integer" },
											name: { type: "string" },
											price: { type: "number" },
											tags: { type: "array", items: { type: "string" } },
										},
									},
								},
							},
						},
					},
				},
			},
			post: {
				summary: "Create item",
				description: "Create a new item",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									name: { type: "string", minLength: 1 },
									price: { type: "number", minimum: 0 },
									tags: { type: "array", items: { type: "string" } },
								},
								required: ["name", "price"],
							},
						},
					},
				},
				responses: {
					"201": {
						description: "Item created",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										id: { type: "integer" },
										name: { type: "string" },
										price: { type: "number" },
										tags: { type: "array", items: { type: "string" } },
									},
								},
							},
						},
					},
					"400": {
						description: "Invalid data",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										error: { type: "string" },
										details: { type: "object" },
									},
								},
							},
						},
					},
				},
			},
		},
		"/items/{id}": {
			get: {
				summary: "Get item by ID",
				description: "Get a specific item by its ID",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "integer", minimum: 1 },
						description: "Item ID",
					},
				],
				responses: {
					"200": {
						description: "Item found",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										id: { type: "integer" },
										name: { type: "string" },
										price: { type: "number" },
										tags: { type: "array", items: { type: "string" } },
									},
								},
							},
						},
					},
					"404": {
						description: "Item not found",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										error: { type: "string" },
									},
								},
							},
						},
					},
				},
			},
			put: {
				summary: "Update item",
				description: "Update an existing item",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "integer", minimum: 1 },
						description: "Item ID",
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									name: { type: "string", minLength: 1 },
									price: { type: "number", minimum: 0 },
									tags: { type: "array", items: { type: "string" } },
								},
							},
						},
					},
				},
				responses: {
					"200": {
						description: "Item updated",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										id: { type: "integer" },
										name: { type: "string" },
										price: { type: "number" },
										tags: { type: "array", items: { type: "string" } },
									},
								},
							},
						},
					},
					"404": {
						description: "Item not found",
					},
					"400": {
						description: "Invalid data",
					},
				},
			},
			delete: {
				summary: "Delete item",
				description: "Delete an item",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "integer", minimum: 1 },
						description: "Item ID",
					},
				],
				responses: {
					"204": {
						description: "Item deleted",
					},
					"404": {
						description: "Item not found",
					},
				},
			},
		},
	},
};

const mcp = new ExpressMCP(app, {
	mountPath: "/mcp",
	openapi: openapiSchema,
});

await mcp.init();
mcp.mount("/mcp");

const PORT = 3001;
app.listen(PORT, () => {
	console.log(`✅ Express server running on http://localhost:${PORT}`);
	console.log(`📡 MCP tools available at http://localhost:${PORT}/mcp/tools`);
	console.log(`🚀 MCP invoke endpoint at http://localhost:${PORT}/mcp/invoke`);

	// List discovered tools with full schema information
	setTimeout(() => {
		const tools = mcp.listTools();
		console.log(`\n🔧 Discovered ${tools.length} MCP tools with full schemas:`);
		for (const tool of tools) {
			const toolObj = tool as {
				title: string;
				description: string;
				inputSchema?: unknown;
			};
			console.log(`\n  📌 ${toolObj.title}`);
			console.log(`     ${toolObj.description}`);
			if (toolObj.inputSchema) {
				console.log(
					`     📋 Input Schema: ${JSON.stringify(toolObj.inputSchema, null, 2)}`,
				);
			}
		}
	});
});
