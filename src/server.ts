import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import { runAgent } from "./agent";
import type { StreamEvent } from "./types";

const PORT = parseInt(process.env.PORT || "3000");
const OUTPUT_DIR = join(import.meta.dir, "..", "output");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "report"
  );
}

async function saveReport(query: string, report: string): Promise<string> {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const filePath = join(OUTPUT_DIR, `${slugify(query)}.md`);
  await Bun.write(filePath, report);
  return filePath;
}

const server = Bun.serve({
  port: PORT,
  idleTimeout: 255,

  async fetch(req) {
    const url = new URL(req.url);

    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Health check
    if (req.method === "GET" && url.pathname === "/health") {
      return Response.json({ status: "ok" }, { headers: CORS_HEADERS });
    }

    // SSE streaming research endpoint
    if (req.method === "POST" && url.pathname === "/research/stream") {
      const contentType = req.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        return Response.json(
          { error: "Content-Type must be application/json" },
          { status: 415, headers: CORS_HEADERS },
        );
      }

      let body: { query?: string };
      try {
        body = await req.json();
      } catch {
        return Response.json(
          { error: "Invalid JSON body" },
          { status: 400, headers: CORS_HEADERS },
        );
      }

      const query = body.query?.trim();
      if (!query) {
        return Response.json(
          { error: "Missing required field: query" },
          { status: 400, headers: CORS_HEADERS },
        );
      }

      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const send = (event: StreamEvent) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
            );
          };

          try {
            const result = await runAgent(query, send);

            if (result.isSuccessful) {
              const filePath = await saveReport(query, result.report);
              console.log(`Saved report to ${filePath}`);
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`Agent error: ${message}`);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "error", data: { message } })}\n\n`,
              ),
            );
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Research endpoint
    if (req.method === "POST" && url.pathname === "/research") {
      const contentType = req.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        return Response.json(
          { error: "Content-Type must be application/json" },
          { status: 415, headers: CORS_HEADERS },
        );
      }

      let body: { query?: string };
      try {
        body = await req.json();
      } catch {
        return Response.json(
          { error: "Invalid JSON body" },
          { status: 400, headers: CORS_HEADERS },
        );
      }

      const query = body.query?.trim();
      if (!query) {
        return Response.json(
          { error: "Missing required field: query" },
          { status: 400, headers: CORS_HEADERS },
        );
      }

      try {
        const result = await runAgent(query);

        if (result.isSuccessful) {
          const filePath = await saveReport(query, result.report);
          console.log(`Saved report to ${filePath}`);
        }

        return Response.json(result, {
          status: result.isSuccessful ? 200 : 500,
          headers: CORS_HEADERS,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Agent error: ${message}`);
        return Response.json(
          { error: "Internal server error" },
          { status: 500, headers: CORS_HEADERS },
        );
      }
    }

    return Response.json(
      { error: "Not found" },
      { status: 404, headers: CORS_HEADERS },
    );
  },
});

console.log(
  `Research agent server listening on http://localhost:${server.port}`,
);
