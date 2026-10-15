'use strict';

/**
 * CABECERAS DE SEGURIDAD
 * ======================
 *
 * Instrucciones que se envían al navegador en cada respuesta para limitar
 * qué puede hacer la página. Escritas a mano en lugar de usar la librería
 * `helmet`: son pocas líneas y el proyecto debe viajar liviano en una USB.
 *
 * Se ejecuta de PRIMERO en la cadena para que hasta las páginas de error
 * salgan protegidas.
 */

// ── BLOQUE 1: Política de contenido (CSP) ───────────────────────────────────
/**
 * La CSP le dice al navegador de dónde puede cargar cada tipo de recurso.
 * Si un atacante lograra inyectar un <script> apuntando a otro dominio, el
 * navegador se negaría a ejecutarlo.
 *
 * Cada directiva, explicada:
 */
const CONTENT_SECURITY_POLICY = [
  // Regla general: todo debe venir de nuestro propio dominio.
  "default-src 'self'",

  // JavaScript: solo archivos propios. No se permite código en línea
  // (<script>...</script> dentro del HTML), que es la vía habitual de los
  // ataques XSS. Por eso todo el JS del sitio vive en archivos bajo /js.
  "script-src 'self'",

  // CSS: propio + Google Fonts. 'unsafe-inline' es necesario porque las
  // plantillas usan atributos style="--retardo: 2" para el escalonado de
  // las animaciones (son estilos, no código ejecutable).
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

  // Archivos de tipografía: propios y de Google Fonts.
  "font-src 'self' https://fonts.gstatic.com",

  // Imágenes: propias y `data:` (para SVG incrustados directamente).
  "img-src 'self' data:",

  // Peticiones fetch/XHR: solo a nuestro servidor. El chat pasa por
  // /api/chat, nunca directo a Google desde el navegador.
  "connect-src 'self'",

  // Los formularios solo pueden enviarse a nuestro dominio.
  "form-action 'self'",

  // Nadie puede meter este sitio dentro de un <iframe> (evita clickjacking).
  "frame-ancestors 'none'",

  // Impide que se inyecte una etiqueta <base> que redirija las rutas.
  "base-uri 'self'",

  // Prohíbe <object>, <embed> y <applet>: tecnología obsoleta y peligrosa.
  "object-src 'none'",
].join('; ');

// ── BLOQUE 2: El middleware ─────────────────────────────────────────────────
module.exports = function security(req, res, next) {
  // La política de contenido descrita arriba.
  res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);

  // Impide que el navegador "adivine" el tipo de un archivo. Sin esto, un
  // archivo subido como .txt podría llegar a ejecutarse como JavaScript.
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Refuerzo de frame-ancestors para navegadores antiguos.
  res.setHeader('X-Frame-Options', 'DENY');

  // Controla cuánta información de la URL actual se envía al navegar a otro
  // sitio: al salir a un dominio externo solo viaja el dominio, no la ruta.
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permisos del navegador. Se deja abierta la geolocalización porque la
  // plataforma la necesita para el mapa de centros de salud; el micrófono
  // y la cámara quedan bloqueados para todo el sitio.
  res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(), camera=()');

  next();
};
