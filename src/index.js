const HEADER_NAME = "Session-Token";
const SESSION_TTL = 15 * 60; // 15 minutos de inactividad

// Solo aplicamos la lógica de sesión a las peticiones de datos que
// hace script.js vía fetch(). El resto (index.html, css, etc.) pasa
// directo al origin sin tocar, porque el navegador no puede añadir
// headers custom en una navegación normal de página.
function shouldHandle(url) {
  return url.pathname.endsWith("index.json") || url.pathname.endsWith("today.txt");
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (!shouldHandle(url)) {
      return fetch(request);
    }

    const incomingToken = request.headers.get(HEADER_NAME);
    let sessionId = null;

    if (incomingToken) {
      const alive = await env.SESSIONS.get(incomingToken);
      if (alive) {
        sessionId = incomingToken;
        await env.SESSIONS.put(sessionId, "active", { expirationTtl: SESSION_TTL });
      }
    }

    if (!sessionId) {
      sessionId = crypto.randomUUID();
      await env.SESSIONS.put(sessionId, "active", { expirationTtl: SESSION_TTL });
    }

    const response = await fetch(request);
    const newResponse = new Response(response.body, response);
    newResponse.headers.set(HEADER_NAME, sessionId);
    newResponse.headers.set("Access-Control-Expose-Headers", HEADER_NAME);

    return newResponse;
  },
};
