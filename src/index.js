'use strict';

/**
 * PUNTO DE ENTRADA EN VERCEL
 * ==========================
 *
 * Vercel convierte la app en una función y busca, en un orden fijo, el primer
 * archivo que importe Express (`app.js`, …, `src/index.js`, `src/server.js`).
 * Espera que ese archivo exporte la aplicación ya construida:
 *   · `app.js` no sirve: no importa Express y abre su propio puerto.
 *   · `src/server.js` tampoco: exporta la fábrica `createServer`, no la app.
 * Este archivo cubre ese hueco. En local y en Docker se sigue usando `app.js`.
 */

// Vercel reconoce el framework por este import; la app la arma `createServer`.
require('express');
const createServer = require('./server');

module.exports = createServer();
