'use strict';

/**
 * CONTROLADOR DE LA PÁGINA DE SERVICIOS
 * =====================================
 *
 * Muestra tres bloques:
 *   1. El listado completo de servicios de la plataforma.
 *   2. La comparativa "qué hace el resto del sector / qué hacemos nosotras".
 *   3. Un panel con pestañas, una por cada etapa de vida acompañada.
 */

const { identity } = require('../models/site.model');
const { servicios, diferenciadores } = require('../models/servicio.model');
const { etapas } = require('../models/etapa.model');

// ── Manejador de GET /servicios ─────────────────────────────────────────────
function mostrar(req, res) {
  res.renderPage('servicios.view', {
    // ---- Metadatos ------------------------------------------------------
    title: 'Servicios · Áurea Fem',
    description:
      'Orientación con inteligencia artificial, geolocalización de centros de salud, foro moderado, productos de bienestar y diarios personalizados.',
    bodyClass: 'page-servicios',

    // ---- Recursos propios -----------------------------------------------
    styles: ['/css/components/page-header.css', '/css/views/servicios.css'],
    // El script maneja las pestañas de etapas (navegación con flechas del
    // teclado y enlaces directos del tipo /servicios#embarazo).
    scripts: ['/js/views/servicios.js'],

    // ---- Datos para la plantilla ----------------------------------------
    identity, //         Se usa el "elemento innovador" como texto de entrada
    servicios, //        Los 6 servicios COMPLETOS (la portada solo mostraba 4)
    etapas, //           Contenido de las pestañas
    diferenciadores, //  Filas de la tabla comparativa
  });
}

module.exports = { mostrar };
