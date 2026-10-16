'use strict';

/**
 * VARIABLES COMUNES A TODAS LAS PLANTILLAS
 * ========================================
 *
 * `res.locals` es un objeto que EJS lee automáticamente al renderizar. Todo
 * lo que se ponga aquí queda disponible en cualquier vista y en cualquier
 * parcial, sin que el controlador tenga que pasarlo cada vez.
 *
 * Sin este middleware, los seis controladores tendrían que repetir `brand`,
 * `navigation`, `currentYear`... en cada llamada.
 *
 * Se ejecuta en TODAS las peticiones, así que se mantiene liviano: solo
 * asignaciones, nada de leer archivos ni consultar servicios.
 */

const { brand, navigation } = require('../app/models/site.model');
const { listar } = require('../app/models/producto.model');
const { jsonParaHtml } = require('../utils/json-html');

// El catálogo es fijo mientras el servidor corre: se serializa una sola vez
// y no en cada petición. Solo lleva lo que el carrito necesita en el navegador.
const catalogoPedido = jsonParaHtml(
  listar().map(({ id, nombre, precio, imagen }) => ({ id, nombre, precio, imagen }))
);

module.exports = function locals(req, res, next) {
  // ── BLOQUE 1: Datos fijos de la marca ─────────────────────────────────────
  // Vienen del modelo, no escritos a mano: si cambia el teléfono, cambia en
  // un solo archivo y se actualiza en toda la web.
  res.locals.brand = brand; //           Nombre, eslogan, correo, redes...
  res.locals.navigation = navigation; // Enlaces del menú principal
  res.locals.catalogoPedido = catalogoPedido; // JSON del carrito (ya escapado)

  // ── BLOQUE 2: Datos que dependen de la petición ───────────────────────────
  // `currentPath` lo usa la cabecera para marcar en qué página estamos
  // (el enlace activo del menú).
  res.locals.currentPath = req.path;
  res.locals.currentYear = new Date().getFullYear(); // Para el © del pie

  // ── BLOQUE 3: Valores por defecto de las plantillas ───────────────────────
  // EJS lanza un ReferenceError si una plantilla usa una variable que no
  // existe. Definirlas aquí garantiza que siempre haya algo, aunque una
  // vista concreta olvide pasarlas.
  //
  // Un controlador puede sobrescribir cualquiera de estas al renderizar.
  res.locals.title = brand.name; //                              <title>
  res.locals.description = `${brand.name} — ${brand.tagline}.`; // <meta>
  res.locals.bodyClass = ''; //                    Clase CSS del <body>
  res.locals.showChat = true; //                   ¿Se muestra el chat de Aura?

  next();
};
