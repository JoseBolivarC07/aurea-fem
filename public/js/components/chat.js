/**
 * WIDGET DEL AGENTE ORIENTADOR "AURA"
 * ===================================
 *
 * Es la parte del chat que corre EN EL NAVEGADOR. Su contraparte en el
 * servidor es `src/app/controllers/chat.controller.js`.
 *
 * QUÉ HACE
 *   · Abre y cierra el panel del chat.
 *   · Pide al servidor el saludo y las preguntas sugeridas.
 *   · Envía las consultas y pinta la respuesta MIENTRAS se escribe.
 *   · Recuerda la conversación para que Aura entienda el contexto.
 *
 * LO QUE NO HACE: hablar con Google. Solo conoce `/api/chat`, una ruta de
 * nuestro propio servidor. Por eso la clave de la API nunca llega aquí, ni
 * abriendo las herramientas de desarrollo.
 *
 * CÓMO LO ABREN LAS DEMÁS PÁGINAS
 * Mediante un evento, sin importar este módulo ni conocer sus funciones:
 *
 *     document.dispatchEvent(new CustomEvent('aurea:chat', {
 *       detail: { mensaje: 'texto opcional' }
 *     }));
 *
 * Así el catálogo puede abrir el chat con una pregunta ya escrita sin que
 * `productos.js` y `chat.js` dependan el uno del otro.
 */

// Cuántos turnos previos se envían como contexto. Más contexto = respuestas
// más coherentes, pero también consultas más costosas y lentas.
const MAXIMO_HISTORIAL = 12;

// ── BLOQUE 1: Seguridad al mostrar texto ────────────────────────────────────
/**
 * Convierte texto en HTML seguro.
 *
 * POR QUÉ ES IMPRESCINDIBLE
 * Si se insertara la respuesta con `innerHTML` sin limpiarla, un texto que
 * contuviera `<script>` se ejecutaría como código. Es la vulnerabilidad XSS.
 *
 * EL TRUCO
 * Se asigna el texto a `textContent` (que NO interpreta HTML, solo escribe
 * letras) y luego se lee el `innerHTML` resultante: el navegador ya convirtió
 * `<` en `&lt;` y `>` en `&gt;`. Es el escapado del propio navegador, más
 * fiable que cualquier lista de reemplazos hecha a mano.
 */
function escapar(texto) {
  const nodo = document.createElement('div');
  nodo.textContent = texto;
  return nodo.innerHTML;
}

// ── BLOQUE 2: Formato de la respuesta ───────────────────────────────────────
/**
 * Convierte el texto plano del modelo en HTML sencillo: negritas y viñetas.
 *
 * ORDEN IMPORTANTE: se escapa PRIMERO y se da formato DESPUÉS. Así, si el
 * modelo escribiera literalmente `<b>`, se vería como texto; y las etiquetas
 * que se generan aquí son las únicas que llegan a interpretarse.
 *
 * SE APLICA AL FINAL, no durante el streaming: si se formateara con cada
 * fragmento, se generaría marcado a medias (un `<ul>` sin cerrar, un `**`
 * suelto) y el navegador lo intentaría arreglar produciendo desastres.
 * Durante el streaming se usa `textContent`, que es a prueba de todo.
 */
function formatear(texto) {
  const lineas = escapar(texto).split('\n');
  const salida = [];
  let enLista = false; // ¿Estamos dentro de un <ul> abierto?

  for (const linea of lineas) {
    // Detecta viñetas escritas con -, * o •
    const esViñeta = /^\s*[-*•]\s+/.test(linea);

    if (esViñeta) {
      // Primera viñeta del grupo: hay que abrir la lista.
      if (!enLista) {
        salida.push('<ul>');
        enLista = true;
      }
      // Se quita el guion inicial: el estilo del punto lo pone el CSS.
      salida.push(`<li>${linea.replace(/^\s*[-*•]\s+/, '')}</li>`);
      continue;
    }

    // Línea normal después de viñetas: se cierra la lista.
    if (enLista) {
      salida.push('</ul>');
      enLista = false;
    }

    if (linea.trim()) salida.push(linea);
    else salida.push(''); // Línea vacía = separación de párrafos
  }

  // Si el texto terminó dentro de una lista, se cierra.
  if (enLista) salida.push('</ul>');

  // Por último, las negritas: **texto** → <strong>texto</strong>
  return salida.join('\n').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

// ── BLOQUE 3: Función principal ─────────────────────────────────────────────
export function iniciarChat() {
  // 3.1 · Búsqueda de los elementos del widget.
  const raiz = document.querySelector('[data-chat]');

  // Si el widget no está en la página (login, páginas de error), se sale sin
  // hacer nada. Sin esta salida, todo lo de abajo fallaría con "null".
  if (!raiz) return;

  // Se seleccionan por atributos `data-*` y no por clases CSS a propósito:
  // así se puede reestilizar el chat sin miedo a romper el JavaScript.
  const panel = raiz.querySelector('[data-chat-panel]');
  const botonAbrir = raiz.querySelector('[data-chat-abrir]');
  const botonCerrar = raiz.querySelector('[data-chat-cerrar]');
  const contenedor = raiz.querySelector('[data-chat-mensajes]');
  const cajaSugerencias = raiz.querySelector('[data-chat-sugerencias]');
  const formulario = raiz.querySelector('[data-chat-form]');
  const entrada = raiz.querySelector('[data-chat-entrada]');
  const botonEnviar = raiz.querySelector('[data-chat-enviar]');
  const estado = raiz.querySelector('[data-chat-estado]');

  // 3.2 · Estado interno del widget.
  /** Conversación completa, en el formato que espera el servidor. */
  const historial = [];
  let iniciado = false; //  ¿Ya se pidió el estado al servidor?
  let generando = false; // ¿Hay una respuesta en curso?
  let disponible = true; // ¿El servicio está configurado?

  // ══ SECCIÓN A: Utilidades de interfaz ═════════════════════════════════════

  /** ¿El scroll está cerca del final? (margen de 80 px) */
  const alFinal = () => contenedor.scrollHeight - contenedor.scrollTop - contenedor.clientHeight < 80;

  /**
   * Baja el scroll al último mensaje.
   *
   * Solo lo hace si la usuaria ya estaba abajo. Si subió a releer algo, se
   * respeta su posición en lugar de arrastrarla: nada más molesto que un
   * chat que te tira hacia abajo mientras estás leyendo.
   */
  const bajar = (forzar = false) => {
    if (forzar || alFinal()) contenedor.scrollTop = contenedor.scrollHeight;
  };

  /**
   * Crea y añade una burbuja de mensaje.
   * @param {'aura'|'usuaria'|'sistema'} tipo Define el color y la alineación.
   * @param {string} texto Contenido inicial (puede empezar vacío).
   * @returns {HTMLElement} La burbuja, para poder seguir escribiendo en ella.
   */
  function agregarBurbuja(tipo, texto = '') {
    const burbuja = document.createElement('div');
    burbuja.className = `burbuja burbuja--${tipo}`;
    burbuja.textContent = texto; // textContent, nunca innerHTML: es seguro
    contenedor.appendChild(burbuja);
    bajar(true);
    return burbuja;
  }

  /**
   * Muestra los tres puntitos de "está escribiendo".
   * Ocupa el lugar de la respuesta hasta que llega el primer fragmento; sin
   * él, habría un silencio incómodo de un par de segundos.
   */
  function mostrarEscribiendo() {
    const burbuja = document.createElement('div');
    burbuja.className = 'burbuja burbuja--aura';
    // HTML fijo escrito por nosotras, sin datos externos: aquí es seguro.
    burbuja.innerHTML = '<span class="escribiendo"><span></span><span></span><span></span></span>';
    contenedor.appendChild(burbuja);
    bajar(true);
    return burbuja;
  }

  /** Pinta los botones de preguntas sugeridas que envía el servidor. */
  function pintarSugerencias(sugerencias) {
    cajaSugerencias.innerHTML = '';

    if (!sugerencias?.length) {
      cajaSugerencias.hidden = true;
      return;
    }

    sugerencias.forEach((texto) => {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'sugerencia';
      boton.textContent = texto;

      // Al pulsar: se ocultan las sugerencias y se envía esa pregunta.
      boton.addEventListener('click', () => {
        cajaSugerencias.hidden = true;
        enviar(texto);
      });

      cajaSugerencias.appendChild(boton);
    });

    cajaSugerencias.hidden = false;
  }

  /**
   * Bloquea o desbloquea el envío.
   * Evita que se manden dos consultas a la vez, lo que mezclaría las
   * respuestas en pantalla y gastaría cuota de más.
   */
  function bloquearEnvio(bloqueado) {
    generando = bloqueado;
    botonEnviar.disabled = bloqueado;
    botonEnviar.classList.toggle('esta-generando', bloqueado); // Gira el icono
    entrada.disabled = bloqueado;
  }

  // ══ SECCIÓN B: Arranque perezoso ══════════════════════════════════════════

  /**
   * Consulta el estado del servicio la PRIMERA vez que se abre el chat.
   *
   * No se hace al cargar la página: la mayoría de visitantes no abrirá el
   * chat, y sería una petición inútil en cada visita. La bandera `iniciado`
   * garantiza que solo ocurra una vez.
   */
  async function cargarEstado() {
    if (iniciado) return;
    iniciado = true;

    try {
      const respuesta = await fetch('/api/chat/estado');
      const datos = await respuesta.json();

      agregarBurbuja('aura', datos.bienvenida);
      disponible = datos.disponible;

      if (datos.disponible) {
        pintarSugerencias(datos.sugerencias);
      } else {
        // Sin API key configurada: se avisa con claridad y se ofrece una
        // alternativa real, en lugar de dejar un chat que no responde.
        estado.textContent = 'No disponible en este equipo';
        estado.classList.add('es-error');
        agregarBurbuja(
          'sistema',
          'El asistente no está configurado. Escríbenos por el formulario de contacto y te respondemos.'
        );
        bloquearEnvio(true);
      }
    } catch {
      // El servidor no respondió: normalmente porque no está encendido.
      agregarBurbuja('sistema', 'No se pudo contactar con el asistente. Revisa que el servidor esté encendido.');
      disponible = false;
      bloquearEnvio(true);
    }
  }

  // ══ SECCIÓN C: Envío y lectura del streaming ══════════════════════════════

  /**
   * Envía una consulta y pinta la respuesta a medida que llega.
   * @param {string} mensaje
   */
  async function enviar(mensaje) {
    const texto = mensaje.trim();

    // Tres motivos para no enviar: vacío, ya hay una respuesta en curso,
    // o el servicio no está disponible.
    if (!texto || generando || !disponible) return;

    // C.1 · Preparar la interfaz.
    cajaSugerencias.hidden = true;
    agregarBurbuja('usuaria', texto); // Se muestra de inmediato
    entrada.value = '';
    ajustarAltura();
    bloquearEnvio(true);

    const indicador = mostrarEscribiendo();
    let respuesta = ''; //   Texto acumulado
    let burbuja = null; //   Burbuja de Aura (se crea al primer fragmento)

    try {
      // C.2 · Petición al servidor.
      const peticion = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mensaje: texto,
          // Solo los últimos turnos: el servidor recorta igual, pero enviar
          // menos ahorra ancho de banda.
          historial: historial.slice(-MAXIMO_HISTORIAL),
        }),
      });

      // C.3 · Errores que llegan como JSON normal (validación, cuota,
      // servicio caído). Ocurren ANTES de que empiece el streaming.
      if (!peticion.ok) {
        const error = await peticion.json().catch(() => ({}));
        indicador.remove();
        agregarBurbuja('sistema', error.message || 'No pude responder en este momento.');
        return;
      }

      // C.4 · Lectura del flujo SSE.
      //
      // `getReader()` da acceso a los bytes según llegan, sin esperar al
      // final. Es lo que permite ver la respuesta escribiéndose.
      const lector = peticion.body.getReader();
      const decodificador = new TextDecoder();
      let buffer = ''; // Guarda lo que quedó a medias entre dos lecturas

      while (true) {
        const { done, value } = await lector.read();
        if (done) break;

        // `{ stream: true }` maneja bien las tildes y las ñ que quedan
        // partidas entre dos paquetes de red.
        buffer += decodificador.decode(value, { stream: true });

        // Los eventos SSE se separan con una línea en blanco (\n\n).
        // El último trozo puede estar incompleto: vuelve al buffer.
        const bloques = buffer.split('\n\n');
        buffer = bloques.pop() ?? '';

        for (const bloque of bloques) {
          // Cada bloque tiene la forma:
          //   event: fragmento
          //   data: {"texto":"..."}
          const nombre = bloque.match(/^event:\s*(.+)$/m)?.[1]?.trim();
          const carga = bloque.match(/^data:\s*(.+)$/m)?.[1];
          if (!carga) continue;

          let datos;
          try {
            datos = JSON.parse(carga);
          } catch {
            continue; // Bloque corrupto: se ignora sin romper el resto
          }

          // ---- Evento 'fragmento': un trozo de la respuesta -------------
          if (nombre === 'fragmento') {
            // El primer fragmento reemplaza los puntitos por la burbuja real.
            if (!burbuja) {
              indicador.remove();
              burbuja = agregarBurbuja('aura');
            }

            respuesta += datos.texto;
            burbuja.textContent = respuesta; // textContent: seguro y sin formato
            bajar();
          }
          // ---- Evento 'error': algo falló a mitad ----------------------
          else if (nombre === 'error') {
            indicador.remove();
            if (burbuja) burbuja.remove();
            agregarBurbuja('sistema', datos.message);
            return;
          }
        }
      }

      // C.5 · Cierre: la respuesta está completa.
      if (burbuja && respuesta) {
        // AHORA sí se aplica el formato (negritas y viñetas), con el texto
        // entero y por tanto sin riesgo de marcado a medias.
        burbuja.innerHTML = formatear(respuesta);

        // Se guardan los dos turnos para que la próxima consulta tenga
        // contexto y Aura entienda frases como "¿y cuánto cuesta?".
        historial.push({ role: 'user', text: texto });
        historial.push({ role: 'model', text: respuesta });

        bajar();
      } else {
        // El flujo terminó sin una sola letra.
        indicador.remove();
        agregarBurbuja('sistema', 'No recibí respuesta. Intenta de nuevo.');
      }
    } catch {
      // Fallo de red a mitad del streaming (se cayó el wifi, se apagó el
      // servidor). Se limpia lo incompleto y se explica qué pasó.
      indicador.remove();
      if (burbuja) burbuja.remove();
      agregarBurbuja('sistema', 'Se perdió la conexión con el asistente. Revisa tu internet e intenta otra vez.');
    } finally {
      // Pase lo que pase, se desbloquea el formulario. Sin este `finally`,
      // un error dejaría el chat congelado para siempre.
      bloquearEnvio(false);
      entrada.focus();
    }
  }

  // ══ SECCIÓN D: Apertura y cierre ══════════════════════════════════════════

  /**
   * Abre el panel.
   * @param {string} [mensajeInicial] Consulta a enviar automáticamente
   *        (la usa el botón "Consultar" del catálogo).
   */
  function abrir(mensajeInicial) {
    raiz.classList.add('es-abierto'); // El CSS oculta el lanzador (display: none) mientras el chat está abierto
    panel.hidden = false;
    botonAbrir.setAttribute('aria-expanded', 'true'); // Para lectores de pantalla

    // El estado se carga primero; solo entonces se envía el mensaje inicial,
    // para que el saludo aparezca antes que la pregunta.
    cargarEstado().then(() => {
      if (mensajeInicial) enviar(mensajeInicial);
    });

    // El foco espera a que termine la animación de entrada (260 ms): moverlo
    // antes provocaría un salto visual.
    setTimeout(() => entrada.focus(), 260);
  }

  /** Cierra el panel y devuelve el foco al lanzador (accesibilidad). */
  function cerrar() {
    raiz.classList.remove('es-abierto');
    panel.hidden = true;
    botonAbrir.setAttribute('aria-expanded', 'false');
    botonAbrir.focus();
  }

  // ══ SECCIÓN E: Campo de texto que crece ═══════════════════════════════════

  /**
   * Ajusta la altura del textarea al contenido, hasta un máximo de 112 px.
   *
   * El truco de las dos líneas: poner la altura en 'auto' obliga al navegador
   * a recalcular `scrollHeight` (el alto real del texto). Sin ese paso, el
   * campo crecería pero nunca volvería a encogerse al borrar.
   */
  function ajustarAltura() {
    entrada.style.height = 'auto';
    entrada.style.height = `${Math.min(entrada.scrollHeight, 112)}px`;
  }

  // ══ SECCIÓN F: Escuchadores de eventos ════════════════════════════════════

  botonAbrir.addEventListener('click', () => abrir());
  botonCerrar.addEventListener('click', cerrar);

  // `preventDefault` evita que el formulario recargue la página, que es su
  // comportamiento por defecto.
  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    enviar(entrada.value);
  });

  entrada.addEventListener('input', ajustarAltura);

  // Enter envía; Shift+Enter hace salto de línea. Es lo que la gente espera
  // de un chat, aunque en un formulario normal Enter no haga eso.
  entrada.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter' && !evento.shiftKey) {
      evento.preventDefault();
      enviar(entrada.value);
    }
  });

  // Escape cierra el panel: convención de accesibilidad para todo lo que se
  // superpone al contenido.
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && !panel.hidden) cerrar();
  });

  // Punto de entrada para el resto del sitio (ver comentario de cabecera).
  document.addEventListener('aurea:chat', (evento) => {
    abrir(evento.detail?.mensaje);
  });

  // Cualquier botón con `data-abrir-chat` en el HTML abre el chat, sin
  // necesidad de escribir código nuevo para cada uno.
  document.querySelectorAll('[data-abrir-chat]').forEach((boton) => {
    boton.addEventListener('click', () => abrir());
  });
}
