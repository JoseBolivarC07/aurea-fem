'use strict';

/**
 * Genera en `dist/` una copia estática del sitio para GitHub Pages.
 *
 * Levanta la app Express en un puerto libre, descarga el HTML de cada página
 * y lo guarda como archivo. GitHub Pages no ejecuta Node, así que el chat, el
 * formulario y el acceso interno se adaptan: el chat se muestra como "no
 * disponible", el formulario abre el correo de la visitante y el enlace al
 * panel desaparece.
 *
 * Uso: BASE_PATH=/aurea-fem npm run build:static
 */

const fs = require('node:fs');
const path = require('node:path');
const { once } = require('node:events');

// Deben fijarse antes de cargar la configuración, que las lee al importarse.
process.env.NODE_ENV = 'production';
process.env.GEMINI_API_KEY = '';

const config = require('../src/config');
const createServer = require('../src/server');
const { brand } = require('../src/app/models/site.model');

const BASE = (process.env.BASE_PATH || '/aurea-fem').replace(/\/+$/, '');
const OUT = path.join(config.paths.root, 'dist');

const PAGINAS = [
  { ruta: '/', archivo: 'index.html' },
  { ruta: '/nosotras', archivo: 'nosotras/index.html' },
  { ruta: '/servicios', archivo: 'servicios/index.html' },
  { ruta: '/productos', archivo: 'productos/index.html' },
  { ruta: '/contacto', archivo: 'contacto/index.html' },
  { ruta: '/pagina-inexistente', archivo: '404.html', estado: 404 },
];

/** Traduce una ruta del servidor ("/servicios#embarazo") a su archivo publicado. */
function rutaPublica(original) {
  const [, ruta, consulta = '', ancla = ''] = original.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);

  if (/\.[a-z0-9]+$/i.test(ruta)) return BASE + ruta + consulta + ancla;

  return `${BASE}${ruta.replace(/\/?$/, '/')}${ancla}`;
}

function adaptarHtml(html) {
  return html
    .replace(
      'method="post" action="/contacto"',
      `method="post" action="mailto:${brand.email}" enctype="text/plain"`
    )
    .replace(/<a class="pie__acceso"[^>]*>[^<]*<\/a>/, '')
    .replace(/\b(href|src|action)="(\/(?!\/)[^"]*)"/g, (_, atributo, url) => `${atributo}="${rutaPublica(url)}"`);
}

function escribir(archivo, contenido) {
  const destino = path.join(OUT, archivo);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, contenido, 'utf8');
}

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.cpSync(config.paths.public, OUT, { recursive: true });
  escribir('.nojekyll', '');

  const servidor = createServer().listen(0);
  await once(servidor, 'listening');
  const origen = `http://127.0.0.1:${servidor.address().port}`;

  try {
    for (const pagina of PAGINAS) {
      const respuesta = await fetch(origen + pagina.ruta);
      const esperado = pagina.estado || 200;
      if (respuesta.status !== esperado) {
        throw new Error(`${pagina.ruta} respondió ${respuesta.status}, se esperaba ${esperado}`);
      }
      escribir(pagina.archivo, adaptarHtml(await respuesta.text()));
      console.log(`  ${pagina.ruta.padEnd(32)} → ${pagina.archivo}`);
    }

    const estado = await fetch(`${origen}/api/chat/estado`);
    escribir('api/chat/estado.json', await estado.text());
  } finally {
    servidor.close();
  }

  const chat = path.join(OUT, 'js', 'components', 'chat.js');
  const codigo = fs.readFileSync(chat, 'utf8');
  if (!codigo.includes("'/api/chat/estado'")) throw new Error('chat.js ya no consulta /api/chat/estado');
  fs.writeFileSync(chat, codigo.replace("'/api/chat/estado'", `'${BASE}/api/chat/estado.json'`), 'utf8');

  const contacto = fs.readFileSync(path.join(OUT, 'contacto', 'index.html'), 'utf8');
  if (!contacto.includes('action="mailto:')) throw new Error('No se pudo adaptar el formulario de contacto');

  console.log(`\n  Sitio estático listo en dist/ (base ${BASE}/)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
