/**
 * PRUEBAS DE LA LÓGICA DEL CARRITO
 * ================================
 *
 * Cubren `public/js/components/carrito-logica.js`, que no toca el DOM,
 * por eso se pueden ejecutar directamente con `node --test`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
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
} from '../public/js/components/carrito-logica.js';

const catalogo = [
  { id: 'te-rojo', nombre: 'Té Rojo', precio: 100000, imagen: '/images/productos/te-rojo.jpg' },
  { id: 'gel-termico', nombre: 'Gel Térmico', precio: 103000, imagen: '/images/productos/gel-termico.jpg' },
  {
    id: 'kit-menstrual-basico',
    nombre: 'Kit Menstrual Básico',
    precio: 102000,
    imagen: '/images/productos/kit-menstrual-basico.jpg',
  },
];

test('MAXIMO es 10', () => {
  assert.equal(MAXIMO, 10);
});

test('sanear: entradas que no son arreglo dan un pedido vacío', () => {
  assert.deepEqual(sanear('hola', catalogo), []);
  assert.deepEqual(sanear(null, catalogo), []);
  assert.deepEqual(sanear({}, catalogo), []);
});

test('sanear: descarta ids que no están en el catálogo', () => {
  assert.deepEqual(sanear([{ id: 'x', cantidad: 1 }], catalogo), []);
});

test('sanear: descarta elementos que no son líneas', () => {
  assert.deepEqual(sanear([null, 5, 'te-rojo', { cantidad: 1 }], catalogo), []);
});

test('sanear: ajusta la cantidad a un entero entre 1 y 10', () => {
  const cantidadDe = (cantidad) => sanear([{ id: 'te-rojo', cantidad }], catalogo)[0].cantidad;
  assert.equal(cantidadDe(0), 1);
  assert.equal(cantidadDe(-3), 1);
  assert.equal(cantidadDe(2.7), 2);
  assert.equal(cantidadDe('4'), 4);
  assert.equal(cantidadDe(99), 10);
  assert.equal(cantidadDe(NaN), 1);
  assert.equal(cantidadDe('abc'), 1);
});

test('sanear: une duplicados en una sola línea con la primera cantidad', () => {
  const pedido = sanear(
    [
      { id: 'te-rojo', cantidad: 2 },
      { id: 'te-rojo', cantidad: 5 },
    ],
    catalogo,
  );
  assert.deepEqual(pedido, [{ id: 'te-rojo', cantidad: 2 }]);
});

test('sanear: conserva el orden de entrada', () => {
  const pedido = sanear(
    [
      { id: 'gel-termico', cantidad: 1 },
      { id: 'te-rojo', cantidad: 3 },
    ],
    catalogo,
  );
  assert.deepEqual(
    pedido.map((linea) => linea.id),
    ['gel-termico', 'te-rojo'],
  );
});

test('agregar: un id nuevo entra al final con cantidad 1', () => {
  const pedido = agregar([{ id: 'te-rojo', cantidad: 2 }], 'gel-termico');
  assert.deepEqual(pedido, [
    { id: 'te-rojo', cantidad: 2 },
    { id: 'gel-termico', cantidad: 1 },
  ]);
});

test('agregar: un id existente suma 1', () => {
  assert.deepEqual(agregar([{ id: 'te-rojo', cantidad: 2 }], 'te-rojo'), [{ id: 'te-rojo', cantidad: 3 }]);
});

test('agregar: en el máximo se queda en el máximo', () => {
  assert.deepEqual(agregar([{ id: 'te-rojo', cantidad: 10 }], 'te-rojo'), [{ id: 'te-rojo', cantidad: 10 }]);
});

test('agregar: no muta el pedido original', () => {
  const original = [{ id: 'te-rojo', cantidad: 2 }];
  const copia = structuredClone(original);
  agregar(original, 'te-rojo');
  agregar(original, 'gel-termico');
  assert.deepEqual(original, copia);
});

test('cambiarCantidad: ajusta a un entero entre 1 y 10', () => {
  const base = [{ id: 'te-rojo', cantidad: 2 }];
  assert.equal(cambiarCantidad(base, 'te-rojo', 5)[0].cantidad, 5);
  assert.equal(cambiarCantidad(base, 'te-rojo', 0)[0].cantidad, 1);
  assert.equal(cambiarCantidad(base, 'te-rojo', 50)[0].cantidad, 10);
  assert.equal(cambiarCantidad(base, 'te-rojo', 3.9)[0].cantidad, 3);
  assert.equal(cambiarCantidad(base, 'te-rojo', NaN)[0].cantidad, 1);
});

test('cambiarCantidad: no muta el original ni toca otras líneas', () => {
  const original = [
    { id: 'te-rojo', cantidad: 2 },
    { id: 'gel-termico', cantidad: 1 },
  ];
  const copia = structuredClone(original);
  const nuevo = cambiarCantidad(original, 'te-rojo', 4);
  assert.deepEqual(original, copia);
  assert.deepEqual(nuevo[1], { id: 'gel-termico', cantidad: 1 });
});

test('cambiarCantidad: un id desconocido deja el pedido igual', () => {
  const original = [{ id: 'te-rojo', cantidad: 2 }];
  assert.deepEqual(cambiarCantidad(original, 'otro', 5), original);
});

test('quitar: elimina la línea sin mutar el original', () => {
  const original = [
    { id: 'te-rojo', cantidad: 2 },
    { id: 'gel-termico', cantidad: 1 },
  ];
  const copia = structuredClone(original);
  assert.deepEqual(quitar(original, 'te-rojo'), [{ id: 'gel-termico', cantidad: 1 }]);
  assert.deepEqual(original, copia);
});

const pedidoDosLineas = [
  { id: 'te-rojo', cantidad: 2 },
  { id: 'gel-termico', cantidad: 1 },
];

test('unidades: suma las cantidades', () => {
  assert.equal(unidades(pedidoDosLineas), 3);
  assert.equal(unidades([]), 0);
});

test('total: suma precio por cantidad', () => {
  assert.equal(total(pedidoDosLineas, catalogo), 303000);
});

test('total: los ids desconocidos no suman', () => {
  assert.equal(total([...pedidoDosLineas, { id: 'fantasma', cantidad: 5 }], catalogo), 303000);
});

test('formatearPesos: usa pesos colombianos con espacio duro', () => {
  assert.equal(formatearPesos(200000), '$ 200.000');
});

test('armarMensaje: arma el texto del pedido', () => {
  assert.equal(
    armarMensaje(pedidoDosLineas, catalogo),
    'Hola, ¿cómo estás? Quisiera llevarme estos productos:\n\n' +
      '- 2 × Té Rojo — $ 200.000\n' +
      '- 1 × Gel Térmico — $ 103.000\n\n' +
      'Total: $ 303.000',
  );
});

test('armarMensaje: omite ids desconocidos y no los cuenta en el total', () => {
  const mensaje = armarMensaje([{ id: 'fantasma', cantidad: 1 }, { id: 'te-rojo', cantidad: 1 }], catalogo);
  assert.ok(!mensaje.includes('fantasma'));
  assert.ok(mensaje.endsWith('Total: $ 100.000'));
});

test('armarMensaje: sin líneas válidas devuelve cadena vacía', () => {
  assert.equal(armarMensaje([], catalogo), '');
  assert.equal(armarMensaje([{ id: 'fantasma', cantidad: 1 }], catalogo), '');
});

test('enlaceWhatsApp: codifica el mensaje y se puede revertir', () => {
  const mensaje = 'Hola, ¿qué tal?\n- 1 × Té — $ 1';
  const enlace = enlaceWhatsApp('573137156356', mensaje);
  const prefijo = 'https://wa.me/573137156356?text=';
  assert.ok(enlace.startsWith(prefijo));
  assert.equal(decodeURIComponent(enlace.slice(prefijo.length)), mensaje);
});

test('enlaceWhatsApp: el texto va realmente codificado (spec §6)', () => {
  const mensaje = 'Hola, ¿qué tal?\n- 1 × Té — $ 1';
  const texto = enlaceWhatsApp('573137156356', mensaje).split('?text=')[1];
  for (const crudo of ['\n', ' ', '¿', '×', '—', ' ']) {
    assert.ok(!texto.includes(crudo), `quedó sin codificar: ${JSON.stringify(crudo)}`);
  }
  assert.ok(texto.includes('%0A'));
});
