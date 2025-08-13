import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { ExpressMCP } from "../src";

describe("MCP HTTP gateway", () => {
	it("lists tools and invokes a tool", async () => {
		const app = express();
		app.use(express.json());
		app.post("/echo", (req, res) => res.json({ youSent: req.body }));

		const mcp = new ExpressMCP(app, { mountPath: "/mcp" });
		await mcp.init();
		mcp.mount("/mcp");

		const agent = request(app);

		const toolsRsp = await agent.get("/mcp/tools").expect(200);
		const tool = toolsRsp.body.tools.find((t: { name: string }) =>
			t.name.includes("POST_/echo"),
		);
		expect(tool).toBeTruthy();

		const invokeRsp = await agent
			.post("/mcp/invoke")
			.send({
				toolName: tool.name,
				args: { hello: "world" },
			})
			.expect(200);

		expect(invokeRsp.body.ok).toBe(true);
		expect(invokeRsp.body.result).toEqual({ youSent: { hello: "world" } });
	});
});
