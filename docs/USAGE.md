# Usage

Install
- pnpm i
- pnpm build

Mount mode
```ts
import { ExpressMCP } from 'express-mcp';
const mcp = new ExpressMCP(app, { mountPath: '/mcp', openapi }); // openapi optional
await mcp.init();
mcp.mount('/mcp');
// GET /mcp/tools → list; POST /mcp/invoke → { toolName, args }
```

Standalone HTTP gateway
```ts
const mcp = new ExpressMCP(app);
await mcp.init();
await mcp.startStandalone({ port: 7878 });
```

Per-route annotations (zod)
```ts
import { z } from 'zod';
const schemaAnnotations = {
  'POST /order': {
    description: 'Create order',
    input: z.object({ productId: z.string(), qty: z.number().int().positive().default(1) }),
    output: z.object({ id: z.string(), productId: z.string(), qty: z.number().int() })
  }
};
const mcp = new ExpressMCP(app, { schemaAnnotations });
```

Tool naming
- `title`: `"METHOD /path"`, `name`: `"METHOD_/path"` (spaces replaced with `_`).
