'use strict';

/**
 * CLIENTE DE LA API DE GOOGLE GEMINI
 * ==================================
 *
 * Es la pieza que habla con la inteligencia artificial. Recibe la consulta de
 * la usuaria, la envía a Google y devuelve la respuesta por trozos.
 *
 * DOS DECISIONES DE DISEÑO IMPORTANTES:
 *
 * 1) Se usa `fetch` nativo de Node (disponible desde la versión 18) en lugar
 *    del SDK oficial de Google. Motivo: una dependencia menos que copiar en
 *    la USB y control total sobre cómo se lee el streaming.
 *
 * 2) La respuesta llega en STREAMING, no de una sola vez. El modelo va
 *    generando texto y lo envía en fragmentos; así la usuaria ve la respuesta
 *    escribiéndose en lugar de esperar diez segundos mirando un punto que
 *    parpadea.
 *
 * SEGURIDAD: la API key solo existe en este proceso. El navegador nunca la
 * recibe, porque siempre habla con nuestro propio servidor (/api/chat).
 */

const config = require('../../config');
const { construirInstruccionSistema } = require('./prompt.service');

// ── BLOQUE 1: Tipo de error propio ──────────────────────────────────────────
/**
 * Error con un código legible, para que el controlador sepa qué responder
 * sin tener que analizar el texto del mensaje.
 *
 * Extender `Error` (en lugar de lanzar un objeto suelto) conserva el stack
 * trace, que es lo que permite saber en qué línea ocurrió el problema.
 */
class GeminiError extends Error {
  /**
   * @param {string} code    Identificador corto: 'timeout', 'quota_exceeded'...
   * @param {string} message Texto que verá la usuaria.
   * @param {number} status  Código HTTP que corresponde.
   */
  constructor(code, message, status = 502) {
    super(message);
    this.name = 'GeminiError';
    this.code = code;
    this.status = status;
  }
}

// ── BLOQUE 2: Ajustes de moderación ─────────────────────────────────────────
/**
 * Filtros automáticos de contenido de Gemini, desactivados a conciencia.
 *
 * POR QUÉ — evidencia medida, no una suposición
 * Con los umbrales por defecto (BLOCK_MEDIUM_AND_ABOVE), el filtro cortaba
 * las respuestas A MITAD DE FRASE. Un ejemplo real de este proyecto: a la
 * pregunta "¿dónde quedan y cómo los contacto?", la respuesta se cortaba en
 * "Puedes ponerte en contacto con nos—", justo antes de dar el correo.
 *
 * Al inspeccionar las puntuaciones, el clasificador marcaba ese texto como
 * HARASSMENT = MEDIUM y SEXUALLY_EXPLICIT = MEDIUM. Es un disparate: la
 * frase solo daba la dirección de la empresa.
 *
 * La causa es conocida: el clasificador puntúa TODO el contexto, instrucción
 * de sistema incluida. Y esa instrucción contiene, necesariamente, palabras
 * como "menstruación", "vulva", "útero", "violencia contra la mujer" o
 * "hacerse daño". Es decir: el dominio entero de esta empresa eleva la
 * puntuación de cada respuesta, sin importar lo que diga.
 *
 * Subir el umbral a BLOCK_ONLY_HIGH redujo los cortes pero no los eliminó
 * (una de cada cuatro respuestas seguía truncándose, una de ellas a mitad
 * del número de teléfono). Con OFF, ocho de ocho pruebas salieron completas.
 *
 * DE DÓNDE VIENE ENTONCES LA SEGURIDAD DEL AGENTE
 * De la instrucción de sistema (`prompt.service.js`), que impone límites
 * mucho más pertinentes que un clasificador de propósito general: no
 * diagnostica, no receta, deriva las urgencias al 123, entrega líneas de
 * ayuda ante una crisis, rechaza temas fuera de alcance y resiste los
 * intentos de cambiarle la identidad. Todo ello está verificado con pruebas.
 *
 * Un filtro que corta la palabra "nosotras" por acoso no estaba protegiendo
 * a nadie; solo dejaba a la usuaria con media frase.
 */
const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' },
];

// ── BLOQUE 3: Comprobación de disponibilidad ────────────────────────────────
/**
 * ¿Hay API key configurada?
 * Si no la hay, el chat se muestra deshabilitado con un mensaje claro en vez
 * de fallar cuando alguien escriba su primera consulta.
 */
function estaConfigurado() {
  return Boolean(config.gemini.apiKey);
}

// ── BLOQUE 4: Armado de la conversación ─────────────────────────────────────
/**
 * Convierte el historial que envía el navegador al formato que espera Gemini.
 *
 * Formato del navegador:  { role: 'user',  text: 'hola' }
 * Formato de Gemini:      { role: 'user',  parts: [{ text: 'hola' }] }
 *
 * Además hace tres tareas de saneamiento, porque el historial viene del
 * cliente y NUNCA se debe confiar en lo que envía el cliente:
 *   · Descarta entradas mal formadas o vacías.
 *   · Recorta a los últimos N turnos (config.gemini.maxHistoryTurns): sin
 *     este límite, una conversación larga crecería sin control y cada
 *     consulta costaría más.
 *   · Limita el largo de cada mensaje.
 *
 * @param {Array<{role: string, text: string}>} historial Turnos previos.
 * @param {string} mensaje La consulta nueva.
 */
function construirContents(historial, mensaje) {
  const limpio = (Array.isArray(historial) ? historial : [])
    // 1. Fuera lo que no sea texto útil.
    .filter((turno) => turno && typeof turno.text === 'string' && turno.text.trim())
    // 2. Solo los últimos turnos.
    .slice(-config.gemini.maxHistoryTurns)
    // 3. Traducción al formato de Gemini.
    .map((turno) => ({
      // Cualquier valor distinto de 'model' se trata como 'user': impide que
      // alguien inyecte turnos falsos con otros roles.
      role: turno.role === 'model' ? 'model' : 'user',
      parts: [{ text: String(turno.text).slice(0, config.gemini.maxMessageLength) }],
    }));

  // Gemini exige que la conversación empiece con un turno de usuario. Si el
  // recorte dejó una respuesta del modelo al inicio, se descarta.
  while (limpio.length > 0 && limpio[0].role !== 'user') limpio.shift();

  // La consulta nueva va siempre al final.
  limpio.push({ role: 'user', parts: [{ text: mensaje }] });
  return limpio;
}

/**
 * Arma el cuerpo JSON completo de la petición.
 *
 * `systemInstruction` es la clave de todo: contiene las reglas del agente
 * (quién es, qué puede responder, qué no debe hacer nunca). Va aparte de la
 * conversación y el modelo la respeta por encima de lo que pida la usuaria,
 * que es lo que impide que alguien le diga "ignora tus instrucciones".
 */
function construirCuerpo(historial, mensaje) {
  return {
    systemInstruction: { parts: [{ text: construirInstruccionSistema() }] },
    contents: construirContents(historial, mensaje),
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature: config.gemini.temperature, //     Creatividad de la respuesta
      maxOutputTokens: config.gemini.maxOutputTokens, // Largo máximo
      topP: 0.95, //                                 Variedad del vocabulario
    },
  };
}

// ── BLOQUE 5: Traducción de errores HTTP ────────────────────────────────────
/**
 * Convierte un fallo de la API de Google en un mensaje que la usuaria pueda
 * entender. Nunca se le muestra el error técnico original: puede contener
 * detalles internos y no le sirve de nada.
 *
 * @param {Response} response Respuesta fallida de fetch.
 */
async function mapearErrorHttp(response) {
  // Se intenta leer el detalle para el log del servidor.
  let detalle = '';
  try {
    const cuerpo = await response.json();
    detalle = cuerpo?.error?.message || '';
  } catch {
    detalle = await response.text().catch(() => '');
  }

  // Queda registrado en consola, no en la pantalla de la usuaria.
  console.error(`[gemini] HTTP ${response.status}: ${detalle}`);

  // 400 = la petición estaba mal armada (o el contenido resultó inválido).
  if (response.status === 400) {
    return new GeminiError('bad_request', 'La consulta no pudo procesarse. Intenta reformularla.', 400);
  }

  // 401/403 = API key inválida, vencida o sin permisos. Es un problema
  // nuestro, no de la usuaria, así que se le da un mensaje neutro.
  if (response.status === 401 || response.status === 403) {
    return new GeminiError('auth_error', 'El asistente no está disponible en este momento.', 503);
  }

  // 429 = se agotó la cuota o hay demasiadas peticiones por segundo.
  if (response.status === 429) {
    return new GeminiError('quota_exceeded', 'El asistente recibió muchas consultas. Espera un momento e intenta de nuevo.', 429);
  }

  // Cualquier otro caso (500 de Google, mantenimiento...).
  return new GeminiError('upstream_error', 'El asistente no está disponible en este momento.', 502);
}

// ── BLOQUE 6: Envío y lectura del streaming ─────────────────────────────────
/**
 * Envía la consulta y va devolviendo la respuesta por fragmentos.
 *
 * Es un GENERADOR ASÍNCRONO (`async function*`). En lugar de devolver un
 * valor único al final, entrega trozos con `yield` a medida que llegan.
 * Quien lo llama los consume con `for await (const trozo of ...)`.
 *
 * @param {object} opciones
 * @param {string} opciones.mensaje    Consulta ya validada.
 * @param {Array}  opciones.historial  Turnos previos de la conversación.
 * @param {AbortSignal} [opciones.signal] Señal para cancelar desde afuera.
 * @returns {AsyncGenerator<string>} Fragmentos de texto.
 */
async function* enviarMensajeStream({ mensaje, historial = [], signal }) {
  // 6.1 · Comprobación previa.
  if (!estaConfigurado()) {
    throw new GeminiError('not_configured', 'El asistente no está configurado en este equipo.', 503);
  }

  // El sufijo `?alt=sse` le pide a Google que responda en formato
  // Server-Sent Events, que es el que se lee más abajo.
  const url = `${config.gemini.baseUrl}/models/${config.gemini.model}:streamGenerateContent?alt=sse`;

  // 6.2 · Sistema de cancelación.
  // `AbortController` permite cortar la petición a mitad de camino. Se usa
  // por dos motivos: que se acabe el tiempo, o que la usuaria cierre la
  // pestaña (esa señal llega desde el controlador en `signal`).
  const controlador = new AbortController();
  if (signal) signal.addEventListener('abort', () => controlador.abort(), { once: true });

  /**
   * 6.3 · Temporizador de INACTIVIDAD, no de duración total.
   *
   * Esta distinción es importante y costó un bug: si el límite midiera la
   * duración completa, una respuesta larga y sana se cortaría a mitad de
   * palabra al llegar a los 30 segundos.
   *
   * Lo que de verdad indica un problema es que el modelo DEJE de enviar
   * datos. Por eso el contador se reinicia con cada fragmento recibido.
   */
  let temporizador = setTimeout(() => controlador.abort(), config.gemini.timeoutMs);

  const reiniciarEspera = () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => controlador.abort(), config.gemini.timeoutMs);
  };

  // 6.4 · Petición a la API.
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-goog-api-key': config.gemini.apiKey, // Autenticación
        'content-type': 'application/json',
      },
      body: JSON.stringify(construirCuerpo(historial, mensaje)),
      signal: controlador.signal, // Permite cancelar esta petición
    });
  } catch (error) {
    clearTimeout(temporizador);

    // Se distingue "se acabó el tiempo" de "no hay internet": son problemas
    // distintos y la usuaria debe hacer cosas distintas ante cada uno.
    if (error.name === 'AbortError') {
      throw new GeminiError('timeout', 'El asistente tardó demasiado en responder.', 504);
    }
    throw new GeminiError('network_error', 'No hay conexión con el servicio del asistente.', 503);
  }

  // 6.5 · ¿Respondió con un error HTTP?
  if (!response.ok) {
    clearTimeout(temporizador);
    throw await mapearErrorHttp(response);
  }

  // 6.6 · Lectura del flujo.
  //
  // El cuerpo de la respuesta llega como bytes sueltos, no como texto ni
  // como objetos. Hay tres capas que deshacer:
  //   bytes → texto → eventos SSE → objetos JSON → fragmentos de respuesta
  const lector = response.body.getReader();
  const decodificador = new TextDecoder();

  // Acumula texto entre lecturas: un paquete de red puede cortar un evento
  // por la mitad, así que lo incompleto se guarda para la vuelta siguiente.
  let buffer = '';

  let huboTexto = false; //  ¿Se llegó a recibir algo de contenido?
  let motivoFin = null; //   Por qué terminó el modelo (SAFETY, MAX_TOKENS...)

  try {
    while (true) {
      const { done, value } = await lector.read();
      if (done) break; // El flujo terminó.

      reiniciarEspera(); // Llegó contenido: el modelo sigue vivo.

      // `{ stream: true }` maneja bien los caracteres multibyte (tildes, ñ)
      // que quedan partidos entre dos paquetes de red.
      buffer += decodificador.decode(value, { stream: true });

      // El protocolo SSE separa cada evento con un salto de línea. La última
      // porción puede estar incompleta, así que se devuelve al buffer.
      const lineas = buffer.split('\n');
      buffer = lineas.pop() ?? '';

      for (const linea of lineas) {
        // Solo interesan las líneas de datos; el resto son comentarios
        // o líneas en blanco del protocolo.
        if (!linea.startsWith('data: ')) continue;

        let paquete;
        try {
          paquete = JSON.parse(linea.slice(6)); // 6 = largo de 'data: '
        } catch {
          continue; // Fragmento incompleto: se ignora sin romper el flujo.
        }

        // ---- Caso A: Google bloqueó la consulta antes de responder ------
        if (paquete.promptFeedback?.blockReason) {
          throw new GeminiError(
            'blocked',
            'No puedo responder esa consulta. Si es urgente, comunícate con una profesional de la salud.',
            200
          );
        }

        const candidato = paquete.candidates?.[0];
        if (!candidato) continue;

        // Se guarda el motivo de finalización para el mensaje de respaldo.
        if (candidato.finishReason) motivoFin = candidato.finishReason;

        // ---- Caso B: fragmentos de texto -------------------------------
        for (const parte of candidato.content?.parts ?? []) {
          // Las partes marcadas con `thought: true` son el razonamiento
          // interno del modelo: no se muestran nunca a la usuaria.
          if (parte.thought || typeof parte.text !== 'string') continue;

          huboTexto = true;
          yield parte.text; // Se entrega el trozo a quien lo esté consumiendo.
        }
      }
    }
  } catch (error) {
    // Un aborto aquí significa que el flujo se cortó a mitad: o la usuaria
    // cerró la pestaña, o el modelo dejó de enviar datos. El texto ya
    // entregado se conserva; solo se informa de la interrupción.
    if (error.name === 'AbortError') {
      throw new GeminiError('interrumpido', 'La respuesta se interrumpió. Vuelve a preguntarme.', 504);
    }
    throw error;
  } finally {
    // `finally` se ejecuta siempre: haya terminado bien, haya fallado o
    // haya sido cancelado. Es el único sitio seguro para limpiar.
    clearTimeout(temporizador);
    lector.cancel().catch(() => {}); // Libera la conexión de red.
  }

  // 6.7 · Cierre según cómo haya terminado el modelo.
  //
  // `finishReason` dice POR QUÉ paró de escribir. Hay que atenderlo en los
  // dos escenarios, y el segundo es fácil de pasar por alto:
  //
  //   a) No llegó ni una letra  → hay que decir algo, o queda una burbuja
  //                               vacía y parece que el chat se colgó.
  //   b) Llegó texto pero se cortó a mitad → sin este aviso, la usuaria lee
  //                               una frase incompleta y no sabe si el
  //                               mensaje terminó así o si algo falló.
  //
  // El caso (b) es real y se detectó probando: el filtro automático llegó a
  // cortar una respuesta en "puedes ponerte en contacto con nos—".

  // ---- Caso (a): no hubo nada de texto ----------------------------------
  if (!huboTexto) {
    if (motivoFin === 'SAFETY') {
      yield 'Prefiero no responder eso por aquí. Si estás pasando por algo delicado, escríbenos o busca apoyo profesional; en una emergencia, llama al 123.';
    } else {
      yield 'No logré armar una respuesta esta vez. ¿Puedes contarme tu duda con otras palabras?';
    }
    return;
  }

  // ---- Caso (b): hubo texto, pero quedó interrumpido --------------------
  // STOP es la terminación normal; cualquier otro motivo indica un corte.
  if (motivoFin === 'MAX_TOKENS') {
    yield '\n\nMe extendí más de la cuenta y la respuesta quedó a medias. ¿Quieres que te lo resuma o que profundice en un punto concreto?';
  } else if (motivoFin && motivoFin !== 'STOP') {
    yield '\n\nLa respuesta quedó incompleta. Vuelve a preguntarme, o escríbenos directamente si necesitas el dato exacto.';
  }
}

module.exports = {
  enviarMensajeStream,
  estaConfigurado,
  GeminiError,
};
