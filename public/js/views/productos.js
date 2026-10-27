/**
 * CATÁLOGO: BOTÓN "CONSULTAR"
 * ===========================
 *
 * Solo se carga en /productos. Conecta cada tarjeta de producto con el chat:
 * al pulsar "Consultar", se abre Aura con la pregunta ya redactada.
 *
 * DECISIÓN DE DISEÑO: comunicación por eventos
 *
 * Este archivo NO importa `chat.js` ni llama a ninguna de sus funciones. Solo
 * lanza un evento al documento y sigue con su vida. `chat.js` lo escucha y
 * reacciona.
 *
 * ¿Por qué complicarlo así en vez de llamar a la función directamente?
 *   · Este archivo no necesita saber que el chat existe, ni cómo se llaman
 *     sus funciones, ni si sigue implementado igual.
 *   · Si mañana el chat se reescribe entero, esto sigue funcionando mientras
 *     alguien escuche el evento 'aurea:chat'.
 *   · Si el chat no está en la página, el evento se lanza al vacío y no pasa
 *     nada: no se rompe ni hay que comprobar antes si existe.
 *
 * Es el mismo principio del enchufe y el aparato: el enchufe no necesita
 * saber qué se conecta a él.
 */

function iniciarConsultas() {
  // Todos los botones marcados en la plantilla con `data-consultar-producto`.
  // El valor del atributo es el nombre del producto.
  document.querySelectorAll('[data-consultar-producto]').forEach((boton) => {
    boton.addEventListener('click', () => {
      // `dataset.consultarProducto` lee el atributo `data-consultar-producto`.
      // El navegador convierte los guiones a camelCase automáticamente.
      const producto = boton.dataset.consultarProducto;

      // `CustomEvent` permite adjuntar datos propios en `detail`. Aquí viaja
      // la pregunta ya redactada, para que la usuaria no tenga que escribirla.
      document.dispatchEvent(
        new CustomEvent('aurea:chat', {
          detail: { mensaje: `Cuéntame más sobre "${producto}". ¿Para qué me sirve y cómo se usa?` },
        })
      );
    });
  });
}

iniciarConsultas();
