import { getPublicState } from './_tableState';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ message: 'Method not allowed' }),
      {
        status: 405,
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    payload = null;
  }

  console.log('[API] action received:', payload);

  const state = getPublicState();

  return new Response(JSON.stringify(state), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
