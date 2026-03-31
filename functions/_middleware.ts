import { errorResponse } from './lib/db';

interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // Skip middleware for public enquiries if necessary (though the user didn't specify)
  // For now, we'll apply it broadly but focus on setting the identity.
  
  const email = request.headers.get('CF-Access-Authenticated-User-Email');
  const jwt = request.headers.get('CF-Access-JWT-Assertion');

  // We can attach the identity to the piece of data shared between functions.
  // In Pages Functions, we can use context.data or just pass it in headers for downstream.
  
  if (email && jwt) {
    // Identity present
    (context as any).data = { ...(context as any).data, userEmail: email };
  }

  return await context.next();
};
