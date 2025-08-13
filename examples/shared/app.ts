import express, {
	type Application,
	type Request,
	type Response,
	type NextFunction,
} from "express";
import { registerController } from "../../src/decorators";
import { ItemsController } from "./controllers/items.controller";

// Create Express app
export function createApp(): Application {
	const app = express();

	// Middleware
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));

	// CORS middleware (optional)
	app.use((req: Request, res: Response, next: NextFunction) => {
		res.header("Access-Control-Allow-Origin", "*");
		res.header(
			"Access-Control-Allow-Methods",
			"GET, POST, PUT, DELETE, OPTIONS",
		);
		res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
		if (req.method === "OPTIONS") {
			return res.sendStatus(200);
		}
		next();
	});

	// Health check endpoint
	app.get("/health", (req: Request, res: Response) => {
		res.json({ status: "healthy", timestamp: new Date().toISOString() });
	});

	// Register controllers
	const itemsController = new ItemsController();
	registerController(app, itemsController);

	// Error handling middleware
	app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
		console.error("Error:", err);
		res.status(500).json({
			error: "Internal server error",
			message: err.message,
		});
	});

	// 404 handler
	app.use((req: Request, res: Response) => {
		res.status(404).json({
			error: "Not found",
			message: `Route ${req.method} ${req.path} not found`,
		});
	});

	return app;
}

// Export a singleton instance
export const app = createApp();
