'use strict';

/**
 * RUTAS DEL SITIO PÚBLICO
 * =======================
 *
 * El "índice" de la web: qué dirección atiende cada controlador.
 *
 * Aquí NO hay lógica de negocio a propósito. Un archivo de rutas debe leerse
 * de un vistazo y responder a una sola pregunta: "¿qué pasa cuando alguien
 * entra a esta dirección?". El trabajo real está en los controladores.
 *
 * Este router se monta en `/` desde `server.js`, así que las rutas de abajo
 * son las direcciones finales tal cual.
 */

const express = require('express');

// ── BLOQUE 1: Controladores, uno por vista ──────────────────────────────────
const home = require('../controllers/home.controller');
const nosotras = require('../controllers/nosotras.controller');
const servicios = require('../controllers/servicios.controller');
const productos = require('../controllers/productos.controller');
const contacto = require('../controllers/contacto.controller');

// `Router()` crea un mini-servidor de rutas que luego se enchufa a la app
// principal. Permite tener las rutas separadas por módulo en vez de un
// archivo gigante con todas.
const router = express.Router();

// ── BLOQUE 2: Páginas de solo lectura (GET) ─────────────────────────────────
// Se pasa la FUNCIÓN, sin paréntesis: Express la llamará cuando entre una
// petición. Con `home.mostrar()` se ejecutaría ahora mismo, al arrancar.
router.get('/', home.mostrar); //                    Portada
router.get('/nosotras', nosotras.mostrar); //        Institucional
router.get('/servicios', servicios.mostrar); //      Servicios y etapas
router.get('/productos', productos.mostrar); //      Catálogo (acepta ?categoria=)

// ── BLOQUE 3: Página con formulario (GET + POST) ────────────────────────────
// `.route()` agrupa varios métodos sobre la misma dirección, en lugar de
// repetirla dos veces:
//   GET  → muestra el formulario
//   POST → recibe los datos enviados
router.route('/contacto').get(contacto.mostrar).post(contacto.enviar);

module.exports = router;
