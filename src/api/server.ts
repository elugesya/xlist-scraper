import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { registerRoutes } from "./routes.js";

const PORT = parseInt(process.env.PORT || "8080", 10);
const HOST = process.env.HOST || "0.0.0.0";
const AUTH_MODE = process.env.AUTH_MODE || "off"; // off | optional | required

/**
 * Create and configure Fastify server
 */
async function createServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
      transport:
        process.env.NODE_ENV !== "production"
          ? {
              target: "pino-pretty",
              options: {
                translateTime: "HH:MM:ss Z",
                ignore: "pid,hostname",
              },
            }
          : undefined,
    },
  });

  // Register CORS
  await fastify.register(cors, {
    origin: true, // Allow all origins for now
    credentials: true,
  });

  // Register Swagger/OpenAPI
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "X List Scraper API",
        description: "API for scraping Twitter (X) Lists",
        version: "1.0.0",
      },
      servers: [
        {
          url: `http://localhost:${PORT}`,
          description: "Local server",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });

  // Register Swagger UI
  await fastify.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
  });

  // Auth middleware (disabled by default, token-ready)
  if (AUTH_MODE === "required" || AUTH_MODE === "optional") {
    fastify.addHook("onRequest", async (request, reply) => {
      // Skip auth for health and docs
      if (
        request.url === "/health" ||
        request.url.startsWith("/docs") ||
        request.url === "/docs/json"
      ) {
        return;
      }

      const authHeader = request.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        if (AUTH_MODE === "required") {
          return reply.status(401).send({
            ok: false,
            error: "UNAUTHORIZED",
            message: "Missing or invalid authorization header",
          });
        }
        // Optional mode - continue without auth
        return;
      }

      // TODO: Validate token here when auth is enabled
      const token = authHeader.substring(7);

      // For now, just check if token exists
      if (!token) {
        if (AUTH_MODE === "required") {
          return reply.status(401).send({
            ok: false,
            error: "UNAUTHORIZED",
            message: "Invalid token",
          });
        }
      }

      // Token validation would go here
      // request.user = await validateToken(token);
    });
  }

  // Register application routes
  await registerRoutes(fastify);

  return fastify;
}

/**
 * Start the server
 */
async function start() {
  let server: Awaited<ReturnType<typeof createServer>> | null = null;

  try {
    server = await createServer();

    // Graceful shutdown handling
    const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
    for (const signal of signals) {
      process.on(signal, async () => {
        console.log(`\nReceived ${signal}, shutting down gracefully...`);
        try {
          await server?.close();
          console.log("Server closed successfully");
          process.exit(0);
        } catch (error) {
          console.error("Error during shutdown:", error);
          process.exit(1);
        }
      });
    }

    // Start listening
    await server.listen({ port: PORT, host: HOST });

    console.log(`\n✓ Server ready at http://localhost:${PORT}`);
    console.log(`✓ API docs at http://localhost:${PORT}/docs`);
    console.log(`✓ Health check at http://localhost:${PORT}/health\n`);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export { createServer, start };
