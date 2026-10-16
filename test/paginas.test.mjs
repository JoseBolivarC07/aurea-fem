/**
 * PRUEBAS DE LAS PÁGINAS DEL CARRITO
 * ==================================
 * Levanta el servidor real en un puerto libre y comprueba el HTML que recibe
 * el navegador: catálogo incrustado, botones "Agregar", bolsa y panel.
 */
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const createServer = require('../src/server.js'); // exporta la función misma
const { jsonParaHtml } = require('../src/utils/json-html.js');

let servidor;
let base;

before(async () => {
  servidor = createServer().listen(0);
  await new Promise((resolver) => servidor.once('listening', resolver));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
  servidor.closeAllConnections?.();
  await new Promise((resolver) => servidor.close(resolver));
});

async function pedir(ruta) {
  const respuesta = await fetch(base + ruta);
  assert.equal(respuesta.status, 200);
  return respuesta.text();
}

function contar(texto, fragmento) {
  return texto.split(fragmento).length - 1;
}

test('jsonParaHtml no deja ningún "<" y conserva el valor', () => {
  const original = { nombre: '</script><b>' };
  const texto = jsonParaHtml(original);
  assert.ok(!texto.includes('<'));
  assert.deepEqual(JSON.parse(texto), original);
});

test('/productos incrusta el catálogo con las cuatro claves', async () => {
  const html = await pedir('/productos');
  const bloque = html.match(
    /<script type="application\/json" id="catalogo-pedido">([\s\S]*?)<\/script>/
  );
  assert.ok(bloque, 'falta el bloque #catalogo-pedido');
  const catalogo = JSON.parse(bloque[1]);
  assert.equal(catalogo.length, 4);
  for (const producto of catalogo) {
    assert.deepEqual(Object.keys(producto).sort(), ['id', 'imagen', 'nombre', 'precio']);
  }
  const kit = catalogo.find((p) => p.id === 'kit-menstrual-basico');
  assert.equal(kit.precio, 102000);
  assert.equal(kit.imagen, '/images/productos/kit-menstrual-basico.jpg');
});

test('/productos y / tienen cuatro botones Agregar', async () => {
  for (const ruta of ['/productos', '/']) {
    const html = await pedir(ruta);
    assert.equal(contar(html, 'data-agregar="'), 4, ruta);
  }
});

test('/contacto trae la bolsa y el panel del carrito', async () => {
  const html = await pedir('/contacto');
  assert.ok(html.includes('data-carrito-abrir'));
  assert.ok(html.includes('id="panel-carrito"'));
  assert.ok(html.includes('data-whatsapp="573137156356"'));
});
