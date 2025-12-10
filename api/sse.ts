import { registerClient } from './_sse';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ message: 'Method not allowed' }),
      { status: 405, headers: { 'content-type': 'application/json' } },
    );
  }

  return registerClient();
}
