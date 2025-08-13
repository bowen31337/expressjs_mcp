import { PassThrough, Readable } from "node:stream";
import type { Application, RequestHandler } from "express";

export class InMemoryDispatcher {
	constructor(private app: Application) {}

	async dispatch(
		method: string,
		path: string,
		payload: unknown,
		headers: Record<string, string> = {},
		options: { streaming?: boolean; timeout?: number } = {},
	) {
		return new Promise<{
			status: number;
			headers: Record<string, string>;
			body: unknown;
			stream?: NodeJS.ReadableStream;
			isStreaming?: boolean;
		}>((resolve, reject) => {
			const req = new Readable({ read() {} }) as unknown as {
				method: string;
				url: string;
				headers: Record<string, string>;
				push: (chunk: string | null) => void;
				body?: unknown;
			};
			req.method = method;
			req.url = path;
			req.headers = { "content-type": "application/json", ...headers };

			// For JSON payloads, we need to both set the body and push the data
			if (payload !== undefined) {
				const jsonStr = JSON.stringify(payload);
				req.body = payload; // Set body directly for middleware that expects it
				req.push(jsonStr);
			}
			req.push(null);

			// Create streaming response handler
			const streamBuffer = new PassThrough();
			let isStreamingResponse = false;
			let hasEnded = false;

			const res: {
				statusCode: number;
				headers: Record<string, string>;
				setHeader: (k: string, v: string) => void;
				getHeader: (k: string) => string | undefined;
				writeHead: (code: number, headers?: Record<string, string>) => void;
				bodyChunks: Buffer[];
				write: (chunk: unknown) => boolean;
				end: (chunk?: unknown) => void;
			} = {
				statusCode: 200,
				headers: {} as Record<string, string>,
				setHeader(k: string, v: string) {
					this.headers[k.toLowerCase()] = String(v);
				},
				getHeader(k: string) {
					return this.headers[k.toLowerCase()];
				},
				writeHead(code: number, headers?: Record<string, string>) {
					this.statusCode = code;
					if (headers) {
						for (const [k, v] of Object.entries(headers)) {
							this.setHeader(k, String(v));
						}
					}
				},
				bodyChunks: [] as Buffer[],
				write(chunk: unknown) {
					if (hasEnded) return false;

					const buffer = Buffer.isBuffer(chunk)
						? chunk
						: Buffer.from(String(chunk));

					// Enhanced streaming detection for multiple protocols
					const isStreamingContent =
						options.streaming ||
						// Server-Sent Events
						this.headers["content-type"] === "text/event-stream" ||
						// Plain text streaming
						this.headers["content-type"] === "text/plain" ||
						// Binary streaming
						this.headers["content-type"] === "application/octet-stream" ||
						// Chunked transfer encoding
						this.headers["transfer-encoding"] === "chunked" ||
						// WebSocket upgrade
						this.headers.upgrade === "websocket" ||
						// NDJSON streaming
						this.headers["content-type"] === "application/x-ndjson" ||
						this.headers["content-type"] === "application/jsonlines" ||
						// Custom streaming indicators
						this.headers["x-streaming"] === "true" ||
						this.headers["x-content-stream"] === "true";

					if (isStreamingContent) {
						isStreamingResponse = true;
						streamBuffer.write(buffer);
					} else {
						this.bodyChunks.push(buffer);
					}
					return true;
				},
				end(chunk?: unknown) {
					if (hasEnded) return;
					hasEnded = true;

					// If chunk is provided to end(), treat it as a write call first
					if (chunk) {
						const buffer = Buffer.isBuffer(chunk)
							? chunk
							: Buffer.from(String(chunk));

						// Enhanced streaming detection (same as write method)
						const isStreamingContent =
							options.streaming ||
							// Server-Sent Events
							this.headers["content-type"] === "text/event-stream" ||
							// Plain text streaming
							this.headers["content-type"] === "text/plain" ||
							// Binary streaming
							this.headers["content-type"] === "application/octet-stream" ||
							// Chunked transfer encoding
							this.headers["transfer-encoding"] === "chunked" ||
							// WebSocket upgrade
							this.headers.upgrade === "websocket" ||
							// NDJSON streaming
							this.headers["content-type"] === "application/x-ndjson" ||
							this.headers["content-type"] === "application/jsonlines" ||
							// Custom streaming indicators
							this.headers["x-streaming"] === "true" ||
							this.headers["x-content-stream"] === "true";

						if (isStreamingContent) {
							isStreamingResponse = true;
							streamBuffer.write(buffer);
						} else {
							this.bodyChunks.push(buffer);
						}
					}

					if (isStreamingResponse) {
						streamBuffer.end();
						resolve({
							status: this.statusCode,
							headers: this.headers,
							body: null,
							stream: streamBuffer,
							isStreaming: true,
						});
					} else {
						const bodyStr = Buffer.concat(this.bodyChunks).toString("utf8");
						let body: unknown = bodyStr;
						try {
							body = JSON.parse(bodyStr);
						} catch (e) {
							// If JSON parsing fails, return the raw string
							body = bodyStr;
						}
						resolve({
							status: this.statusCode,
							headers: this.headers,
							body,
							isStreaming: false,
						});
					}
				},
			};

			// Set timeout if specified
			const timeout = options.timeout || 30000;
			const timeoutId = setTimeout(() => {
				if (!hasEnded) {
					hasEnded = true;
					reject(new Error(`Request timeout after ${timeout}ms`));
				}
			}, timeout);

			try {
				(this.app as unknown as RequestHandler)(
					req as never,
					res as never,
					(err: unknown) => {
						clearTimeout(timeoutId);
						if (err) {
							reject(err);
						} else if (!hasEnded) {
							// If no response was sent, resolve with empty response
							hasEnded = true;
							resolve({
								status: res.statusCode,
								headers: res.headers,
								body: undefined,
								isStreaming: false,
							});
						}
					},
				);
			} catch (e) {
				clearTimeout(timeoutId);
				reject(e);
			}
		});
	}

	// Helper method for streaming responses
	async dispatchStream(
		method: string,
		path: string,
		payload: unknown,
		headers: Record<string, string> = {},
		timeout?: number,
	): Promise<NodeJS.ReadableStream> {
		const result = await this.dispatch(method, path, payload, headers, {
			streaming: true,
			timeout,
		});

		if (result.stream) {
			return result.stream;
		}

		// If not streaming, convert body to stream
		const stream = new Readable({
			read() {
				this.push(
					typeof result.body === "string"
						? result.body
						: JSON.stringify(result.body),
				);
				this.push(null);
			},
		});

		return stream;
	}
}
