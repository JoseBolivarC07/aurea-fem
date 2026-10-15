'use strict';

/**
 * CONTROLADOR DEL AGENTE "AURA"
 * =============================
 *
 * Es el intermediario entre el navegador y Gemini. El navegador nunca habla
 * con Google directamente: siempre pasa por aquí.
 *
 * ¿POR QUÉ ESTE INTERMEDIARIO?
 *  1. SEGURIDAD DE LA CLAVE. Si el navegador llamara a Google, la API key
 *     tendría que estar en el JavaScript del cliente, y cualquiera podría
 *     verla con F12 y usarla a costa nuestra.
 *  2. CONTROL DE LAS REGLAS. La instrucción de sistema (qué puede y qué no
 *     puede responder Aura) se arma en el servidor. Si viajara desde el
 *     navegador, se podría editar y saltarse todos los límites.
 *
 * FORMATO DE RESPUESTA: Server-Sent Events (SSE)
 * Es un canal de una sola dirección: el servidor va enviando trozos y el
 * navegador los recibe conforme llegan. Es más simple que WebSockets y
 * suficiente aquí, porque el navegador no necesita interrumpir a mitad.
 *
 * Estructura de un evento SSE:
 *     event: fragmento
 *     data: {"texto":"Los cólicos "}
 *     (línea en blanco que cierra el evento)
 */

const config = require('../../config');
const gemini = require('../services/gemini.service');
const { MENSAJE_BIENVENIDA, SUGERENCIAS } = require('../services/prompt.service');
const { limpiarTexto } = require('../../utils/validacion');

// ── BLOQUE 1: Estado del servicio ───────────────────────────────────────────
/**
 * GET /api/chat/estado
 *
 * El widget llama a esto al abrirse por primera vez, antes de mostrar nada.
 * Así se entera de tres cosas de una sola vez:
 *   · Si el chat está habilitado (hay API key configurada).
 *   · El mensaje de bienvenida.
 *   · Las preguntas sugeridas.
 *
 * Se envían desde el servidor y no se escriben en el HTML para que el tono
 * del agente se defina en un solo sitio: `prompt.service.js`.
 */
function estado(req, res) {
  res.json({
    disponible: gemini.estaConfigurado(),
    bienvenida: MENSAJE_BIENVENIDA,
    sugerencias: SUGERENCIAS,
  });
}

// ── BLOQUE 2: Emisor de eventos SSE ─────────────────────────────────────────
/**
 * Escribe un evento con el formato exacto que exige el protocolo.
 *
 * Los datos van como JSON porque el protocolo SSE es de texto plano: si un
 * fragmento contuviera un salto de línea, rompería el formato. Al
 * serializarlo, los saltos se escapan como \n y viajan seguros.
 *
 * La línea en blanco final (\n\n) es obligatoria: marca el fin del evento.
 *
 * @param {import('express').Response} res
 * @param {string} evento Nombre: 'fragmento', 'fin' o 'error'.
 * @param {object} datos  Contenido del evento.
 */
function emitir(res, evento, datos) {
  res.write(`event: ${evento}\n`);
  res.write(`data: ${JSON.stringify(datos)}\n\n`);
}

// ── BLOQUE 3: Conversación ──────────────────────────────────────────────────
/**
 * POST /api/chat
 *
 * Recibe { mensaje, historial } y responde en streaming.
 */
async function conversar(req, res) {
  // 3.1 · Saneamiento de la entrada.
  // Nunca se usa `req.body.mensaje` directamente: se limpia y se recorta.
  const mensaje = limpiarTexto(req.body?.mensaje, config.gemini.maxMessageLength);

  // 3.2 · Validaciones que se responden como JSON normal.
  // Se hacen ANTES de abrir el flujo SSE: una vez enviadas las cabeceras de
  // streaming ya no se puede cambiar el código de estado de la respuesta.
  if (!mensaje) {
    return res.status(400).json({
      error: 'mensaje_vacio',
      message: 'Escribe tu consulta para poder ayudarte.',
    });
  }

  if (!gemini.estaConfigurado()) {
    return res.status(503).json({
      error: 'not_configured',
      message: 'El asistente no está configurado en este equipo.',
    });
  }

  // 3.3 · Apertura del canal de streaming.
  // Estas cabeceras le dicen al navegador: "no esperes el final, ve leyendo".
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    // Sin caché: cada respuesta es única y no debe guardarse.
    'Cache-Control': 'no-cache, no-transform',
    // Mantiene la conexión abierta mientras dure la respuesta.
    Connection: 'keep-alive',
    // Instrucción para proxies (Nginx): no acumules, deja pasar cada trozo.
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.(); // Envía las cabeceras ya, sin esperar contenido.

  // 3.4 · Detección de desconexión.
  //
  // Si la usuaria cierra la pestaña a mitad de una respuesta, seguir pidiendo
  // texto a Gemini es gastar cuota en algo que nadie va a leer.
  //
  // OJO — se escucha en `res` y NO en `req`. El evento 'close' de la petición
  // se dispara en cuanto termina de leerse el cuerpo, lo que cancelaría el
  // streaming antes de empezar (este fue un bug real). El de la respuesta sí
  // marca la desconexión verdadera.
  const controlador = new AbortController();
  res.on('close', () => {
    if (!res.writableFinished) controlador.abort();
  });

  // 3.5 · Consumo del generador y envío de fragmentos.
  try {
    // `for await` recorre el generador asíncrono: cada vuelta trae un trozo
    // de texto en cuanto Gemini lo produce.
    for await (const fragmento of gemini.enviarMensajeStream({
      mensaje,
      historial: req.body?.historial,
      signal: controlador.signal, // Para poder cancelar desde aquí
    })) {
      // Si la conexión ya se cerró, no tiene sentido seguir escribiendo.
      if (res.writableEnded) break;
      emitir(res, 'fragmento', { texto: fragmento });
    }

    // Evento final: le indica al navegador que la respuesta está completa.
    if (!res.writableEnded) {
      emitir(res, 'fin', { ok: true });
    }
  } catch (error) {
    // 3.6 · Errores a mitad del flujo.
    //
    // Aquí no se puede devolver un código HTTP de error: las cabeceras 200
    // ya se enviaron. La solución es avisar por un evento 'error', que el
    // widget muestra como una burbuja del sistema.
    console.error('[chat] Error durante el streaming:', error.message);

    if (!res.writableEnded) {
      emitir(res, 'error', {
        codigo: error.code || 'error',
        message:
          error.message ||
          'No pude responder en este momento. Intenta de nuevo en unos segundos.',
      });
    }
  } finally {
    // 3.7 · Cierre garantizado.
    // Sin `res.end()` la conexión quedaría abierta y el navegador seguiría
    // esperando para siempre. `finally` asegura que se cierre pase lo que pase.
    if (!res.writableEnded) res.end();
  }
}

module.exports = { estado, conversar };
