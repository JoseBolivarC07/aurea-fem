'use strict';

/**
 * RUTAS DEL AGENTE ORIENTADOR
 * ===========================
 *
 * Este router se monta bajo `/api/chat` en `server.js`, así que las rutas de
 * abajo son relativas a ese prefijo:
 *
 *   '/estado'  →  /api/chat/estado
 *   '/'        →  /api/chat
 *
 * A diferencia de las rutas del sitio, estas devuelven datos (JSON o un flujo
 * de eventos), no páginas HTML. Por eso viven bajo `/api`: es la convención
 * que además usan los manejadores de 404 y de errores para saber en qué
 * formato deben responder.
 */

const express = require('express');

const chat = require('../controllers/chat.controller');
const rateLimit = require('../../middlewares/rate-limit');

const router = express.Router();

// ── Ruta 1: Estado del servicio ─────────────────────────────────────────────
// Consulta ligera que no llama a Gemini: solo mira si hay API key y devuelve
// los textos del widget. Por eso NO lleva límite de peticiones.
router.get('/estado', chat.estado);

// ── Ruta 2: Conversación ────────────────────────────────────────────────────
// Aquí sí se aplica `rateLimit` porque cada consulta consume cuota de la API
// de Gemini, que es limitada y cuesta dinero.
//
// El orden de los argumentos es el orden de ejecución: primero se comprueba
// el límite y, solo si lo pasa, se llama al controlador. Si lo supera,
// `rateLimit` responde 429 y `chat.conversar` nunca llega a ejecutarse.
router.post('/', rateLimit, chat.conversar);

module.exports = router;
