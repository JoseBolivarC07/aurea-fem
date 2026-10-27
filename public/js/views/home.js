/**
 * COMPORTAMIENTO EXCLUSIVO DE LA PORTADA
 * ======================================
 *
 * Solo se carga en la página de inicio.
 *
 * QUÉ HACE: los tres anillos concéntricos del fondo se desplazan más despacio
 * que el resto de la página al hacer scroll. Es un efecto de paralaje.
 *
 * POR QUÉ TAN SUTIL: el desplazamiento máximo es del 35% de lo que recorre la
 * página, y cada anillo se mueve a distinta velocidad. La idea es que aporte
 * profundidad sin que se note como "un efecto"; si se percibe, está de más.
 */

// Factor máximo de desplazamiento. Con 0.35, el anillo más externo se mueve
// un 35% de lo que se desplaza la página. Subirlo lo volvería llamativo.
const FACTOR_MAXIMO = 0.35;

function iniciarParalaje() {
  // ── BLOQUE 1: Comprobaciones previas ──────────────────────────────────────
  const anillos = document.querySelectorAll('.portada__anillo');
  const portada = document.querySelector('.portada');
  if (!portada || anillos.length === 0) return;

  /**
   * RESPETO POR LA PREFERENCIA DE MOVIMIENTO
   *
   * Quien tenga activado "reducir movimiento" en su sistema operativo no
   * recibe el efecto. No es un capricho: el movimiento con el scroll puede
   * provocar mareo o malestar a personas con trastornos vestibulares.
   *
   * El CSS ya respeta esa preferencia en sus animaciones, pero este efecto
   * se genera desde JavaScript, así que hay que comprobarlo también aquí.
   */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // ── BLOQUE 2: Cálculo del desplazamiento ──────────────────────────────────
  let pendiente = false;

  const actualizar = () => {
    const desplazamiento = window.scrollY;

    // Si ya se pasó la portada, los anillos están fuera de la pantalla y no
    // tiene sentido seguir calculando: se ahorra trabajo en toda la página.
    if (desplazamiento <= portada.offsetHeight) {
      anillos.forEach((anillo, indice) => {
        // Cada anillo recibe un factor mayor que el anterior. Al moverse a
        // velocidades distintas se genera la sensación de profundidad; si
        // todos usaran el mismo factor, parecerían una sola imagen plana.
        const factor = (FACTOR_MAXIMO / anillos.length) * (indice + 1);

        // Se usa la propiedad `translate` y NO `transform` a propósito: el
        // CSS ya usa `transform` para la animación de flotación. Al ser
        // propiedades distintas, se combinan en lugar de pisarse.
        anillo.style.translate = `0 ${desplazamiento * factor}px`;
      });
    }

    pendiente = false;
  };

  // ── BLOQUE 3: Escuchador optimizado ───────────────────────────────────────
  // Mismo patrón que en `nav.js`: el evento solo agenda el trabajo y
  // `requestAnimationFrame` lo ejecuta una vez por fotograma, justo antes de
  // que el navegador repinte. Es lo que mantiene el scroll fluido.
  window.addEventListener(
    'scroll',
    () => {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(actualizar);
    },
    { passive: true }
  );
}

iniciarParalaje();
