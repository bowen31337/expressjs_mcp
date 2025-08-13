import { z } from "zod";

// Zod schema for Item
export const ItemSchema = z.object({
	id: z.number().int().positive(),
	name: z.string().min(1),
	description: z.string().optional(),
	price: z.number().positive(),
	tags: z.array(z.string()).default([]),
});

// Type inference from Zod schema
export type Item = z.infer<typeof ItemSchema>;

// Schema for creating an item (id is auto-generated)
export const CreateItemSchema = ItemSchema.omit({ id: true });
export type CreateItem = z.infer<typeof CreateItemSchema>;

// Schema for updating an item
export const UpdateItemSchema = ItemSchema.partial().omit({ id: true });
export type UpdateItem = z.infer<typeof UpdateItemSchema>;

// Query parameters for listing items
export const ListItemsQuerySchema = z.object({
	skip: z.coerce.number().int().min(0).default(0),
	limit: z.coerce.number().int().min(1).max(100).default(10),
});
export type ListItemsQuery = z.infer<typeof ListItemsQuerySchema>;

// Response schemas
export const ItemResponseSchema = ItemSchema;
export const ItemsListResponseSchema = z.array(ItemSchema);

// Error response schema
export const ErrorResponseSchema = z.object({
	error: z.string(),
	message: z.string().optional(),
	details: z.any().optional(),
});
