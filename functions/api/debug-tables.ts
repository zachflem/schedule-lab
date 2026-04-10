import { getDb, jsonResponse } from '../lib/db';

export const onRequest = async (context: any): Promise<Response> => {
  const db = getDb(context);
  const { results } = await db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  ).all();
  return jsonResponse(results);
};
