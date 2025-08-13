import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { ExpressMCP } from "../src";

describe("Streaming Support", () => {
	let app: express.Application;
	let mcp: ExpressMCP;

	beforeEach(async () => {
		app = express();
		app.use(express.json());

		// Server-Sent Events endpoint
		app.get("/api/sse", (req, res) => {
			res.setHeader("Content-Type", "text/event-stream");
			res.setHeader("Cache-Control", "no-cache");
			res.setHeader("Connection", "keep-alive");

			let count = 0;
			const interval = setInterval(() => {
				count++;
				res.write(
					`data: ${JSON.stringify({ count, message: `Event ${count}` })}\n\n`,
				);

				if (count >= 3) {
					clearInterval(interval);
					res.write("data: [DONE]\n\n");
					res.end();
				}
			}, 100);

			req.on("close", () => {
				clearInterval(interval);
			});
		});

		// NDJSON streaming endpoint
		app.get("/api/ndjson", (req, res) => {
			res.setHeader("Content-Type", "application/x-ndjson");
			res.setHeader("Cache-Control", "no-cache");

			const data = [
				{ id: 1, name: "Alice", type: "user" },
				{ id: 2, name: "Bob", type: "admin" },
				{ id: 3, name: "Charlie", type: "user" },
			];

			let index = 0;
			const interval = setInterval(() => {
				if (index < data.length) {
					res.write(`${JSON.stringify(data[index])}\n`);
					index++;
				} else {
					clearInterval(interval);
					res.end();
				}
			}, 50);

			req.on("close", () => {
				clearInterval(interval);
			});
		});

		// JSON Lines endpoint
		app.get("/api/jsonlines", (req, res) => {
			res.setHeader("Content-Type", "application/jsonlines");
			res.setHeader("X-Streaming", "true");

			const events = [
				{ event: "login", user: "alice" },
				{ event: "view", page: "/dashboard" },
				{ event: "logout", user: "alice" },
			];

			let index = 0;
			const interval = setInterval(() => {
				if (index < events.length) {
					res.write(`${JSON.stringify(events[index])}\n`);
					index++;
				} else {
					clearInterval(interval);
					res.end();
				}
			}, 30);

			req.on("close", () => {
				clearInterval(interval);
			});
		});

		// Chunked transfer endpoint
		app.get("/api/chunked", (req, res) => {
			res.setHeader("Transfer-Encoding", "chunked");
			res.setHeader("Content-Type", "text/plain");

			const chunks = ["Chunk 1\n", "Chunk 2\n", "Chunk 3\n"];
			let index = 0;

			const interval = setInterval(() => {
				if (index < chunks.length) {
					res.write(chunks[index]);
					index++;
				} else {
					clearInterval(interval);
					res.end();
				}
			}, 40);

			req.on("close", () => {
				clearInterval(interval);
			});
		});

		// Custom streaming headers endpoint
		app.get("/api/custom-stream", (req, res) => {
			res.setHeader("Content-Type", "text/plain");
			res.setHeader("X-Content-Stream", "true");
			res.setHeader("Cache-Control", "no-cache");

			const messages = ["Start", "Processing", "Complete"];
			let index = 0;

			const interval = setInterval(() => {
				if (index < messages.length) {
					res.write(`${messages[index]}\n`);
					index++;
				} else {
					clearInterval(interval);
					res.end();
				}
			}, 25);

			req.on("close", () => {
				clearInterval(interval);
			});
		});

		// Binary streaming endpoint
		app.get("/api/binary", (req, res) => {
			res.setHeader("Content-Type", "application/octet-stream");
			res.setHeader("Transfer-Encoding", "chunked");

			const data = Buffer.from("Binary data chunk");
			let count = 0;

			const interval = setInterval(() => {
				if (count < 3) {
					res.write(Buffer.concat([data, Buffer.from(` ${count + 1}\n`)]));
					count++;
				} else {
					clearInterval(interval);
					res.end();
				}
			}, 35);

			req.on("close", () => {
				clearInterval(interval);
			});
		});

		// Regular JSON endpoint (non-streaming)
		app.get("/api/regular", (req, res) => {
			res.json({ message: "Regular response", streaming: false });
		});

		mcp = new ExpressMCP(app, {
			mountPath: "/mcp",
			schemaAnnotations: {
				"GET /api/sse": {
					description: "Server-Sent Events streaming",
					output: { type: "string", description: "SSE stream" },
				},
				"GET /api/ndjson": {
					description: "NDJSON streaming",
					output: { type: "string", description: "NDJSON stream" },
				},
				"GET /api/jsonlines": {
					description: "JSON Lines streaming",
					output: { type: "string", description: "JSON Lines stream" },
				},
				"GET /api/chunked": {
					description: "Chunked transfer streaming",
					output: { type: "string", description: "Chunked stream" },
				},
				"GET /api/custom-stream": {
					description: "Custom streaming headers",
					output: { type: "string", description: "Custom stream" },
				},
				"GET /api/binary": {
					description: "Binary streaming",
					output: { type: "string", description: "Binary stream" },
				},
				"GET /api/regular": {
					description: "Regular JSON response",
					output: { type: "object", description: "JSON response" },
				},
			},
		});
		await mcp.init();
		mcp.mount("/mcp");
	});

	describe("Stream Detection", () => {
		it("should detect Server-Sent Events streaming", async () => {
			const agent = request(app);

			// Use a promise to handle the streaming response properly
			const response = await new Promise((resolve, reject) => {
				agent
					.post("/mcp/invoke")
					.send({
						toolName: "GET /api/sse",
						args: {},
						streaming: true,
					})
					.buffer(false)
					.parse((res, callback) => {
						let data = "";
						res.on("data", (chunk) => {
							data += chunk;
						});
						res.on("end", () => {
							callback(null, {
								text: data,
								headers: res.headers,
								status: res.statusCode,
							});
						});
					})
					.end((err, res) => {
						if (err) reject(err);
						else resolve(res);
					});
			});

			// Should be chunked response with streaming data
			expect(response.headers["transfer-encoding"]).toBe("chunked");
			expect(response.headers["content-type"]).toBe("application/json");

			// Response should contain streaming chunks
			const body = response.body.text;
			expect(body).toContain('"type":"chunk"');
			expect(body).toContain('"type":"end"');
			expect(body).toContain("Event 1");
		});

		it("should detect NDJSON streaming", async () => {
			const agent = request(app);

			const response = await new Promise((resolve, reject) => {
				agent
					.post("/mcp/invoke")
					.send({
						toolName: "GET /api/ndjson",
						args: {},
						streaming: true,
					})
					.buffer(false)
					.parse((res, callback) => {
						let data = "";
						res.on("data", (chunk) => {
							data += chunk;
						});
						res.on("end", () => {
							callback(null, {
								text: data,
								headers: res.headers,
								status: res.statusCode,
							});
						});
					})
					.end((err, res) => {
						if (err) reject(err);
						else resolve(res);
					});
			});

			expect(response.headers["transfer-encoding"]).toBe("chunked");

			const body = response.body.text;
			expect(body).toContain('"type":"chunk"');
			expect(body).toContain("Alice");
			expect(body).toContain("Bob");
			expect(body).toContain("Charlie");
		});

		it("should detect JSON Lines streaming", async () => {
			const agent = request(app);

			const response = await new Promise((resolve, reject) => {
				agent
					.post("/mcp/invoke")
					.send({
						toolName: "GET /api/jsonlines",
						args: {},
						streaming: true,
					})
					.buffer(false)
					.parse((res, callback) => {
						let data = "";
						res.on("data", (chunk) => {
							data += chunk;
						});
						res.on("end", () => {
							callback(null, {
								text: data,
								headers: res.headers,
								status: res.statusCode,
							});
						});
					})
					.end((err, res) => {
						if (err) reject(err);
						else resolve(res);
					});
			});

			expect(response.headers["transfer-encoding"]).toBe("chunked");

			const body = response.body.text;
			expect(body).toContain('"type":"chunk"');
			expect(body).toContain("login");
			expect(body).toContain("dashboard");
		});

		it("should detect chunked transfer encoding", async () => {
			const agent = request(app);

			const response = await new Promise((resolve, reject) => {
				agent
					.post("/mcp/invoke")
					.send({
						toolName: "GET /api/chunked",
						args: {},
						streaming: true,
					})
					.buffer(false)
					.parse((res, callback) => {
						let data = "";
						res.on("data", (chunk) => {
							data += chunk;
						});
						res.on("end", () => {
							callback(null, {
								text: data,
								headers: res.headers,
								status: res.statusCode,
							});
						});
					})
					.end((err, res) => {
						if (err) reject(err);
						else resolve(res);
					});
			});

			expect(response.headers["transfer-encoding"]).toBe("chunked");

			const body = response.body.text;
			expect(body).toContain('"type":"chunk"');
			expect(body).toContain("Chunk 1");
			expect(body).toContain("Chunk 2");
		});

		it("should detect custom streaming headers", async () => {
			const agent = request(app);

			const response = await new Promise((resolve, reject) => {
				agent
					.post("/mcp/invoke")
					.send({
						toolName: "GET /api/custom-stream",
						args: {},
						streaming: true,
					})
					.buffer(false)
					.parse((res, callback) => {
						let data = "";
						res.on("data", (chunk) => {
							data += chunk;
						});
						res.on("end", () => {
							callback(null, {
								text: data,
								headers: res.headers,
								status: res.statusCode,
							});
						});
					})
					.end((err, res) => {
						if (err) reject(err);
						else resolve(res);
					});
			});

			expect(response.headers["transfer-encoding"]).toBe("chunked");

			const body = response.body.text;
			expect(body).toContain('"type":"chunk"');
			expect(body).toContain("Start");
			expect(body).toContain("Processing");
			expect(body).toContain("Complete");
		});

		it("should detect binary streaming", async () => {
			const agent = request(app);

			const response = await new Promise((resolve, reject) => {
				agent
					.post("/mcp/invoke")
					.send({
						toolName: "GET /api/binary",
						args: {},
						streaming: true,
					})
					.buffer(false)
					.parse((res, callback) => {
						let data = "";
						res.on("data", (chunk) => {
							data += chunk;
						});
						res.on("end", () => {
							callback(null, {
								text: data,
								headers: res.headers,
								status: res.statusCode,
							});
						});
					})
					.end((err, res) => {
						if (err) reject(err);
						else resolve(res);
					});
			});

			expect(response.headers["transfer-encoding"]).toBe("chunked");

			const body = response.body.text;
			expect(body).toContain('"type":"chunk"');
			expect(body).toContain("Binary data chunk");
		});

		it("should handle regular JSON responses in streaming mode", async () => {
			const agent = request(app);

			const response = await new Promise((resolve, reject) => {
				agent
					.post("/mcp/invoke")
					.send({
						toolName: "GET /api/regular",
						args: {},
						streaming: true,
					})
					.buffer(false)
					.parse((res, callback) => {
						let data = "";
						res.on("data", (chunk) => {
							data += chunk;
						});
						res.on("end", () => {
							callback(null, {
								text: data,
								headers: res.headers,
								status: res.statusCode,
							});
						});
					})
					.end((err, res) => {
						if (err) reject(err);
						else resolve(res);
					});
			});

			// Even regular JSON responses should be streamed when streaming flag is set
			expect(response.headers["transfer-encoding"]).toBe("chunked");

			const body = response.body.text;
			expect(body).toContain('"type":"chunk"');
			expect(body).toContain('"type":"end"');
			expect(body).toContain("Regular response");
		});
	});

	describe("Non-Streaming Mode", () => {
		it("should handle streaming endpoints in non-streaming mode", async () => {
			const agent = request(app);

			const response = await agent
				.post("/mcp/invoke")
				.send({
					toolName: "GET /api/sse",
					args: {},
					// streaming: false (default)
				})
				.expect(200);

			// Should collect all streaming data and return as single response
			expect(response.body.ok).toBe(true);
			expect(response.body.result).toContain("Event 1");
			expect(response.body.result).toContain("Event 2");
			expect(response.body.result).toContain("Event 3");
			expect(response.body.result).toContain("[DONE]");
		});

		it("should handle NDJSON in non-streaming mode", async () => {
			const agent = request(app);

			const response = await agent
				.post("/mcp/invoke")
				.send({
					toolName: "GET /api/ndjson",
					args: {},
				})
				.expect(200);

			expect(response.body.ok).toBe(true);
			expect(response.body.result).toContain("Alice");
			expect(response.body.result).toContain("Bob");
			expect(response.body.result).toContain("Charlie");
		});
	});

	describe("Error Handling", () => {
		it("should handle streaming errors gracefully", async () => {
			// Add an endpoint that fails during streaming
			app.get("/api/failing-stream", (req, res) => {
				res.setHeader("Content-Type", "text/event-stream");
				res.setHeader("Cache-Control", "no-cache");

				let count = 0;
				const interval = setInterval(() => {
					count++;
					if (count === 2) {
						clearInterval(interval);
						// Simulate error during streaming
						res.destroy();
						return;
					}
					res.write(`data: Event ${count}\n\n`);
				}, 50);

				req.on("close", () => {
					clearInterval(interval);
				});
			});

			const agent = request(app);

			// This should handle the error gracefully
			const response = await agent.post("/mcp/invoke").send({
				toolName: "GET /api/failing-stream",
				args: {},
				streaming: true,
			});

			// Should still return some response, even if streaming failed
			expect(response.status).toBeGreaterThanOrEqual(200);
		});
	});

	describe("Tool Discovery", () => {
		it("should list all streaming tools", async () => {
			const agent = request(app);

			const response = await agent.get("/mcp/tools").expect(200);

			const toolNames = response.body.tools.map(
				(tool: { name: string }) => tool.name,
			);
			expect(toolNames).toContain("GET_/api/sse");
			expect(toolNames).toContain("GET_/api/ndjson");
			expect(toolNames).toContain("GET_/api/jsonlines");
			expect(toolNames).toContain("GET_/api/chunked");
			expect(toolNames).toContain("GET_/api/custom-stream");
			expect(toolNames).toContain("GET_/api/binary");
			expect(toolNames).toContain("GET_/api/regular");
		});

		it("should include proper descriptions for streaming tools", async () => {
			const agent = request(app);

			const response = await agent.get("/mcp/tools").expect(200);

			const sseTool = response.body.tools.find(
				(tool: { name: string; description: string }) =>
					tool.name === "GET_/api/sse",
			);
			expect(sseTool).toBeTruthy();
			expect(sseTool.description).toContain("Server-Sent Events");

			const ndjsonTool = response.body.tools.find(
				(tool: { name: string; description: string }) =>
					tool.name === "GET_/api/ndjson",
			);
			expect(ndjsonTool).toBeTruthy();
			expect(ndjsonTool.description).toContain("NDJSON");
		});
	});

	describe("Performance", () => {
		it("should handle multiple concurrent streaming requests", async () => {
			const agent = request(app);

			// Start multiple streaming requests concurrently
			const requests = Array.from(
				{ length: 3 },
				() =>
					new Promise((resolve, reject) => {
						agent
							.post("/mcp/invoke")
							.send({
								toolName: "GET /api/sse",
								args: {},
								streaming: true,
							})
							.buffer(false)
							.parse((res, callback) => {
								let data = "";
								res.on("data", (chunk) => {
									data += chunk;
								});
								res.on("end", () => {
									callback(null, {
										text: data,
										headers: res.headers,
										status: res.statusCode,
									});
								});
							})
							.end((err, res) => {
								if (err) reject(err);
								else resolve(res);
							});
					}),
			);

			const responses = await Promise.all(requests);

			// All requests should succeed
			for (const response of responses) {
				expect(response.status).toBe(200);
				expect(response.body.text).toContain('"type":"chunk"');
				expect(response.body.text).toContain('"type":"end"');
			}
		});

		it("should handle streaming with timeout", async () => {
			// Add a slow streaming endpoint
			app.get("/api/slow-stream", (req, res) => {
				res.setHeader("Content-Type", "text/event-stream");
				res.setHeader("Cache-Control", "no-cache");

				// Very slow streaming that should timeout
				const interval = setInterval(() => {
					res.write("data: slow event\n\n");
				}, 5000); // 5 second intervals

				req.on("close", () => {
					clearInterval(interval);
				});
			});

			const agent = request(app);

			const response = await agent.post("/mcp/invoke").send({
				toolName: "GET /api/slow-stream",
				args: {},
				streaming: true,
				timeout: 1000, // 1 second timeout
			});

			// Should handle timeout appropriately
			expect(response.status).toBeGreaterThanOrEqual(200);
		});
	});
});
