/**
 * PRUEBAS DEL FORMULARIO DE CONTACTO CON CANAL WHATSAPP
 * =====================================================
 * El canal que usa Vercel, donde el disco es de solo lectura: el envío válido
 * redirige a WhatsApp con el mensaje escrito y nada se guarda en storage/.
 * Node ejecuta cada archivo de pruebas en su propio proceso, así que fijar la
 * variable aquí no afecta a las demás pruebas.
 */
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

process.env.CONTACTO_CANAL = 'whatsapp';

const require = createRequire(import.meta.url);
const createServer = require('../src/server.js');

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

function enviar(campos) {
  return fetch(`${base}/contacto`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(campos),
    redirect: 'manual',
  });
}

test('el formulario anuncia WhatsApp', async () => {
  const html = await (await fetch(`${base}/contacto`)).text();
  assert.ok(html.includes('Enviar por WhatsApp'));
});

test('un envío válido redirige a WhatsApp con el mensaje escrito', async () => {
  const respuesta = await enviar({
    nombre: 'Ana Pérez',
    correo: 'ana@example.com',
    etapa: 'menstruacion',
    mensaje: '¿Tienen envíos a Bello?',
  });

  assert.equal(respuesta.status, 303);
  const destino = respuesta.headers.get('location');
  const prefijo = 'https://wa.me/573137156356?text=';
  assert.ok(destino.startsWith(prefijo), destino);
  assert.equal(
    decodeURIComponent(destino.slice(prefijo.length)),
    'Hola, les escribo desde el formulario de contacto de la página.\n\n' +
      'Nombre: Ana Pérez\n' +
      'Correo: ana@example.com\n' +
      'Etapa: Menstruación\n\n' +
      '¿Tienen envíos a Bello?'
  );
});

test('sin etapa, el mensaje omite esa línea', async () => {
  const respuesta = await enviar({ nombre: 'Ana', correo: 'ana@example.com', mensaje: 'Hola, una consulta.' });
  const texto = decodeURIComponent(respuesta.headers.get('location').split('?text=')[1]);
  assert.ok(!texto.includes('Etapa:'));
});

test('un envío inválido vuelve al formulario con errores, sin redirigir', async () => {
  const respuesta = await enviar({ nombre: 'A', correo: 'no-es-correo', mensaje: 'corto' });
  assert.equal(respuesta.status, 422);
});

test('la política de seguridad deja que el formulario lleve a WhatsApp', async () => {
  const respuesta = await fetch(`${base}/contacto`);
  assert.match(respuesta.headers.get('content-security-policy'), /form-action 'self' https:\/\/wa\.me https:\/\/api\.whatsapp\.com/);
});
