import { corsHeaders } from "./cors.ts";

export function json(body: unknown, status = 200, origin: string | null = null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

export function jsonError(message: string, status = 400, origin: string | null = null): Response {
  return json({ error: message }, status, origin);
}
