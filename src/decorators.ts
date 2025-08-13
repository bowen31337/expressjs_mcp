import "reflect-metadata";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { z } from "zod";

// Metadata keys for storing decorator information
const ROUTES_KEY = Symbol("routes");
const MIDDLEWARES_KEY = Symbol("middlewares");
const SCHEMA_KEY = Symbol("schema");

// Route metadata interface
export interface RouteMetadata {
  method: "get" | "post" | "put" | "delete" | "patch";
  path: string;
  propertyKey: string;
  descriptor: PropertyDescriptor;
  middlewares?: RequestHandler[];
  schema?: {
    body?: z.ZodSchema;
    query?: z.ZodSchema;
    params?: z.ZodSchema;
    response?: z.ZodSchema;
  };
  description?: string;
  summary?: string;
  tags?: string[];
  operationId?: string;
}

// Controller decorator
export function Controller(basePath = "") {
  return function <T extends new (...args: any[]) => any>(constructor: T) {
    Reflect.defineMetadata("basePath", basePath, constructor);
    return constructor;
  };
}

// HTTP method decorators
function createMethodDecorator(method: RouteMetadata["method"]) {
  return function (path = ""): MethodDecorator {
    return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
      const routes: RouteMetadata[] = Reflect.getMetadata(ROUTES_KEY, target) || [];
      const middlewares = Reflect.getMetadata(MIDDLEWARES_KEY, target, propertyKey) || [];
      const schema = Reflect.getMetadata(SCHEMA_KEY, target, propertyKey);
      
      routes.push({
        method,
        path,
        propertyKey: String(propertyKey),
        descriptor,
        middlewares,
        schema,
      });
      
      Reflect.defineMetadata(ROUTES_KEY, routes, target);
    };
  };
}

export const Get = createMethodDecorator("get");
export const Post = createMethodDecorator("post");
export const Put = createMethodDecorator("put");
export const Delete = createMethodDecorator("delete");
export const Patch = createMethodDecorator("patch");

// Middleware decorator
export function UseMiddleware(...middlewares: RequestHandler[]): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const existingMiddlewares = Reflect.getMetadata(MIDDLEWARES_KEY, target, propertyKey) || [];
    Reflect.defineMetadata(MIDDLEWARES_KEY, [...existingMiddlewares, ...middlewares], target, propertyKey);
    return descriptor;
  };
}

// Schema validation decorator
export function Schema(schema: {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
  response?: z.ZodSchema;
}): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(SCHEMA_KEY, schema, target, propertyKey);
    
    // Create validation middleware
    const originalMethod = descriptor.value;
    descriptor.value = async function (req: Request, res: Response, next: NextFunction) {
      try {
        // Validate request body
        if (schema.body) {
          const result = schema.body.safeParse(req.body);
          if (!result.success) {
            return res.status(400).json({
              error: "Validation error",
              details: result.error.format(),
            });
          }
          req.body = result.data;
        }
        
        // Validate query parameters
        if (schema.query) {
          const result = schema.query.safeParse(req.query);
          if (!result.success) {
            return res.status(400).json({
              error: "Query validation error",
              details: result.error.format(),
            });
          }
          req.query = result.data;
        }
        
        // Validate path parameters
        if (schema.params) {
          const result = schema.params.safeParse(req.params);
          if (!result.success) {
            return res.status(400).json({
              error: "Params validation error",
              details: result.error.format(),
            });
          }
          req.params = result.data;
        }
        
        // Call original method
        const response = await originalMethod.call(this, req, res, next);
        
        // Validate response if schema is provided
        if (schema.response && response !== undefined) {
          const result = schema.response.safeParse(response);
          if (!result.success) {
            console.error("Response validation error:", result.error.format());
            return res.status(500).json({
              error: "Internal server error",
              message: "Response validation failed",
            });
          }
          return res.json(result.data);
        }
        
        return response;
      } catch (error) {
        next(error);
      }
    };
    
    return descriptor;
  };
}

// API documentation decorators
export function ApiOperation(options: {
  summary?: string;
  description?: string;
  tags?: string[];
  operationId?: string;
}): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const routes: RouteMetadata[] = Reflect.getMetadata(ROUTES_KEY, target) || [];
    const route = routes.find(r => r.propertyKey === String(propertyKey));
    
    if (route) {
      Object.assign(route, options);
    }
    
    return descriptor;
  };
}

// Helper to extract routes from a controller class
export function getControllerMetadata(controller: any): {
  basePath: string;
  routes: RouteMetadata[];
} {
  const basePath = Reflect.getMetadata("basePath", controller.constructor) || "";
  const routes = Reflect.getMetadata(ROUTES_KEY, controller) || [];
  
  return { basePath, routes };
}

// Helper to register controller with Express app
export function registerController(app: any, controller: any) {
  const { basePath, routes } = getControllerMetadata(controller);
  
  routes.forEach(route => {
    const fullPath = `${basePath}${route.path}`;
    const handler = route.descriptor.value.bind(controller);
    const middlewares = route.middlewares || [];
    
    // Register route with Express
    app[route.method](fullPath, ...middlewares, handler);
  });
}
