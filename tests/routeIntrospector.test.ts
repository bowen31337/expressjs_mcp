import express from "express";
import { describe, expect, it } from "vitest";
import { RouteIntrospector } from "../src/routeIntrospector";

describe("RouteIntrospector", () => {
	it("discovers routes and methods", () => {
		const app = express();
		app.get("/hello", (_req, res) => res.send("ok"));

		// Express lazily creates the router, so we need to trigger it
		// by calling app.handle or by accessing the internal router
		const router = (app as unknown as { _router?: unknown })._router;
		if (!router) {
			// Force router creation by calling lazyrouter
			(app as unknown as { lazyrouter: () => void }).lazyrouter();
		}

		const ri = new RouteIntrospector(app);
		const routes = ri.listRoutes();
		expect(routes.some((r) => r.method === "GET" && r.path === "/hello")).toBe(
			true,
		);
	});
});
