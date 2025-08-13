# Architecture

Modules
- `ExpressMCP`: Facade to init, mount, run standalone, list tools.
- `RouteIntrospector`: Extract routes/methods/middlewares/handlers from `express` app.
- `InMemoryDispatcher`: Synthetic `req`/`res` to execute the same middleware chain and handler without HTTP.
- `SchemaResolver`: Build tool schemas from OpenAPI v3 or per-route annotations; fallback to permissive object.
- `McpServer`: Tool registry plus HTTP gateway `/mcp/tools` and `/mcp/invoke`.

Flow
1. `init()`: discover routes → build tool metadata (name/title/description/schemas).
2. `mount('/mcp')`: expose gateway for tool discovery and invocation.
3. Invocation: map toolName → dispatch(method, path, args) → return response body and status.

Parity with FastAPI-MCP
- Minimal setup in existing app.
- Preserves docs/schemas where available.
- Uses in-process dispatch for speed and fidelity (similar to ASGI transport claim in FastAPI-MCP).

Notes
- For multipart/files, add specialized handling in `InMemoryDispatcher` and `SchemaResolver`.
- For OpenAPI, supply your spec via `openapi` option for best schemas.
