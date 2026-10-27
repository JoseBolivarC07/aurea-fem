/**
 * FORMULARIO DE CONTACTO: VALIDACIÓN EN VIVO
 * ==========================================
 *
 * Solo se carga en /contacto. Hace dos cosas: contar los caracteres del
 * mensaje y avisar de los errores antes de enviar.
 *
 * IMPORTANTE — ESTO NO ES LA VALIDACIÓN DE VERDAD
 * El servidor valida siempre, otra vez, en `src/utils/validacion.js`. Esta
 * capa se puede saltar desactivando JavaScript o enviando la petición con
 * cualquier herramienta externa.
 *
 * Entonces, ¿para qué sirve? Para la experiencia: avisar de un correo mal
 * escrito al instante es mucho mejor que recargar la página entera y hacer
 * que la persona busque dónde estaba el error.
 *
 * Las reglas están duplicadas a propósito. Aquí, para avisar rápido; allá,
 * para proteger. Si se cambian, hay que cambiarlas en los dos sitios.
 */

// ── BLOQUE 1: Mensajes de error ─────────────────────────────────────────────
// Los mismos textos que usa el servidor, para que la persona no vea un
// mensaje distinto según por dónde le llegue el aviso.
const MENSAJES = {
  nombre: 'Escribe tu nombre para saber cómo dirigirnos a ti.',
  correo: 'Revisa el correo: parece que le falta algo.',
  mensaje: 'Cuéntanos un poco más para poder ayudarte bien.',
};

// ── BLOQUE 2: Reglas de validación ──────────────────────────────────────────
/**
 * Cada regla es una función que recibe el valor y devuelve true si es válido.
 * Guardarlas en un objeto permite recorrerlas con un bucle en vez de escribir
 * un if por campo, y agregar un campo nuevo es agregar una línea.
 *
 * Equivalentes a las de `src/utils/validacion.js`.
 */
const REGLAS = {
  nombre: (valor) => valor.trim().length >= 2,
  correo: (valor) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(valor.trim()),
  mensaje: (valor) => valor.trim().length >= 10,
};

// ── BLOQUE 3: Contador de caracteres ────────────────────────────────────────
/**
 * Muestra cuántos caracteres lleva escritos el mensaje.
 * Evita la frustración de escribir un texto largo y descubrir al final que
 * no cabía.
 */
function contarCaracteres(formulario) {
  const area = formulario.querySelector('#mensaje');
  const contador = formulario.querySelector('[data-contador]');
  if (!area || !contador) return;

  const actualizar = () => {
    contador.textContent = String(area.value.length);
  };

  area.addEventListener('input', actualizar);

  // Primera ejecución: si el formulario vuelve con datos tras un error del
  // servidor, el contador debe reflejar lo que ya hay escrito.
  actualizar();
}

// ── BLOQUE 4: Marcar y limpiar errores ──────────────────────────────────────
/**
 * Muestra el mensaje de error bajo un campo.
 *
 * Además del aspecto visual (la clase `tiene-error` pinta el borde de rojo),
 * pone dos atributos que son los que hacen el error perceptible para quien
 * usa un lector de pantalla:
 *   · `aria-invalid`     → anuncia que el campo tiene un problema
 *   · `aria-describedby` → enlaza el campo con el texto del error, para que
 *                          se lea al enfocarlo
 * Sin ellos, alguien que no ve la pantalla solo sabría que el formulario no
 * se envió, sin enterarse de por qué.
 */
function marcarError(campo, mensaje) {
  const contenedor = campo.closest('.campo');
  if (!contenedor) return;

  contenedor.classList.add('tiene-error');
  campo.setAttribute('aria-invalid', 'true');

  // Se reutiliza el elemento de error si ya existe (por ejemplo, el que
  // generó el servidor); si no, se crea uno nuevo. Así no se acumulan
  // mensajes duplicados al validar varias veces el mismo campo.
  let error = contenedor.querySelector('.campo__error');
  if (!error) {
    error = document.createElement('p');
    error.className = 'campo__error';
    error.id = `error-${campo.name}`;
    contenedor.appendChild(error);
  }

  error.textContent = mensaje;
  campo.setAttribute('aria-describedby', error.id);
}

/** Quita el error de un campo cuando ya está correcto. */
function limpiarError(campo) {
  const contenedor = campo.closest('.campo');
  if (!contenedor) return;

  contenedor.classList.remove('tiene-error');
  campo.removeAttribute('aria-invalid');
  // El `?.` evita fallar si el elemento no existía.
  contenedor.querySelector('.campo__error')?.remove();
}

/**
 * Valida un campo y actualiza su estado visual.
 * @returns {boolean} true si el campo es válido.
 */
function validarCampo(campo) {
  const regla = REGLAS[campo.name];
  if (!regla) return true; // Campo sin regla (como `etapa`): siempre válido

  if (regla(campo.value)) {
    limpiarError(campo);
    return true;
  }

  marcarError(campo, MENSAJES[campo.name]);
  return false;
}

// ── BLOQUE 5: Conexión de todo ──────────────────────────────────────────────
function iniciarValidacion() {
  const formulario = document.querySelector('[data-form-contacto]');
  if (!formulario) return;

  contarCaracteres(formulario);

  // Solo los campos que tienen regla definida.
  const campos = Array.from(formulario.querySelectorAll('[name]')).filter((campo) => REGLAS[campo.name]);

  campos.forEach((campo) => {
    /**
     * CUÁNDO VALIDAR — una decisión de experiencia, no técnica
     *
     * Se valida al SALIR del campo (`blur`), no mientras se escribe. Marcar
     * "correo inválido" cuando alguien lleva escritas tres letras es
     * corregir a mitad de palabra: molesto e inútil.
     */
    campo.addEventListener('blur', () => validarCampo(campo));

    /**
     * Excepción: si el campo YA está marcado como erróneo, sí se valida
     * mientras se escribe. Así el error desaparece en cuanto se corrige, sin
     * obligar a salir del campo para comprobarlo.
     */
    campo.addEventListener('input', () => {
      if (campo.closest('.campo')?.classList.contains('tiene-error')) validarCampo(campo);
    });
  });

  // ── BLOQUE 6: Al enviar ───────────────────────────────────────────────────
  formulario.addEventListener('submit', (evento) => {
    // Se validan TODOS los campos, no se para en el primer fallo: así la
    // persona ve de una vez todo lo que debe corregir.
    const invalidos = campos.filter((campo) => !validarCampo(campo));

    // Todo correcto: no se hace nada y el formulario se envía al servidor
    // con normalidad.
    if (invalidos.length === 0) return;

    // Hay errores: se cancela el envío y se lleva a la persona al primero,
    // con el foco puesto y desplazando la página. Sin esto, un error fuera
    // de pantalla haría parecer que el botón no funciona.
    evento.preventDefault();
    invalidos[0].focus();
    invalidos[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

iniciarValidacion();
