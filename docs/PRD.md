# express_mcp — PRD

- Goal: Expose existing `express` endpoints as MCP tools with minimal config, preserving schemas/docs and reusing existing middleware for auth, inspired by FastAPI-MCP.
- Reference: tadata-org/fastapi_mcp (parity in approach, not a mere OpenAPI→MCP converter).

Personas
- Backend Engineer: Add MCP to existing Express app with zero/low refactor.
- AI/Tooling Engineer: Needs tool discovery and stable schemas for function calling.

Key Requirements
- Mount mode: `mcp.mount(app, '/mcp')`.
- Standalone HTTP gateway: `mcp.startStandalone({ port })`.
- Route discovery: Walk `app._router.stack` (incl. nested routers).
- Schema preservation:
  - Prefer OpenAPI v3 if provided.
  - Per-route annotations (zod/JSON Schema).
  - Fallback inference to permissive object.
- Auth bridging: Use existing middleware chain during dispatch.
- In-process transport: Synthetic req/res through middleware and handler (no HTTP).
- Observability: Structured logs and error mapping.

Non-Goals
- Not a generic OpenAPI→MCP-only generator.
- No framework migration.

Acceptance Criteria
- Mount and standalone gateway work.
- Tools reflect schemas from OpenAPI/annotations when present.
- Auth middleware enforces 401/403 as in HTTP.
- 90%+ unit coverage on core modules (discovery, dispatch, schemas, gateway).

Reference
- FastAPI-MCP: https://github.com/tadata-org/fastapi_mcp
