import type { Application } from "express";
import { InMemoryDispatcher } from "./inMemoryDispatcher";
import { McpServer } from "./mcpServer";
import { RouteIntrospector } from "./routeIntrospector";
import { SchemaResolver } from "./schemaResolver";

export type RouteInfo = {
	method: string;
	path: string;
	middlewares: ((...args: unknown[]) => unknown)[];
	handler: (...args: unknown[]) => unknown;
};

export type ExpressMCPOptions = {
	mountPath?: string;
	openapi?: Record<string, unknown>;
	schemaAnnotations?: Record<string, unknown>;
	include?: (route: RouteInfo) => boolean;
	exclude?: (route: RouteInfo) => boolean;
	auth?: { enabled?: boolean };
	logging?: {
		info: (...a: unknown[]) => void;
		error: (...a: unknown[]) => void;
	};
};

export class ExpressMCP {
	private server: McpServer;
	private dispatcher: InMemoryDispatcher;
	private introspector: RouteIntrospector;
	private schemas: SchemaResolver;

	constructor(
		private app: Application,
		private options: ExpressMCPOptions = {},
	) {
		this.introspector = new RouteIntrospector(app);
		this.dispatcher = new InMemoryDispatcher(app);
		this.schemas = new SchemaResolver(options);
		this.server = new McpServer(this.dispatcher, this.schemas, options.logging);
	}

	async init() {
		const routes = this.introspector.listRoutes(this.options);
		await this.server.loadRoutes(routes);
	}

	mount(path = this.options.mountPath ?? "/mcp") {
		this.server.mount(this.app, path);
	}

	async startStandalone({ port = 7878 }: { port?: number } = {}) {
		await this.server.listen(port);
	}

	listTools() {
		return this.server.listTools();
	}
}
