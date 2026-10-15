'use strict';

/**
 * RUTAS DEL MÓDULO DE ACCESO
 * ==========================
 *
 * Montadas bajo `/acceso` en `server.js`, así que:
 *   '/'       →  /acceso
 *   '/panel'  →  /acceso/panel
 *   '/salir'  →  /acceso/salir
 *
 * Aquí se ve, de un vistazo, qué está protegido y qué no: la única ruta con
 * `requerirSesion` delante es el panel.
 */

const express = require('express');

const auth = require('../controllers/auth.controller');
const { requerirSesion } = require('../../utils/sesion');

const router = express.Router();

// ── Ruta 1: Formulario de acceso (pública) ──────────────────────────────────
// GET muestra el formulario, POST recibe las credenciales. Tiene que ser
// pública, evidentemente: es la puerta de entrada.
router.route('/').get(auth.mostrarLogin).post(auth.iniciarSesion);

// ── Ruta 2: Panel interno (PROTEGIDA) ───────────────────────────────────────
// `requerirSesion` se ejecuta ANTES que el controlador. Si no hay cookie
// válida, redirige al login y `mostrarPanel` nunca corre.
//
// La protección se declara aquí, en la ruta, y no dentro del controlador:
// así basta leer este archivo para saber qué está protegido, sin tener que
// abrir cada controlador a comprobarlo.
router.get('/panel', requerirSesion, auth.mostrarPanel);

// ── Ruta 3: Cerrar sesión ───────────────────────────────────────────────────
// No lleva `requerirSesion`: si alguien la llama sin sesión, simplemente se
// borra una cookie que no existe. Exigir sesión para salir solo complicaría
// las cosas sin aportar seguridad.
router.post('/salir', auth.cerrarSesion);

module.exports = router;
