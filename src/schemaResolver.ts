import type { RouteInfo } from "./index";

type OpenAPI = Record<string, unknown>;

export class SchemaResolver {
	constructor(
		private options: {
			openapi?: Record<string, unknown>;
			schemaAnnotations?: Record<string, unknown>;
		} = {},
	) {}

	toolName(r: RouteInfo) {
		return `${r.method} ${r.path}`;
	}
	safeName(r: RouteInfo) {
		return this.toolName(r).replace(/\s+/g, "_");
	}

	toTool(r: RouteInfo) {
		const key = this.toolName(r);
		const ann = this.options?.schemaAnnotations?.[key] ?? {};
		const open = this.findOpenApiSchemas(r);

		return {
			name: this.safeName(r),
			title: key,
			description:
				ann.description ?? open.description ?? `Invoke ${r.method} ${r.path}`,
			inputSchema: ann.input
				? this.zodToJsonSchema(ann.input)
				: (open.inputSchema ?? { type: "object", additionalProperties: true }),
			outputSchema: ann.output
				? this.zodToJsonSchema(ann.output)
				: (open.outputSchema ?? { type: "object", additionalProperties: true }),
			examples: ann.examples ?? open.examples ?? [],
			route: { method: r.method, path: r.path },
		};
	}

	mergeEnrichment(_: RouteInfo, __: Partial<Record<string, unknown>>) {
		// No-op for now; reserved for future enrichers (e.g., manual docs).
	}

	private findOpenApiSchemas(r: RouteInfo) {
		const result: {
			inputSchema?: unknown;
			outputSchema?: unknown;
			description?: string;
			examples?: unknown[];
		} = {};
		const doc = this.options.openapi as Record<string, unknown>;
		if (!doc?.paths) return result;
		const pathItem = doc.paths[r.path];
		if (!pathItem) return result;
		const op = pathItem[r.method.toLowerCase()];
		if (!op) return result;

		result.description = op.summary || op.description;

		// requestBody
		const rb = op.requestBody?.content;
		if (rb) {
			const json = rb["application/json"]?.schema;
			if (json) result.inputSchema = json;
		}

		// responses: prefer 200/201 json
		const res = op.responses;
		const preferred = res?.["200"] ?? res?.["201"];
		const content = preferred?.content;
		if (content) {
			const json = content["application/json"]?.schema;
			if (json) result.outputSchema = json;
		}

		// examples (best effort)
		const exIn = rb?.["application/json"]?.examples;
		const exOut = content?.["application/json"]?.examples;
		const toArr = (ex: unknown) =>
			ex && typeof ex === "object" && ex !== null
				? Object.values(ex)
						.map((e: unknown) =>
							e && typeof e === "object" && "value" in e
								? (e as { value: unknown }).value
								: null,
						)
						.filter(Boolean)
				: [];
		result.examples = [...toArr(exIn), ...toArr(exOut)];

		return result;
	}

	private zodToJsonSchema(z: unknown) {
		try {
			if (z && "parse" in z) {
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				const { zodToJsonSchema } = require("zod-to-json-schema");
				return zodToJsonSchema(z);
			}
			return z;
		} catch {
			return { type: "object" };
		}
	}
}
