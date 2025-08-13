import type { Application } from "express";
import type { ExpressMCPOptions, RouteInfo } from "./index";

export class RouteIntrospector {
	constructor(private app: Application) {}

	listRoutes(options?: ExpressMCPOptions): RouteInfo[] {
		const router: unknown = (this.app as unknown)._router;
		if (!router || !("stack" in router)) {
			return [];
		}
		const routes: RouteInfo[] = [];
		const push = (path: string, route: unknown) => {
			if (
				!route ||
				typeof route !== "object" ||
				!("stack" in route) ||
				!("methods" in route)
			) {
				return;
			}
			const stack = (route as { stack?: unknown[] }).stack || [];
			const handlers = stack
				.map((s: unknown) =>
					s && typeof s === "object" && "handle" in s
						? (s as { handle: unknown }).handle
						: null,
				)
				.filter(Boolean);
			const handler = handlers[handlers.length - 1] as (
				...args: unknown[]
			) => unknown;
			const middlewares = handlers.slice(0, -1) as ((
				...args: unknown[]
			) => unknown)[];
			const methods = (route as { methods: Record<string, boolean> }).methods;
			for (const method of Object.keys(methods)) {
				const info = {
					method: method.toUpperCase(),
					path,
					middlewares,
					handler,
				};
				if (options?.include && !options.include(info)) continue;
				if (options?.exclude?.(info)) continue;
				routes.push(info);
			}
		};

		for (const layer of (router as { stack: unknown[] }).stack) {
			const layerObj = layer as {
				route?: unknown;
				name?: string;
				handle?: { stack?: unknown[] };
			};
			// Check if this layer has a route directly
			if (layerObj.route) {
				const route = layerObj.route as { path: string };
				push(route.path, layerObj.route);
			}
			// Check if this is a nested router
			else if (layerObj.name === "router" && layerObj.handle?.stack) {
				for (const sub of layerObj.handle.stack) {
					const subObj = sub as { route?: unknown };
					if (subObj.route) {
						const subRoute = subObj.route as { path: string };
						push(subRoute.path, subObj.route);
					}
				}
			}
		}
		return routes;
	}
}
