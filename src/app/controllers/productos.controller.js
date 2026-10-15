'use strict';

/**
 * CONTROLADOR DEL CATÁLOGO DE PRODUCTOS
 * =====================================
 */

const { listar } = require('../models/producto.model');
const { etapas } = require('../models/etapa.model');

// ── Manejador de GET /productos ─────────────────────────────────────────────
function mostrar(req, res) {
  res.renderPage('productos.view', {
    title: 'Productos · Áurea Fem',
    description:
      'Kit menstrual, gel térmico, faja térmica y té rojo: productos de Áurea Fem para acompañar tu bienestar durante el ciclo.',
    bodyClass: 'page-productos',

    styles: ['/css/components/page-header.css', '/css/views/productos.css'],
    // El script conecta el botón "Consultar" de cada tarjeta con el chat.
    scripts: ['/js/views/productos.js'],

    // `listar()` devuelve los productos con el precio ya formateado en pesos
    // colombianos y la ruta de su foto: la vista no tiene que calcular nada.
    productos: listar(),
    etapas, //           Para traducir el id de etapa a su nombre legible
  });
}

module.exports = { mostrar };
