'use strict';

/**
 * JSON SEGURO PARA INCRUSTAR EN HTML
 * ==================================
 *
 * Convierte un valor a JSON y reemplaza cada "<" por su escape <.
 * Así, un texto como "</script>" dentro de un nombre de producto no puede
 * cerrar el bloque <script type="application/json"> donde se incrusta, y
 * `JSON.parse` devuelve igualmente el valor original.
 */

function jsonParaHtml(valor) {
  return JSON.stringify(valor).replace(/</g, '\\u003c');
}

module.exports = { jsonParaHtml };
