import type { EventContext } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

/**
 * Cloudflare Pages Functions API entry point.
 * All /api/* routes are handled by files under functions/api/.
 */
export const onRequest: PagesFunction<Env> = async (context) => {
  return new Response(JSON.stringify({ status: 'ok', version: '0.1.0' }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
