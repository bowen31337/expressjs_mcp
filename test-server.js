import express from 'express';
import { ExpressMCP } from './dist/index.js';

const app = express();
app.use(express.json());

// Test API routes for MCP
app.get('/api/users', (req, res) => {
  const users = [
    { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'developer' },
    { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'designer' },
    { id: 3, name: 'Carol Davis', email: 'carol@example.com', role: 'manager' }
  ];
  res.json(users);
});

app.post('/api/users', (req, res) => {
  const newUser = {
    id: Math.floor(Math.random() * 1000) + 4,
    ...req.body,
    createdAt: new Date().toISOString()
  };
  res.status(201).json(newUser);
});

app.get('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const users = [
    { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'developer', projects: ['ProjectA', 'ProjectB'] },
    { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'designer', projects: ['ProjectC'] },
    { id: 3, name: 'Carol Davis', email: 'carol@example.com', role: 'manager', projects: ['ProjectA', 'ProjectC'] }
  ];
  
  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

app.get('/api/projects', (req, res) => {
  const projects = [
    { id: 1, name: 'ProjectA', status: 'active', team: ['Alice', 'Carol'] },
    { id: 2, name: 'ProjectB', status: 'completed', team: ['Alice'] },
    { id: 3, name: 'ProjectC', status: 'in-progress', team: ['Bob', 'Carol'] }
  ];
  res.json(projects);
});

app.post('/api/tasks', (req, res) => {
  const task = {
    id: Math.floor(Math.random() * 1000) + 1,
    title: req.body.title || 'New Task',
    description: req.body.description || '',
    assignee: req.body.assignee || 'unassigned',
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  res.status(201).json(task);
});

// Add MCP support with schema annotations
const mcp = new ExpressMCP(app, { 
  mountPath: '/mcp',
  schemaAnnotations: {
    'GET /api/users': {
      description: 'Get all users in the system',
      output: { 
        type: 'array', 
        items: { 
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' }
          }
        }
      }
    },
    'POST /api/users': {
      description: 'Create a new user',
      input: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Full name of the user' },
          email: { type: 'string', description: 'Email address' },
          role: { type: 'string', description: 'User role (developer, designer, manager)' }
        },
        required: ['name', 'email']
      }
    },
    'GET /api/users/:id': {
      description: 'Get a specific user by ID',
      input: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'User ID' }
        }
      }
    },
    'GET /api/projects': {
      description: 'Get all projects',
      output: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            status: { type: 'string' },
            team: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    },
    'POST /api/tasks': {
      description: 'Create a new task',
      input: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Task title' },
          description: { type: 'string', description: 'Task description' },
          assignee: { type: 'string', description: 'Person assigned to the task' }
        },
        required: ['title']
      }
    }
  }
});

async function startServer() {
  await mcp.init();
  mcp.mount('/mcp');

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`🚀 Test Server running on http://localhost:${port}`);
    console.log(`📋 MCP tools: http://localhost:${port}/mcp/tools`);
    console.log(`🔗 MCP invoke: http://localhost:${port}/mcp/invoke`);
    console.log('\n🧪 Available API endpoints:');
    console.log('  GET /api/users - Get all users');
    console.log('  POST /api/users - Create new user');
    console.log('  GET /api/users/:id - Get user by ID');
    console.log('  GET /api/projects - Get all projects');
    console.log('  POST /api/tasks - Create new task');
    console.log('\n✅ Ready for MCP testing through Cursor chat!');
  });
}

startServer().catch(console.error);
