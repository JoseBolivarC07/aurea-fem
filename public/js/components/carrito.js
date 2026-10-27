/**
 * CARRITO: COMPORTAMIENTO EN EL NAVEGADOR
 * =======================================
 *
 * Da vida al HTML inerte de `partials/carrito.ejs`, `partials/header.ejs` y a
 * los botones "Agregar" de las tarjetas. Los cálculos viven en
 * `carrito-logica.js` (puro, con pruebas); aquí solo se guarda, se pinta y se
 * atienden los eventos.
 *
 * FLUJO
 *   evento → cambia el estado en memoria → `guardar()` → `pintar()`
 *   `pintar()` redibuja todo desde el estado: nunca se edita el DOM a mano.
 *
 * SEGURIDAD
 * Nombres e imágenes salen del catálogo y se insertan con `textContent` y
 * atributos, nunca con `innerHTML`.
 *
 * CLASES QUE PINTA (las usa `carrito.css`)
 *   <html>         tiene-pedido (hay unidades) · carrito-abierto (panel abierto)
 *   [data-carrito] es-abierto (un frame después de quitar `hidden`)
 *   contador       es-pulso (600 ms al agregar)
 */

import {
  MAXIMO,
  sanear,
  agregar,
  cambiarCantidad,
  quitar,
  unidades,
  total,
  formatearPesos,
  armarMensaje,
  enlaceWhatsApp,
} from './carrito-logica.js';

const CLAVE = 'aurea-fem:pedido';
const MS_AVISO_BOTON = 1500; //  Cuánto dura "Agregado ✓" / "Máximo 10"
const MS_PULSO = 600; //         Duración de la animación del contador
const MS_RESPALDO_CIERRE = 400; // Si no llega `transitionend`, se oculta igual

const SELECTOR_ENFOCABLE = 'a[href], button:not([disabled])';

// ── Utilidades ──────────────────────────────────────────────────────────────

/** Lee el catálogo incrustado; devuelve null si falta o está roto. */
function leerCatalogo() {
  const bloque = document.getElementById('catalogo-pedido');
  if (!bloque) return null;
  try {
    const datos = JSON.parse(bloque.textContent);
    return Array.isArray(datos) ? datos : null;
  } catch {
    return null;
  }
}

/** Lee el pedido guardado; con almacenamiento bloqueado o roto, queda vacío. */
function leerGuardado() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE));
  } catch {
    return null;
  }
}

function escribirGuardado(pedido) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(pedido));
  } catch {
    // Sin almacenamiento el pedido vive en memoria hasta cambiar de página.
  }
}

const etiquetaProductos = (cantidad) => `${cantidad} ${cantidad === 1 ? 'producto' : 'productos'}`;

/** Crea un <svg> con un símbolo del sprite (`partials/icons.ejs`). */
function crearIcono(simbolo) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'icono');
  svg.setAttribute('aria-hidden', 'true');
  const uso = document.createElementNS(ns, 'use');
  uso.setAttribute('href', `#${simbolo}`);
  svg.appendChild(uso);
  return svg;
}

function crearElemento(etiqueta, clase, texto) {
  const nodo = document.createElement(etiqueta);
  nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

function crearBotonCantidad(accion, simbolo, etiqueta, deshabilitado) {
  const boton = crearElemento('button', 'carrito__boton-cantidad');
  boton.type = 'button';
  boton.dataset.accion = accion;
  boton.setAttribute('aria-label', etiqueta);
  boton.disabled = deshabilitado;
  boton.appendChild(crearIcono(simbolo));
  return boton;
}

/** Construye el <li> de una línea del pedido. */
function crearLinea(linea, producto) {
  const item = crearElemento('li', 'carrito__linea');
  item.dataset.id = producto.id;

  const imagen = crearElemento('img', 'carrito__miniatura');
  imagen.src = producto.imagen;
  imagen.alt = '';
  imagen.width = 64;
  imagen.height = 48;

  const info = crearElemento('div', 'carrito__info');
  info.append(
    crearElemento('p', 'carrito__nombre', producto.nombre),
    crearElemento('p', 'carrito__precio', formatearPesos(producto.precio))
  );

  const controles = crearElemento('div', 'carrito__controles');
  controles.append(
    crearBotonCantidad('menos', 'i-menos', `Quitar una unidad de ${producto.nombre}`, linea.cantidad <= 1),
    crearElemento('span', 'carrito__cantidad', String(linea.cantidad)),
    crearBotonCantidad('mas', 'i-mas', `Agregar una unidad de ${producto.nombre}`, linea.cantidad >= MAXIMO)
  );

  const quitarBoton = crearElemento('button', 'carrito__quitar', 'Quitar');
  quitarBoton.type = 'button';
  quitarBoton.dataset.accion = 'quitar';
  quitarBoton.setAttribute('aria-label', `Quitar ${producto.nombre} del pedido`);

  item.append(
    imagen,
    info,
    controles,
    crearElemento('p', 'carrito__subtotal', formatearPesos(producto.precio * linea.cantidad)),
    quitarBoton
  );
  return item;
}

// ── Función principal ───────────────────────────────────────────────────────

export function iniciarCarrito() {
  const catalogo = leerCatalogo();
  if (!catalogo) return;

  const raiz = document.querySelector('[data-carrito]');
  if (!raiz) return;

  const html = document.documentElement;
  const panel = raiz.querySelector('.carrito__panel');
  const botonCerrar = raiz.querySelector('.carrito__cerrar');
  const lista = raiz.querySelector('[data-carrito-lista]');
  const vacio = raiz.querySelector('[data-carrito-vacio]');
  const pie = raiz.querySelector('[data-carrito-pie]');
  const totalNodo = raiz.querySelector('[data-carrito-total]');
  const enviar = raiz.querySelector('[data-carrito-enviar]');
  const numeroWhatsApp = raiz.dataset.whatsapp;
  const bolsa = document.querySelector('.bolsa[data-carrito-abrir]');
  const contador = document.querySelector('[data-carrito-contador]');
  const barra = document.querySelector('[data-carrito-barra]');
  const resumen = document.querySelector('[data-carrito-resumen]');
  const aviso = document.querySelector('[data-carrito-aviso]');
  const abridores = document.querySelectorAll('[data-carrito-abrir]');
  const punteroFino = window.matchMedia('(pointer: fine)');
  const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (!panel || !botonCerrar || !lista) return;

  // Sanear al cargar: el almacenamiento puede venir roto o editado a mano.
  let pedido = sanear(leerGuardado(), catalogo);
  let abridor = null; //         Quien abrió el panel, para devolverle el foco
  let temporizadorCierre = 0; // Respaldo que oculta el panel al cerrar
  let temporizadorPulso = 0;
  let temporizadorAviso = 0;
  const temporizadoresBoton = new WeakMap();

  const estaAbierto = () => html.classList.contains('carrito-abierto');
  const buscar = (id) => catalogo.find((producto) => producto.id === id);

  // ══ PINTADO ═══════════════════════════════════════════════════════════════

  /** Vuelve a dibujar la lista conservando el foco del botón que se tocó. */
  function pintarLista() {
    const activo = document.activeElement;
    const enLista = activo && lista.contains(activo);
    const idActivo = enLista ? activo.closest('li')?.dataset.id : null;
    const accionActiva = enLista ? activo.dataset.accion : null;

    const lineas = [];
    for (const linea of pedido) {
      const producto = buscar(linea.id);
      if (producto) lineas.push(crearLinea(linea, producto));
    }
    lista.replaceChildren(...lineas);

    if (!idActivo) return;
    const fila = lista.querySelector(`li[data-id="${CSS.escape(idActivo)}"]`);
    if (!fila) return;
    // Si el botón quedó deshabilitado (mínimo o máximo), el foco pasa al otro.
    const objetivo = [accionActiva, 'mas', 'menos', 'quitar']
      .map((accion) => fila.querySelector(`[data-accion="${accion}"]`))
      .find((boton) => boton && !boton.disabled);
    objetivo?.focus();
  }

  function pintar() {
    const cantidad = unidades(pedido);
    const importe = formatearPesos(total(pedido, catalogo));
    const hay = cantidad > 0;
    const etiqueta = `Ver tu pedido (${hay ? etiquetaProductos(cantidad) : 'vacío'})`;
    // Quién tenía el foco antes de redibujar: solo si estaba dentro del panel
    // tiene sentido rescatarlo (Safari no enfoca los botones al tocarlos).
    const previo = document.activeElement;
    const estabaEnPanel = panel.contains(previo);

    html.classList.toggle('tiene-pedido', hay);

    if (bolsa) bolsa.setAttribute('aria-label', etiqueta);
    if (contador) {
      contador.textContent = String(cantidad);
      contador.hidden = !hay;
    }
    if (barra) {
      // Sin aria-label: su nombre accesible es su texto visible (WCAG 2.5.3).
      barra.hidden = !hay;
    }
    if (resumen) resumen.textContent = `${etiquetaProductos(cantidad)} · ${importe}`;

    pintarLista();
    vacio.hidden = hay;
    pie.hidden = !hay;
    totalNodo.textContent = importe;

    enviar.href = hay ? enlaceWhatsApp(numeroWhatsApp, armarMensaje(pedido, catalogo)) : '#';
    // Puntero fino (escritorio): pestaña nueva. Táctil: misma pestaña, para que
    // el celular abra la app directo sin dejar una pestaña vacía.
    if (punteroFino.matches) enviar.target = '_blank';
    else enviar.removeAttribute('target');

    // Si el elemento enfocado desapareció (se quitó la última línea, se vació
    // el pedido), el foco caería a <body> y Tab saldría del panel.
    // Chrome sigue marcando como activo un botón que acaba de quedar dentro de
    // un `[hidden]`, así que también se cuenta como perdido.
    const activo = document.activeElement;
    const sigueDentro = panel.contains(activo) && !activo.closest('[hidden]');
    if (estaAbierto() && estabaEnPanel && !sigueDentro) botonCerrar.focus();
  }

  /** Relee el almacenamiento: otra pestaña, o la caché de ida y vuelta (bfcache), pudo cambiarlo. */
  function releer() {
    pedido = sanear(leerGuardado(), catalogo);
    pintar();
  }

  function cambiar(nuevo) {
    pedido = nuevo;
    escribirGuardado(pedido);
    pintar();
  }

  // ══ BOTONES "AGREGAR" ═════════════════════════════════════════════════════

  function anunciar(texto) {
    // Se vacía primero y se escribe después: un mismo texto repetido no se
    // volvería a anunciar si el nodo no cambia.
    clearTimeout(temporizadorAviso);
    aviso.textContent = '';
    temporizadorAviso = setTimeout(() => {
      aviso.textContent = texto;
    }, 50);
  }

  function pulsarContador() {
    if (!contador) return;
    clearTimeout(temporizadorPulso);
    contador.classList.remove('es-pulso');
    void contador.offsetWidth; // Fuerza el reflujo para reiniciar la animación
    contador.classList.add('es-pulso');
    temporizadorPulso = setTimeout(() => contador.classList.remove('es-pulso'), MS_PULSO);
  }

  function mostrarEnBoton(boton, texto) {
    const previo = temporizadoresBoton.get(boton);
    if (!previo) boton.dataset.textoOriginal = boton.textContent;
    else clearTimeout(previo);
    boton.textContent = texto;
    temporizadoresBoton.set(
      boton,
      setTimeout(() => {
        boton.textContent = boton.dataset.textoOriginal;
        temporizadoresBoton.delete(boton);
      }, MS_AVISO_BOTON)
    );
  }

  function alAgregar(boton) {
    const producto = buscar(boton.dataset.agregar);
    if (!producto) return;
    const actual = pedido.find((linea) => linea.id === producto.id);

    if (actual && actual.cantidad >= MAXIMO) {
      mostrarEnBoton(boton, `Máximo ${MAXIMO}`);
      anunciar(`Máximo ${MAXIMO} unidades de ${producto.nombre}`);
      return;
    }
    cambiar(agregar(pedido, producto.id));
    mostrarEnBoton(boton, 'Agregado ✓');
    anunciar(`${producto.nombre} agregado a tu pedido`);
    pulsarContador();
  }

  // ══ PANEL: ABRIR Y CERRAR ═════════════════════════════════════════════════

  function marcarExpandido(valor) {
    abridores.forEach((boton) => boton.setAttribute('aria-expanded', String(valor)));
  }

  function abrir(quien) {
    if (estaAbierto()) return;
    clearTimeout(temporizadorCierre);
    abridor = quien;
    raiz.hidden = false;
    html.classList.add('carrito-abierto');
    marcarExpandido(true);
    // Un frame después, para que la transición parta del estado cerrado.
    requestAnimationFrame(() => {
      if (estaAbierto()) raiz.classList.add('es-abierto');
    });
    botonCerrar.focus();
  }

  function ocultar() {
    clearTimeout(temporizadorCierre);
    panel.removeEventListener('transitionend', alTerminarTransicion);
    if (!estaAbierto()) raiz.hidden = true;
  }

  function alTerminarTransicion(evento) {
    if (evento.target === panel) ocultar();
  }

  function cerrar() {
    if (!estaAbierto()) return;
    html.classList.remove('carrito-abierto');
    raiz.classList.remove('es-abierto');
    marcarExpandido(false);

    if (sinMovimiento.matches) {
      ocultar();
    } else {
      // Se oculta al terminar la transición o, si no la hay, a los 400 ms.
      panel.addEventListener('transitionend', alTerminarTransicion);
      temporizadorCierre = setTimeout(ocultar, MS_RESPALDO_CIERRE);
    }

    // La barra se oculta cuando el pedido queda vacío: el foco va a la bolsa.
    const destino = abridor && !abridor.hidden ? abridor : bolsa;
    destino?.focus();
    abridor = null;
  }

  /** Mantiene Tab y Shift+Tab dentro del panel mientras está abierto. */
  function atraparTab(evento) {
    const enfocables = Array.from(panel.querySelectorAll(SELECTOR_ENFOCABLE)).filter(
      (nodo) => !nodo.closest('[hidden]')
    );
    if (enfocables.length === 0) return;
    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    const activo = document.activeElement;

    if (!panel.contains(activo)) {
      evento.preventDefault();
      primero.focus();
    } else if (evento.shiftKey && activo === primero) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && activo === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  }

  // ══ EVENTOS (DELEGADOS: no se añaden escuchadores al redibujar) ═══════════

  document.addEventListener('click', (evento) => {
    const objetivo = evento.target instanceof Element ? evento.target : null;
    if (!objetivo) return;

    const botonAgregar = objetivo.closest('[data-agregar]');
    if (botonAgregar) return alAgregar(botonAgregar);

    const botonAbrir = objetivo.closest('[data-carrito-abrir]');
    if (botonAbrir) return abrir(botonAbrir);

    if (objetivo.closest('[data-carrito-cerrar]')) return cerrar();

    if (objetivo.closest('[data-carrito-vaciar]')) {
      if (window.confirm('¿Vaciar tu pedido?')) cambiar([]);
      return;
    }

    const botonAccion = objetivo.closest('[data-accion]');
    const fila = botonAccion?.closest('li[data-id]');
    if (!botonAccion || !fila || !lista.contains(fila)) return;

    const id = fila.dataset.id;
    const linea = pedido.find((l) => l.id === id);
    if (!linea) return;
    const accion = botonAccion.dataset.accion;
    if (accion === 'mas' || accion === 'menos') {
      cambiar(cambiarCantidad(pedido, id, linea.cantidad + (accion === 'mas' ? 1 : -1)));
      const nueva = pedido.find((l) => l.id === id)?.cantidad ?? 0;
      anunciar(`${buscar(id).nombre}: ${nueva} ${nueva === 1 ? 'unidad' : 'unidades'}`);
    } else if (accion === 'quitar') cambiar(quitar(pedido, id));
  });

  // Al volver con "Atrás" la página puede salir de la caché con un pedido viejo
  // en memoria; si se agregara sobre él se perderían las líneas guardadas.
  window.addEventListener('pageshow', (evento) => {
    if (evento.persisted) releer();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') releer();
  });

  // El enlace "Ver productos" del panel vacío: si ya se está en esa página,
  // recargarla sería inútil; solo se cierra el panel.
  vacio.addEventListener('click', (evento) => {
    const enlace = evento.target instanceof Element ? evento.target.closest('a[href]') : null;
    if (!enlace) return;
    const limpiar = (ruta) => ruta.replace(/(\.html|\/)$/, '');
    if (limpiar(enlace.pathname) === limpiar(location.pathname)) {
      evento.preventDefault();
      cerrar();
    }
  });

  document.addEventListener('keydown', (evento) => {
    if (!estaAbierto()) return;
    if (evento.key === 'Escape') cerrar();
    else if (evento.key === 'Tab') atraparTab(evento);
  });

  pintar();
}
