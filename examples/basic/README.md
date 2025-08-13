# Basic Express MCP Example

A simple Express.js server demonstrating core Express MCP integration with basic CRUD operations.

## 🎯 **What This Example Demonstrates**

- ✅ Basic Express MCP setup and configuration
- ✅ RESTful API endpoints (GET, POST)
- ✅ Automatic tool discovery and schema generation
- ✅ MCP client integration
- ✅ Simple user management operations

## 🚀 **Quick Start**

### 1. Start the Server

```bash
# From the basic example directory
cd examples/basic

# Start with TypeScript (recommended)
npx tsx server.ts

# Or compile and run JavaScript
npx tsc server.ts && node server.js
```

Expected output:
```
🚀 Server running on http://localhost:3000
📊 MCP tools: http://localhost:3000/mcp/tools
🔗 MCP invoke: http://localhost:3000/mcp/invoke
```

### 2. Test the API Endpoints

```bash
# Get all users
curl http://localhost:3000/api/users

# Create a new user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Smith", "email": "alice@example.com"}'

# Get users again to see the new user
curl http://localhost:3000/api/users
```

### 3. Test MCP Integration

```bash
# List available MCP tools
curl http://localhost:3000/mcp/tools

# Invoke a tool via MCP
curl -X POST http://localhost:3000/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{"toolName": "GET /api/users", "args": {}}'

# Create user via MCP
curl -X POST http://localhost:3000/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{"toolName": "POST /api/users", "args": {"name": "Bob Johnson", "email": "bob@example.com"}}'
```

## 🔧 **MCP Client Configuration**

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "express-basic-example": {
      "command": "node",
      "args": ["/path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs"],
      "env": {
        "EXPRESS_MCP_URL": "http://localhost:3000/mcp",
        "DEBUG": "false"
      }
    }
  }
}
```

**Note**: Replace `/path/to/your/expressjs_mcp` with your actual project path.

### Cursor IDE

Add to `.cursor-settings/settings.json`:

```json
{
  "mcp.servers": {
    "express-basic-example": {
      "command": "node",
      "args": ["/path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs"],
      "env": {
        "EXPRESS_MCP_URL": "http://localhost:3000/mcp",
        "DEBUG": "false"
      }
    }
  }
}
```

**Note**: Replace `/path/to/your/expressjs_mcp` with your actual project path.

### Manual MCP Bridge Testing

```bash
# Test the MCP bridge directly
node /path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs

# Send a test request (in another terminal)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | \
  node /path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs
```

**Note**: Replace `/path/to/your/expressjs_mcp` with your actual project path.

## 📋 **Available API Endpoints**

| Method | Endpoint | Description | MCP Tool Name |
|--------|----------|-------------|---------------|
| `GET` | `/api/users` | Get all users | `GET /api/users` |
| `POST` | `/api/users` | Create a new user | `POST /api/users` |

### API Schemas

#### GET /api/users
- **Input**: None
- **Output**: Array of user objects
```json
[
  {
    "id": 1,
    "name": "Alice Smith",
    "email": "alice@example.com"
  }
]
```

#### POST /api/users
- **Input**: User object (name and email required)
```json
{
  "name": "John Doe",
  "email": "john@example.com"
}
```
- **Output**: Created user object with ID
```json
{
  "id": 2,
  "name": "John Doe",
  "email": "john@example.com"
}
```

## 🧪 **Testing with MCP Clients**

### Using Claude Desktop

1. **Start the server**: `npx tsx server.ts`
2. **Configure Claude** with the MCP server settings above
3. **Restart Claude Desktop**
4. **Test with prompts**:
   - "What tools are available?"
   - "Get the list of users from the API"
   - "Create a new user named Sarah with email sarah@example.com"
   - "Show me all users again"

### Using Cursor IDE

1. **Start the server**: `npx tsx server.ts`
2. **Configure Cursor** with the MCP server settings above
3. **Restart Cursor**
4. **Use the command palette**: Cmd/Ctrl + Shift + P → "MCP"
5. **Test tool invocation** through the MCP interface

## 🔍 **Code Walkthrough**

### Server Setup (`server.ts`)

```typescript
import express from "express";
import { ExpressMCP } from "../../src";

const app = express();
app.use(express.json());

// In-memory user storage
let users: Array<{ id: number; name: string; email: string }> = [];
let nextId = 1;

// API Routes
app.get("/api/users", (req, res) => {
  res.json(users);
});

app.post("/api/users", (req, res) => {
  const { name, email } = req.body;
  const user = { id: nextId++, name, email };
  users.push(user);
  res.status(201).json(user);
});

// Express MCP Integration
const mcp = new ExpressMCP(app, { mountPath: "/mcp" });
await mcp.init();
mcp.mount("/mcp");

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📊 MCP tools: http://localhost:${port}/mcp/tools`);
  console.log(`🔗 MCP invoke: http://localhost:${port}/mcp/invoke`);
});
```

### Key Features

1. **Automatic Tool Discovery**: Express MCP automatically discovers your API routes
2. **Schema Generation**: Infers input/output schemas from your route handlers
3. **Zero Configuration**: Works out of the box with minimal setup
4. **Standard Express**: Uses regular Express.js patterns and middleware

## 🎯 **Customization Ideas**

### Add Authentication

```typescript
// Add authentication middleware
app.use('/api', (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  // Verify token logic here
  next();
});
```

### Add Validation

```typescript
import { z } from 'zod';

// Define schema with Zod
const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email()
});

app.post("/api/users", (req, res) => {
  try {
    const userData = userSchema.parse(req.body);
    const user = { id: nextId++, ...userData };
    users.push(user);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: 'Invalid user data' });
  }
});
```

### Add Database Integration

```typescript
// Replace in-memory storage with database
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

app.get("/api/users", async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

app.post("/api/users", async (req, res) => {
  const user = await prisma.user.create({
    data: req.body
  });
  res.status(201).json(user);
});
```

## 🚨 **Troubleshooting**

### Server Won't Start
```bash
# Check if port is in use
lsof -i :3000

# Use different port
PORT=3001 npx tsx server.ts
```

### MCP Tools Not Appearing
```bash
# Verify tools endpoint
curl http://localhost:3000/mcp/tools

# Check server logs for errors
DEBUG=expressjs-mcp npx tsx server.ts
```

### MCP Bridge Connection Issues
```bash
# Test bridge manually
node /path/to/your/expressjs_mcp/bin/express-mcp.cjs test --url http://localhost:3000/mcp

# Enable debug logging
DEBUG=1 node /path/to/your/expressjs_mcp/scripts/mcp-bridge.cjs
```

**Note**: Replace `/path/to/your/expressjs_mcp` with your actual project path.

## 📚 **Next Steps**

1. **Explore the streaming example** for advanced features
2. **Add your own API endpoints** and see them automatically become MCP tools
3. **Integrate with your existing Express application**
4. **Add authentication and authorization**
5. **Deploy to production** with proper error handling

## 🔗 **Related Documentation**

- [Express MCP Overview](../../README.md)
- [Streaming Example](../streaming/README.md)
- [MCP Client Setup](../../docs/MCP_CLIENT_SETUP.md)
- [Quick Setup Guide](../../docs/QUICK_MCP_SETUP.md)

Happy coding! 🚀
