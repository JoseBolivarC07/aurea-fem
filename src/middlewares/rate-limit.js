'use strict';

/**
 * LÍMITE DE PETICIONES (RATE LIMIT)
 * =================================
 *
 * Controla cuántas consultas puede hacer una misma IP en un intervalo.
 * Se aplica solo al chat, que es lo único que cuesta dinero: cada consulta
 * consume cuota de la API de Gemini.
 *
 * Protege sobre todo de accidentes: un bucle mal escrito en el navegador o
 * alguien dándole veinte veces al botón de enviar podrían agotar la cuota
 * gratuita en segundos.
 *
 * ESTRATEGIA: ventana deslizante en memoria.
 * Se guarda la hora de cada petición por IP y se cuentan las que caen dentro
 * del último minuto. Es suficiente para un despliegue local de una sola
 * instancia. Si algún día hubiera varios servidores, esto tendría que vivir
 * en Redis o similar, porque cada proceso tiene su propia memoria.
 */

const config = require('../config');

// ── BLOQUE 1: Almacén en memoria ────────────────────────────────────────────
/**
 * Mapa IP → lista de marcas de tiempo de sus peticiones.
 * Ejemplo: { '127.0.0.1': [1754870400000, 1754870402500, ...] }
 * @type {Map<string, number[]>}
 */
const hits = new Map();

// ── BLOQUE 2: Limpieza periódica ────────────────────────────────────────────
/**
 * Sin esto, el mapa crecería para siempre: cada IP que visite el sitio
 * dejaría una entrada permanente y la memoria del proceso subiría sin parar.
 *
 * Una vez por ventana se recorre el mapa, se descartan las marcas viejas y
 * se eliminan las IP que ya no tienen ninguna.
 */
const cleanup = setInterval(() => {
  const limit = Date.now() - config.rateLimit.windowMs;

  for (const [key, timestamps] of hits) {
    const alive = timestamps.filter((time) => time > limit);

    if (alive.length === 0) hits.delete(key);
    else hits.set(key, alive);
  }
}, config.rateLimit.windowMs);

// `.unref()` le dice a Node que este temporizador no debe mantener vivo el
// proceso. Sin él, Ctrl + C no cerraría el servidor: Node esperaría a que
// el intervalo terminara, y un intervalo nunca termina.
cleanup.unref();

// ── BLOQUE 3: El middleware ─────────────────────────────────────────────────
module.exports = function rateLimit(req, res, next) {
  const key = req.ip || 'desconocida';
  const now = Date.now();

  // Inicio de la ventana: todo lo anterior a este instante ya no cuenta.
  const windowStart = now - config.rateLimit.windowMs;

  // Peticiones de esta IP que siguen dentro de la ventana.
  const timestamps = (hits.get(key) || []).filter((time) => time > windowStart);

  // ---- Caso 1: superó el cupo -------------------------------------------
  if (timestamps.length >= config.rateLimit.maxRequests) {
    // Se calcula cuándo caducará la petición más antigua: ese es el momento
    // en que quedará un espacio libre.
    const retryAfter = Math.ceil((timestamps[0] + config.rateLimit.windowMs - now) / 1000);

    // Cabecera estándar que indica cuántos segundos esperar.
    res.setHeader('Retry-After', String(retryAfter));

    // 429 = "Too Many Requests". Se corta aquí: no se llama a `next()`.
    return res.status(429).json({
      error: 'rate_limited',
      message: `Demasiadas consultas seguidas. Intenta de nuevo en ${retryAfter} segundos.`,
    });
  }

  // ---- Caso 2: dentro del cupo ------------------------------------------
  // Se registra esta petición y se deja pasar al controlador.
  timestamps.push(now);
  hits.set(key, timestamps);
  next();
};
