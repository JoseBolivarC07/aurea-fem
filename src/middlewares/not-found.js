'use strict';

/**
 * MANEJADOR DE RUTAS NO ENCONTRADAS (404)
 * =======================================
 *
 * Se monta al final de todas las rutas. Si una petición llega hasta aquí,
 * significa que ningún controlador la atendió: la dirección no existe.
 *
 * A diferencia de un middleware normal, este NO llama a `next()`: siempre
 * responde, porque es el final del camino.
 */

module.exports = function notFound(req, res) {
  // ── BLOQUE 1: Decidir el formato de la respuesta ──────────────────────────
  // No es lo mismo que un navegador pida una página inexistente (espera HTML
  // bonito) a que el JavaScript del chat llame a una ruta equivocada de la
  // API (espera JSON, y si le llega HTML se rompe al intentar leerlo).
  //
  // Dos señales para distinguirlo:
  //   · La ruta empieza por /api  → es la API
  //   · La cabecera Accept prefiere JSON sobre HTML
  const wantsJson = req.path.startsWith('/api') || req.accepts(['html', 'json']) === 'json';

  // ── BLOQUE 2: Respuesta para la API ───────────────────────────────────────
  if (wantsJson) {
    return res.status(404).json({
      error: 'not_found',
      message: 'El recurso solicitado no existe.',
    });
  }

  // ── BLOQUE 3: Respuesta para el navegador ─────────────────────────────────
  // Se renderiza la página 404 maquetada, con su propio CSS y sin el widget
  // del chat (no tiene sentido ofrecer orientación en una página de error).
  return res.status(404).renderPage('errors/404.view', {
    title: 'Página no encontrada · Áurea Fem',
    description: 'La página que buscas no existe o cambió de dirección.',
    bodyClass: 'page-error',
    showChat: false,
    styles: ['/css/views/error.css'],
  });
};
