import type { Application } from "express";
import type { InMemoryDispatcher } from "./inMemoryDispatcher";
import type { RouteInfo } from "./index";
import type { SchemaResolver } from "./schemaResolver";

type Logger = {
	info: (...a: unknown[]) => void;
	error: (...a: unknown[]) => void;
};

export class McpServer {
	private routes: RouteInfo[] = [];
	private tools: unknown[] = [];
	constructor(
		private dispatcher: InMemoryDispatcher,
		private schemas: SchemaResolver,
		private log: Logger = console,
	) {}

	async loadRoutes(routes: RouteInfo[]) {
		this.routes = routes;
		this.tools = routes.map((r) => this.schemas.toTool(r));
	}

	listTools() {
		return this.tools;
	}

	mount(app: Application, basePath: string) {
		app.get(`${basePath}/tools`, (_req, res) =>
			res.json({ tools: this.tools }),
		);

		app.post(`${basePath}/invoke`, async (req, res) => {
			const { toolName, args, streaming, timeout } = req.body ?? {};
			const route = this.routes.find(
				(r) =>
					this.schemas.toolName(r) === toolName ||
					this.schemas.safeName(r) === toolName,
			);
			if (!route) return res.status(404).json({ error: "Tool not found" });

			try {
				if (streaming) {
					// Handle streaming response
					res.setHeader("Content-Type", "application/json");
					res.setHeader("Transfer-Encoding", "chunked");
					res.setHeader("Cache-Control", "no-cache");
					res.setHeader("Connection", "keep-alive");

					const stream = await this.dispatcher.dispatchStream(
						route.method,
						route.path,
						args,
						{},
						timeout,
					);

					stream.on("data", (chunk) => {
						const data = { type: "chunk", data: chunk.toString() };
						res.write(`${JSON.stringify(data)}\n`);
					});

					stream.on("end", () => {
						res.write(`${JSON.stringify({ type: "end" })}\n`);
						res.end();
					});

					stream.on("error", (error) => {
						const data = { type: "error", error: error.message };
						res.write(`${JSON.stringify(data)}\n`);
						res.end();
					});
				} else {
					// Regular non-streaming response
					const rsp = await this.dispatcher.dispatch(
						route.method,
						route.path,
						args,
						{},
						{ timeout },
					);

					if (rsp.isStreaming && rsp.stream) {
						// Handle unexpected streaming response
						const chunks: Buffer[] = [];
						rsp.stream.on("data", (chunk) => chunks.push(chunk));
						rsp.stream.on("end", () => {
							const body = Buffer.concat(chunks).toString();
							res.status(200).json({
								ok: true,
								result: body,
								status: rsp.status,
								streaming: true,
							});
						});
						rsp.stream.on("error", (error) => {
							this.log.error("Stream error:", error);
							res.status(500).json({
								ok: false,
								error: error.message,
							});
						});
					} else {
						res.status(200).json({
							ok: true,
							result: rsp.body,
							status: rsp.status,
						});
					}
				}
			} catch (e: unknown) {
				this.log.error("MCP invoke error", e);
				res.status(500).json({
					ok: false,
					error:
						e && typeof e === "object" && "message" in e
							? (e as { message: string }).message
							: "Unknown error",
				});
			}
		});
	}

	async listen(port: number) {
		const express = (await import("express")).default;
		const app = express();
		app.use(express.json());
		this.mount(app as Application, "/mcp");
		await new Promise<void>((r) => app.listen(port, () => r()));
		this.log.info(
			`MCP HTTP gateway listening on :${port} (paths: /mcp/tools, /mcp/invoke)`,
		);
	}
}
