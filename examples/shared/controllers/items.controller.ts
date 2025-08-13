import type { Request, Response } from "express";
import { z } from "zod";
import {
	ApiOperation,
	Controller,
	Delete,
	Get,
	Post,
	Put,
	Schema,
} from "../../../src/decorators";
import {
	type CreateItem,
	CreateItemSchema,
	type Item,
	ItemResponseSchema,
	ItemSchema,
	ItemsListResponseSchema,
	ListItemsQuerySchema,
	type UpdateItem,
	UpdateItemSchema,
} from "../models/item";

// In-memory database
const itemsDb = new Map<number, Item>();
let nextId = 1;

@Controller("/items")
export class ItemsController {
	@Get("/")
	@ApiOperation({
		summary: "List all items",
		description: "List all items in the database with pagination support",
		tags: ["items"],
		operationId: "listItems",
	})
	@Schema({
		query: ListItemsQuerySchema,
		response: ItemsListResponseSchema,
	})
	async listItems(req: Request, res: Response) {
		const skip = Number(req.query.skip) || 0;
		const limit = Number(req.query.limit) || 10;
		const items = Array.from(itemsDb.values());
		const paginatedItems = items.slice(skip, skip + limit);
		return res.json(paginatedItems);
	}

	@Get("/:id")
	@ApiOperation({
		summary: "Get item by ID",
		description: "Get a specific item by its ID. Returns 404 if not found.",
		tags: ["items"],
		operationId: "getItem",
	})
	@Schema({
		params: z.object({ id: z.coerce.number().int().positive() }),
		response: ItemResponseSchema,
	})
	async getItem(req: Request, res: Response) {
		const id = Number.parseInt(req.params.id);
		const item = itemsDb.get(id);

		if (!item) {
			return res.status(404).json({
				error: "Not found",
				message: "Item not found",
			});
		}

		return res.json(item);
	}

	@Post("/")
	@ApiOperation({
		summary: "Create a new item",
		description: "Create a new item in the database. ID is auto-generated.",
		tags: ["items"],
		operationId: "createItem",
	})
	@Schema({
		body: CreateItemSchema,
		response: ItemResponseSchema,
	})
	async createItem(req: Request, res: Response) {
		const createData = req.body as CreateItem;
		const item: Item = {
			...createData,
			id: nextId++,
		};

		itemsDb.set(item.id, item);
		return res.status(201).json(item);
	}

	@Put("/:id")
	@ApiOperation({
		summary: "Update an item",
		description: "Update an existing item. Returns 404 if not found.",
		tags: ["items"],
		operationId: "updateItem",
	})
	@Schema({
		params: z.object({ id: z.coerce.number().int().positive() }),
		body: UpdateItemSchema,
		response: ItemResponseSchema,
	})
	async updateItem(req: Request, res: Response) {
		const id = Number.parseInt(req.params.id);
		const existingItem = itemsDb.get(id);

		if (!existingItem) {
			return res.status(404).json({
				error: "Not found",
				message: "Item not found",
			});
		}

		const updateData = req.body as UpdateItem;
		const updatedItem: Item = {
			...existingItem,
			...updateData,
			id, // Ensure ID doesn't change
		};

		itemsDb.set(id, updatedItem);
		return res.json(updatedItem);
	}

	@Delete("/:id")
	@ApiOperation({
		summary: "Delete an item",
		description: "Delete an item from the database. Returns 404 if not found.",
		tags: ["items"],
		operationId: "deleteItem",
	})
	@Schema({
		params: z.object({ id: z.coerce.number().int().positive() }),
	})
	async deleteItem(req: Request, res: Response) {
		const id = Number.parseInt(req.params.id);
		const item = itemsDb.get(id);

		if (!item) {
			return res.status(404).json({
				error: "Not found",
				message: "Item not found",
			});
		}

		itemsDb.delete(id);
		return res.status(204).send();
	}

	@Post("/bulk")
	@ApiOperation({
		summary: "Create multiple items",
		description: "Create multiple items at once",
		tags: ["items"],
		operationId: "createBulkItems",
	})
	@Schema({
		body: z.array(CreateItemSchema),
		response: z.array(ItemResponseSchema),
	})
	async createBulkItems(req: Request, res: Response) {
		const itemsData = req.body as CreateItem[];
		const createdItems: Item[] = [];

		for (const itemData of itemsData) {
			const item: Item = {
				...itemData,
				id: nextId++,
			};
			itemsDb.set(item.id, item);
			createdItems.push(item);
		}

		return res.status(201).json(createdItems);
	}

	@Get("/search")
	@ApiOperation({
		summary: "Search items",
		description: "Search items by name or tag",
		tags: ["items"],
		operationId: "searchItems",
	})
	@Schema({
		query: z.object({
			q: z.string().min(1),
			tag: z.string().optional(),
		}),
		response: z.array(ItemResponseSchema),
	})
	async searchItems(req: Request, res: Response) {
		const q = String(req.query.q || "");
		const tag = req.query.tag ? String(req.query.tag) : undefined;
		let items = Array.from(itemsDb.values());

		if (q) {
			items = items.filter(
				(item) =>
					item.name.toLowerCase().includes(q.toLowerCase()) ||
					item.description?.toLowerCase().includes(q.toLowerCase()),
			);
		}

		if (tag) {
			items = items.filter((item) => item.tags.includes(tag));
		}

		return res.json(items);
	}
}
