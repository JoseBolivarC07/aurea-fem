'use strict';

/**
 * CONSTRUCCIÓN DEL SERVIDOR EXPRESS
 * =================================
 *
 * Aquí se arma la aplicación completa: motor de plantillas, middlewares,
 * rutas y manejo de errores.
 *
 * Está separado de `app.js` a propósito: esta función devuelve la app SIN
 * abrir ningún puerto, lo que permite usarla en pruebas automatizadas sin
 * levantar un servidor real.
 *
 * IMPORTANTE — El orden de los `app.use()` es el orden en que se ejecutan.
 * Express pasa cada petición por la cadena de arriba hacia abajo, y cada
 * middleware decide si responde o si llama a `next()` para seguir. Por eso
 * la seguridad va primero y el 404 va de últimas.
 */

const path = require('node:path');
const express = require('express');

const config = require('./config');

// ── Middlewares propios (cada uno documentado en su archivo) ────────────────
const locals = require('./middlewares/locals');
const layout = require('./middlewares/layout');
const security = require('./middlewares/security');
const notFound = require('./middlewares/not-found');
const errorHandler = require('./middlewares/error-handler');

// ── Grupos de rutas ─────────────────────────────────────────────────────────
const webRoutes = require('./app/routes/web.routes');
const chatRoutes = require('./app/routes/chat.routes');
const authRoutes = require('./auth/routes/auth.routes');

/**
 * Arma y devuelve la aplicación Express lista para escuchar.
 * @returns {import('express').Express}
 */
function createServer() {
  const app = express();

  // ══ BLOQUE 1: Motor de vistas ═════════════════════════════════════════════
  // Define cómo se convierten las plantillas .ejs en HTML.
  //
  // `views` recibe un ARRAY con dos carpetas: Express busca la plantilla en
  // la primera y, si no la encuentra, prueba con la segunda. Eso permite que
  // el módulo `auth` tenga sus vistas junto a su propio código en lugar de
  // mezcladas con las del sitio público.
  app.set('view engine', 'ejs');
  app.set('views', [config.paths.views, config.paths.authViews]);

  // Hace que `req.ip` refleje la IP real cuando hay un proxy delante
  // (necesario para que el límite de peticiones cuente bien).
  app.set('trust proxy', 1);

  // Oculta la cabecera "X-Powered-By: Express": no hace falta anunciar
  // qué tecnología corre por debajo.
  app.disable('x-powered-by');

  // ══ BLOQUE 2: Middlewares base ════════════════════════════════════════════

  // 2.1 · Cabeceras de seguridad y política de contenido (CSP).
  //      Va de primero para que TODA respuesta las lleve, incluidos errores.
  app.use(security);

  // 2.2 · Lectores del cuerpo de la petición.
  //      `json` atiende al chat (fetch envía JSON).
  //      `urlencoded` atiende a los formularios HTML clásicos.
  //      El límite de 64 kB evita que alguien envíe un cuerpo enorme.
  app.use(express.json({ limit: '64kb' }));
  app.use(express.urlencoded({ extended: false, limit: '64kb' }));

  // 2.3 · Archivos estáticos: CSS, JavaScript del navegador e imágenes.
  //      Se sirve la carpeta `src/public` en la raíz del sitio, así que
  //      `src/public/css/base/tokens.css` se pide como `/css/base/tokens.css`.
  //
  //      En desarrollo la caché se desactiva (maxAge 0) para que al guardar
  //      un CSS baste con recargar; en producción se cachea una semana.
  app.use(
    express.static(config.paths.public, {
      maxAge: config.isProduction ? '7d' : 0,
      etag: true,
    })
  );

  // 2.4 · Sistema de layout: añade el método `res.renderPage(...)`,
  //      que envuelve cada vista en la plantilla principal.
  app.use(layout);

  // 2.5 · Variables comunes a todas las plantillas (marca, menú, año...).
  app.use(locals);

  // ══ BLOQUE 3: Rutas ═══════════════════════════════════════════════════════
  // Cada grupo se monta bajo un prefijo. Todo lo que empiece por ese prefijo
  // se delega al archivo de rutas correspondiente.
  app.use('/', webRoutes); //        Sitio público: inicio, nosotras, productos...
  app.use('/api/chat', chatRoutes); // API del agente Aura
  app.use('/acceso', authRoutes); //  Login y panel interno

  // ══ BLOQUE 4: Cierre de la cadena ═════════════════════════════════════════
  // Si la petición llegó hasta aquí, ninguna ruta la atendió → 404.
  app.use(notFound);

  // Manejador de errores. Express lo reconoce porque recibe 4 argumentos.
  // Captura cualquier excepción lanzada en los middlewares anteriores.
  // Debe ir SIEMPRE al final de todo.
  app.use(errorHandler);

  return app;
}

module.exports = createServer;

// Ruta absoluta a la carpeta de vistas del sitio público. Se exporta por si
// alguna herramienta externa (por ejemplo un script de compilación) la necesita.
module.exports.viewsRoot = path.join(config.paths.src, 'app', 'views');
