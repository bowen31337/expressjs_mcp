import express from "express";
import { ExpressMCP } from "../../src";

const app = express();
app.use(express.json());

app.get("/hello", (_req, res) => res.json({ message: "world" }));
app.post("/order", (req, res) =>
	res.status(201).json({ id: "o1", ...req.body }),
);

const mcp = new ExpressMCP(app, { mountPath: "/mcp" });
await mcp.init();
mcp.mount("/mcp");

app.listen(3000, () =>
	console.log("App on http://localhost:3000 → /mcp/tools, /mcp/invoke"),
);
