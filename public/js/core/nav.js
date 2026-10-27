/**
 * CABECERA Y MENÚ DE NAVEGACIÓN
 * =============================
 *
 * Dos comportamientos independientes que comparten archivo por pertenecer al
 * mismo componente:
 *
 *   1. La cabecera cambia de aspecto al hacer scroll: empieza transparente
 *      sobre la portada y gana fondo difuminado en cuanto se baja.
 *   2. En pantallas pequeñas, el menú se despliega a pantalla completa.
 */

// Píxeles de scroll a partir de los cuales la cabecera cambia. Un valor bajo
// hace que reaccione de inmediato, sin que parezca que va con retraso.
const UMBRAL_SCROLL = 24;

// ── BLOQUE 1: Cabecera al hacer scroll ──────────────────────────────────────
/**
 * Añade o quita la clase `.es-desplazada` según la posición de la página.
 * El aspecto (fondo, difuminado, sombra, altura) lo define el CSS.
 */
function iniciarCabecera() {
  const cabecera = document.querySelector('[data-cabecera]');
  if (!cabecera) return;

  // Bandera para no encolar el mismo trabajo muchas veces.
  let pendiente = false;

  const actualizar = () => {
    // `toggle` con segundo argumento añade la clase si es true y la quita si
    // es false: más limpio que un if/else con add y remove.
    cabecera.classList.toggle('es-desplazada', window.scrollY > UMBRAL_SCROLL);
    pendiente = false;
  };

  /**
   * OPTIMIZACIÓN IMPORTANTE
   *
   * El evento `scroll` se dispara decenas de veces por segundo. Si se leyera
   * `window.scrollY` en cada disparo, el navegador tendría que recalcular el
   * diseño otras tantas veces y el scroll se notaría con tirones.
   *
   * La solución: el escuchador solo AGENDA el trabajo con
   * `requestAnimationFrame`, que lo ejecuta una vez por fotograma (unas 60
   * veces por segundo como máximo) y justo antes de repintar. La bandera
   * `pendiente` evita agendarlo dos veces seguidas.
   *
   * `{ passive: true }` le promete al navegador que no se va a bloquear el
   * scroll con `preventDefault()`, y eso le permite desplazar la página sin
   * esperar a que este código termine.
   */
  window.addEventListener(
    'scroll',
    () => {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(actualizar);
    },
    { passive: true }
  );

  // Primera ejecución: si la página se recarga a mitad de scroll, la
  // cabecera debe aparecer ya en su estado correcto.
  actualizar();
}

// ── BLOQUE 2: Menú desplegable en móvil ─────────────────────────────────────
function iniciarMenu() {
  const boton = document.querySelector('[data-menu-toggle]');
  const menu = document.getElementById('menu-principal');
  if (!boton || !menu) return;

  /**
   * Abre o cierra el menú y mantiene la accesibilidad al día.
   *
   * `aria-expanded` es lo que le dice a un lector de pantalla si el menú
   * está abierto o cerrado; sin él, alguien que navegue sin ver la pantalla
   * no tendría forma de saberlo. Además, el CSS lo usa para animar el icono
   * de hamburguesa hacia la equis.
   *
   * @param {boolean} abierto Estado deseado.
   */
  const cambiar = (abierto) => {
    boton.setAttribute('aria-expanded', String(abierto));
    boton.setAttribute('aria-label', abierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
    menu.classList.toggle('es-abierto', abierto);

    // Marca en <html> que el menú cubre la pantalla; el CSS la usa para
    // esconder el chat flotante.
    document.documentElement.classList.toggle('menu-abierto', abierto);

    // Bloquea el scroll del fondo mientras el menú cubre la pantalla: sin
    // esto, al deslizar sobre el menú se movería la página de atrás.
    document.body.style.overflow = abierto ? 'hidden' : '';
  };

  // El estado real vive en el atributo del HTML, no en una variable de
  // JavaScript: así solo hay una fuente de verdad y no pueden desincronizarse.
  const estaAbierto = () => boton.getAttribute('aria-expanded') === 'true';

  // 2.1 · El botón alterna el estado.
  boton.addEventListener('click', () => cambiar(!estaAbierto()));

  // 2.2 · Al tocar un enlace, el menú se cierra.
  // Se escucha en el menú completo (delegación de eventos) en lugar de poner
  // un escuchador en cada enlace: uno solo, y funciona aunque se agreguen
  // enlaces nuevos al modelo de navegación.
  menu.addEventListener('click', (evento) => {
    if (evento.target.closest('a')) cambiar(false);
  });

  // 2.3 · Escape cierra el menú y devuelve el foco al botón, para que quien
  // navegue con teclado no quede perdido en medio de la página.
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && estaAbierto()) {
      cambiar(false);
      boton.focus();
    }
  });

  // 2.4 · Si la ventana crece hasta el diseño de escritorio (girar el móvil,
  // agrandar la ventana), el menú desplegable sobra: el menú normal ya se ve.
  // Sin esto quedaría un panel a pantalla completa encima de todo.
  const consulta = window.matchMedia('(min-width: 60rem)');
  consulta.addEventListener('change', (evento) => {
    if (evento.matches && estaAbierto()) cambiar(false);
  });
}

// ── BLOQUE 3: Arranque ──────────────────────────────────────────────────────
export function iniciarNavegacion() {
  iniciarCabecera();
  iniciarMenu();
}
