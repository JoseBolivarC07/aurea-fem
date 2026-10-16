/**
 * PESTAÑAS DE LAS ETAPAS ACOMPAÑADAS
 * ==================================
 *
 * Solo se carga en /servicios. Controla el panel donde cada etapa (pubertad,
 * menstruación, embarazo, menopausia, procesos médicos) tiene su pestaña.
 *
 * SIGUE EL PATRÓN ARIA DE "TABS"
 * Es el estándar de accesibilidad para este componente. En resumen:
 *   · Tab entra y sale del grupo de pestañas (no las recorre una a una).
 *   · Dentro del grupo se navega con las FLECHAS.
 *   · Inicio y Fin saltan a la primera y a la última.
 *   · Solo la pestaña activa es alcanzable con Tab (`tabIndex = 0`); las
 *     demás quedan en -1.
 * Esto último puede parecer raro, pero es justo lo que evita que alguien que
 * navegue con teclado tenga que pulsar Tab cinco veces para pasar de largo.
 *
 * SIN JAVASCRIPT: el HTML llega con el primer panel visible y el resto con
 * el atributo `hidden`. Se pierde el cambio de pestaña, no la información
 * principal.
 */

function iniciarPestanas() {
  // ── BLOQUE 1: Elementos ───────────────────────────────────────────────────
  const navegacion = document.querySelector('[data-pestanas]');
  if (!navegacion) return; // No estamos en /servicios

  // `Array.from` convierte la lista del DOM en un array real, para poder
  // usar métodos como `findIndex` o `some` que no existen en un NodeList.
  const pestanas = Array.from(navegacion.querySelectorAll('[data-pestana]'));
  const paneles = Array.from(document.querySelectorAll('[data-panel]'));
  if (pestanas.length === 0) return;

  // Se marca el contenedor como lista de pestañas para lectores de pantalla.
  // Se hace desde JavaScript y no en el HTML porque sin JS no hay pestañas
  // reales que anunciar: sería mentirle a la tecnología de asistencia.
  navegacion.setAttribute('role', 'tablist');

  // ── BLOQUE 2: Activar una etapa ───────────────────────────────────────────
  /**
   * @param {string} id        Identificador de la etapa ('embarazo', etc.).
   * @param {boolean} moverFoco Si se mueve el foco (solo al usar el teclado).
   */
  function activar(id, moverFoco = false) {
    // 2.1 · Actualizar las pestañas.
    pestanas.forEach((pestana) => {
      const activa = pestana.dataset.pestana === id;

      pestana.classList.toggle('es-activa', activa); //     Aspecto (CSS)
      pestana.setAttribute('aria-selected', String(activa)); // Lectores

      // La clave del patrón: solo la activa entra en el recorrido de Tab.
      pestana.tabIndex = activa ? 0 : -1;

      // Al navegar con flechas, el foco debe seguir a la pestaña activa;
      // al hacer clic, no (el foco ya está donde la persona lo puso).
      if (activa && moverFoco) pestana.focus();
    });

    // 2.2 · Mostrar el panel correspondiente y ocultar los demás.
    paneles.forEach((panel) => {
      const activo = panel.dataset.panel === id;

      // `hidden` lo oculta de verdad: no aparece para lectores de pantalla
      // ni es alcanzable con Tab. Con `display:none` en CSS pasaría igual,
      // pero el atributo deja la intención escrita en el HTML.
      panel.hidden = !activo;
      panel.classList.toggle('es-activo', activo); // Dispara la animación
    });
  }

  // ── BLOQUE 3: Clic con el ratón ───────────────────────────────────────────
  pestanas.forEach((pestana) => {
    pestana.addEventListener('click', () => activar(pestana.dataset.pestana));
  });

  // ── BLOQUE 4: Navegación con el teclado ───────────────────────────────────
  navegacion.addEventListener('keydown', (evento) => {
    // Posición de la pestaña que tiene el foco ahora mismo.
    const actual = pestanas.findIndex((pestana) => pestana.dataset.pestana === evento.target.dataset.pestana);
    if (actual === -1) return; // El foco no está en una pestaña

    // Mapa de tecla → posición destino. Se aceptan las flechas verticales
    // además de las horizontales porque en móvil las pestañas se apilan.
    const movimientos = {
      ArrowRight: actual + 1,
      ArrowDown: actual + 1,
      ArrowLeft: actual - 1,
      ArrowUp: actual - 1,
      Home: 0,
      End: pestanas.length - 1,
    };

    if (!(evento.key in movimientos)) return; // Otra tecla: no nos toca

    // Evita que las flechas desplacen la página mientras se navega.
    evento.preventDefault();

    // El módulo (%) hace que el recorrido sea circular: de la última pestaña
    // se pasa a la primera. Sumar `pestanas.length` antes evita el índice
    // negativo que daría retroceder desde la primera.
    const destino = (movimientos[evento.key] + pestanas.length) % pestanas.length;
    activar(pestanas[destino].dataset.pestana, true);
  });

  // ── BLOQUE 5: Enlaces directos a una etapa ────────────────────────────────
  // Permite que la portada enlace a /servicios#embarazo y la página abra
  // directamente esa pestaña.
  const ancla = window.location.hash.slice(1); // Quita el '#'

  // Se comprueba que el ancla corresponda a una pestaña real: alguien podría
  // escribir cualquier cosa en la barra de direcciones.
  if (ancla && pestanas.some((pestana) => pestana.dataset.pestana === ancla)) {
    activar(ancla);

    // El navegador no sabe llevar al ancla (el id es de la pestaña, y el panel
    // cambia de alto al activarse): se lleva la lista de pestañas al borde
    // superior. Su `scroll-margin-top` la deja bajo la cabecera fija.
    navegacion.scrollIntoView({ block: 'start' });
  } else {
    activar(pestanas[0].dataset.pestana); // Por defecto, la primera
  }
}

iniciarPestanas();
