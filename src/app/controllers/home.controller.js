'use strict';

/**
 * CONTROLADOR DE LA PORTADA
 * =========================
 *
 * QUÉ ES UN CONTROLADOR
 * La pieza intermedia del patrón MVC. Su trabajo es:
 *   1. Pedirle los datos al MODELO.
 *   2. Decidir qué VISTA se usa y con qué recursos (CSS y JS propios).
 *   3. Entregar todo junto para que se renderice.
 *
 * Lo que NO hace: no contiene los datos (eso es del modelo) ni escribe HTML
 * (eso es de la vista). Si un controlador crece mucho, casi siempre es señal
 * de que está haciendo el trabajo de otra capa.
 */

// ── BLOQUE 1: Datos que necesita esta página ────────────────────────────────
// Cada `require` trae un modelo distinto. La portada es la única página que
// muestra un resumen de todo, así que consulta cuatro fuentes.
const { identity } = require('../models/site.model'); //        Misión, visión...
const { pilares, servicios } = require('../models/servicio.model');
const { etapas } = require('../models/etapa.model'); //         Las 5 etapas
const { destacados } = require('../models/producto.model'); //  Productos top

// ── BLOQUE 2: Manejador de la ruta GET / ────────────────────────────────────
/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
function mostrar(req, res) {
  // `renderPage` lo añade el middleware `layout.js`: renderiza la vista y la
  // envuelve en la plantilla principal (cabecera, pie, chat).
  res.renderPage('home.view', {
    // ---- Metadatos de la página (van al <head>) -------------------------
    title: 'Áurea Fem · Cuidarte también es conocerte',
    description:
      'Acompañamiento integral en salud y bienestar femenino: orientación confiable, comunidad de apoyo y productos seleccionados para cada etapa de tu vida.',

    // Clase que se pone en el <body>, por si hace falta un ajuste global
    // exclusivo de esta página.
    bodyClass: 'page-home',

    // ---- Recursos propios de esta vista ---------------------------------
    // Aquí se cumple el requisito de "cada vista con su propio CSS".
    // El layout añade la base compartida; esto es lo exclusivo de la portada.
    styles: ['/css/views/home.css'],
    scripts: ['/js/views/home.js'], // Paralaje de los anillos del hero

    // ---- Datos para la plantilla ----------------------------------------
    identity, //  Propuesta de valor y textos institucionales
    pilares, //   Los 4 compromisos de marca
    // Solo los servicios marcados como destacados: la portada muestra un
    // resumen, el listado completo vive en /servicios.
    servicios: servicios.filter((servicio) => servicio.destacado),
    etapas, //    Las 5 etapas de vida
    productos: destacados(4), // Los 4 primeros productos destacados
  });
}

module.exports = { mostrar };
