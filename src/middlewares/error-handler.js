'use strict';

/**
 * MANEJADOR DE ERRORES
 * ====================
 *
 * Última pieza de la cadena. Captura cualquier excepción lanzada en los
 * middlewares o controladores anteriores y la convierte en una respuesta
 * presentable, en lugar de dejar que el servidor se caiga o devuelva una
 * pantalla en blanco.
 *
 * CÓMO LO RECONOCE EXPRESS
 * Por la cantidad de argumentos: un middleware normal recibe 3 (req, res,
 * next) y uno de errores recibe 4 (error, req, res, next). Si se quita el
 * cuarto parámetro, Express deja de tratarlo como manejador de errores
 * aunque el código sea idéntico. Por eso `next` está presente aunque no se use.
 *
 * CÓMO LLEGA AQUÍ UN ERROR
 *   · Una excepción lanzada dentro de un controlador síncrono.
 *   · Una llamada explícita a `next(error)`.
 *   · Un fallo al renderizar una plantilla EJS.
 */

const config = require('../config');

// eslint-disable-next-line no-unused-vars -- Express identifica el handler por su aridad (4 args).
module.exports = function errorHandler(error, req, res, next) {
  // ── BLOQUE 1: Determinar el código de estado ──────────────────────────────
  // Algunos errores traen su propio código (por ejemplo 422 de validación).
  // Si no lo traen, se asume un fallo del servidor: 500.
  const status = error.status || 500;

  // ── BLOQUE 2: Registrar en consola ───────────────────────────────────────
  // Solo se imprime el detalle completo para errores del servidor (5xx).
  // Los 4xx son culpa de la petición, no fallos del sistema, y llenarían la
  // consola de ruido.
  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`);
    console.error(error); // Incluye el stack trace para poder depurar.
  }

  // ── BLOQUE 3: Elegir formato (misma lógica que en not-found.js) ──────────
  const wantsJson = req.path.startsWith('/api') || req.accepts(['html', 'json']) === 'json';

  if (wantsJson) {
    return res.status(status).json({
      error: error.code || 'internal_error',
      // Los errores del servidor se responden con un mensaje genérico: el
      // detalle técnico puede revelar rutas de archivos o nombres internos.
      // Los 4xx sí muestran su mensaje, que está pensado para el usuario.
      message: status >= 500 ? 'Ocurrió un error inesperado en el servidor.' : error.message,
    });
  }

  // ── BLOQUE 4: Página de error maquetada ──────────────────────────────────
  return res.status(status).renderPage('errors/500.view', {
    title: 'Error del servidor · Áurea Fem',
    description: 'Ocurrió un problema al procesar la solicitud.',
    bodyClass: 'page-error',
    showChat: false,
    styles: ['/css/views/error.css'],

    // En desarrollo se muestra el mensaje técnico en pantalla para no tener
    // que ir a mirar la consola. En producción se oculta.
    detail: config.isProduction ? null : error.message,
  });
};
