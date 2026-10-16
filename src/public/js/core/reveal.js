/**
 * REVELADO DE ELEMENTOS AL HACER SCROLL
 * =====================================
 *
 * Hace que los bloques aparezcan con un desvanecido cuando entran en
 * pantalla, en lugar de estar todos visibles desde el inicio.
 *
 * CÓMO SE REPARTE EL TRABAJO
 *   · El CSS (`base/animations.css`) define el estado oculto y la transición.
 *   · Este archivo solo añade la clase `.es-visible` en el momento justo.
 * Ninguna animación se programa aquí: eso es trabajo del CSS, que lo hace
 * mucho mejor y sin ocupar el hilo principal.
 *
 * POR QUÉ IntersectionObserver Y NO EL EVENTO `scroll`
 * Escuchar `scroll` obligaría a preguntar la posición de cada elemento
 * decenas de veces por segundo, y cada consulta fuerza al navegador a
 * recalcular el diseño. El observador delega ese cálculo al navegador, que
 * lo resuelve fuera del hilo principal: la página no se traba ni en un móvil
 * modesto.
 *
 * SIN JAVASCRIPT: el CSS solo oculta los elementos si la clase `js-activo`
 * está en el <html> (la pone `no-fouc.js`). Si el JS falla, esa clase nunca
 * aparece y todo el contenido se ve normal. La animación es una mejora, no
 * un requisito para leer la página.
 */

// ── BLOQUE 1: Configuración del observador ──────────────────────────────────
const OPCIONES = {
  /**
   * `rootMargin` encoge o agranda la zona de detección.
   * El -5% inferior hace que la animación se dispare un poco ANTES de que
   * el elemento toque el borde de la pantalla. Con un margen mayor, en un
   * móvil los bloques del pie de la pantalla tardaban en aparecer.
   */
  rootMargin: '0px 0px -5% 0px',

  // Con 0 basta con que asome un píxel: los bloques muy altos (con un umbral
  // por porcentaje) nunca llegarían a cumplirlo en una pantalla pequeña.
  threshold: 0,
};

// ── BLOQUE 2: Puesta en marcha ──────────────────────────────────────────────
export function iniciarRevelado() {
  // Todos los elementos marcados en las plantillas con `data-revelar`.
  const elementos = document.querySelectorAll('[data-revelar]');
  if (elementos.length === 0) return;

  // Respaldo para navegadores muy antiguos sin IntersectionObserver: se
  // muestra todo de una vez. Se pierde la animación, no el contenido.
  if (!('IntersectionObserver' in window)) {
    elementos.forEach((elemento) => elemento.classList.add('es-visible'));
    return;
  }

  // ── BLOQUE 3: El observador ───────────────────────────────────────────────
  /**
   * La función se ejecuta cada vez que algún elemento observado entra o sale
   * de la zona de detección. Recibe solo los que CAMBIARON, no todos.
   */
  const observador = new IntersectionObserver((entradas, instancia) => {
    entradas.forEach((entrada) => {
      // Solo interesa la entrada, no la salida.
      if (!entrada.isIntersecting) return;

      // Esta clase dispara la transición definida en el CSS.
      entrada.target.classList.add('es-visible');

      // Se deja de observar el elemento: ya cumplió su función. Esto evita
      // que se vuelva a animar al subir y bajar, y libera recursos poco a
      // poco a medida que se recorre la página.
      instancia.unobserve(entrada.target);
    });
  }, OPCIONES);

  // Se registra cada elemento para su vigilancia.
  elementos.forEach((elemento) => observador.observe(elemento));
}
