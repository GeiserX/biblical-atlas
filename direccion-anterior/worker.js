/* biblical-atlas · la dirección anterior (biblical-earth.geiser.cloud) después del cambio. Un Cloudflare Worker:
   - /puente.html y /puente.js: el puente que entrega lo guardado en este origen al sitio nuevo (puente.js).
   - cualquier otra ruta: una redirección HTTP a la misma ruta y consulta en la dirección nueva. El navegador conserva
     el #fragmento, así que un enlace compartido abre la misma vista, y un cliente HTTP que descarga /data.json sigue
     la redirección.
   302 hasta que el cambio esté comprobado en los dos dominios; luego REDIRECCION pasa a 301. */
import PUENTE_HTML from './puente.html';
import PUENTE_JS from './puente.js';

export const NUEVO = 'https://biblical-atlas.geiser.cloud';
export const REDIRECCION = 302;

const COMUNES = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer' };

export function responder(request) {
  const url = new URL(request.url);
  const lectura = request.method === 'GET' || request.method === 'HEAD';
  if (lectura && url.pathname === '/puente.html') {
    return new Response(request.method === 'HEAD' ? null : PUENTE_HTML, { headers: { ...COMUNES,
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy': `default-src 'none'; script-src 'self'; frame-ancestors ${NUEVO}` } });
  }
  if (lectura && url.pathname === '/puente.js') {
    return new Response(request.method === 'HEAD' ? null : PUENTE_JS, { headers: { ...COMUNES,
      'content-type': 'text/javascript; charset=utf-8' } });
  }
  return Response.redirect(NUEVO + url.pathname + url.search, REDIRECCION);
}

export default { fetch: responder };
