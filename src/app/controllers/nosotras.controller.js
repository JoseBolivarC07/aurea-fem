'use strict';

/**
 * CONTROLADOR DE LA PÁGINA "NOSOTRAS"
 * ===================================
 *
 * Página institucional: quiénes somos, qué nos mueve y quién está detrás.
 * Es el controlador más simple del proyecto: no filtra ni transforma nada,
 * solo reúne datos del modelo y los entrega a la vista.
 */

// ── BLOQUE 1: Datos institucionales ─────────────────────────────────────────
const { identity } = require('../models/site.model'); //  Misión, visión, propósito
const { equipo, valores, objetivos } = require('../models/equipo.model');

// ── BLOQUE 2: Manejador de GET /nosotras ────────────────────────────────────
function mostrar(req, res) {
  res.renderPage('nosotras.view', {
    // ---- Metadatos ------------------------------------------------------
    title: 'Nosotras · Áurea Fem',
    description:
      'Quiénes somos, qué nos mueve y el equipo detrás de Áurea Fem: misión, visión, valores corporativos y objetivos estratégicos.',
    bodyClass: 'page-nosotras',

    // ---- Recursos propios -----------------------------------------------
    // `page-header.css` es un COMPONENTE compartido por las páginas
    // interiores (nosotras, servicios, productos, contacto). No está en la
    // base porque la portada no lo usa: no tiene sentido que la home
    // descargue estilos de un encabezado que nunca va a mostrar.
    styles: ['/css/components/page-header.css', '/css/views/nosotras.css'],
    // Esta página no declara scripts propios: no tiene interacción especial.

    // ---- Datos para la plantilla ----------------------------------------
    identity, //   Misión, visión y propósito superior
    equipo, //     Las 5 integrantes con su cargo y área
    valores, //    Los 5 valores corporativos
    objetivos, //  Los 5 objetivos estratégicos
  });
}

module.exports = { mostrar };
