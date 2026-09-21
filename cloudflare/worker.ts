/** UI hosting only. Deliberately NOT a proxy, kernel, job runner or authentication system. */
interface Env {ASSETS: {fetch(request: Request): Promise<Response>}}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === '/api' || path.startsWith('/api/')) {
      return Response.json({
        error: 'runtime_not_connected',
        detail: 'This deployment hosts the Datapass UI only. Open ?preview=2 to try the interface, or use the local start.py URL for execution. No cloud runtime or API proxy has been configured.',
        compute: 'none',
      }, {status: 503, headers: {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'}});
    }
    return env.ASSETS.fetch(request);
  },
};
