'use strict';

/**
 * DATOS INSTITUCIONALES DE LA MARCA
 * =================================
 *
 * QUÉ ES UN MODELO
 * La capa que guarda y entrega los datos. Ni el controlador ni la vista
 * saben de dónde salen: hoy están escritos aquí, mañana podrían venir de una
 * base de datos y el resto del proyecto no se enteraría. Ese es justamente
 * el objetivo de separarlo.
 *
 * Fuente de los textos: documento "Áurea Fem — Proyecto Empresarial"
 * (Fase 1 y Fase 2).
 *
 * POR QUÉ CENTRALIZARLO
 * Si el teléfono estuviera escrito directamente en las plantillas, cambiarlo
 * obligaría a buscarlo en la cabecera, el pie, la página de contacto y la
 * instrucción del agente de IA, con el riesgo de olvidar alguno. Aquí se
 * cambia una vez y se actualiza en todas partes, chat incluido.
 */

// ── BLOQUE 1: Identidad y datos de contacto ─────────────────────────────────
// Lo usan la cabecera, el pie, la página de contacto y el prompt de Aura.
const brand = {
  name: 'Áurea Fem',
  shortName: 'Áurea',
  slogan: 'Cuidarte también es conocerte',
  tagline: 'Acompañamiento integral en salud y bienestar femenino',
  foundedYear: 2026,
  city: 'Medellín',
  neighborhood: 'Laureles',
  country: 'Colombia',
  email: 'Aureafem@15gmail.com',
  phone: '3137156356',
  phoneDisplay: '+57 313 715 6356',
  whatsapp: '573137156356', // Con indicativo de país, formato de wa.me
  instagram: 'aurea_fem5',
  instagramUrl: 'https://instagram.com/aurea_fem5',
  domain: 'aureafem.com',
  sector: 'Sector terciario · salud y bienestar femenino con enfoque tecnológico',
  companyType: 'Empresa mixta: servicio de acompañamiento y productos de bienestar',
};

// ── BLOQUE 2: Menú principal ────────────────────────────────────────────────
/**
 * Los enlaces del menú, en orden de aparición.
 *
 * `path` cumple dos funciones: es el destino del enlace y se compara con la
 * URL actual para marcar cuál está activo (ver `partials/header.ejs`).
 *
 * Agregar una página al menú es agregar una línea aquí: la cabecera y el pie
 * la recorren con un bucle, no tienen los enlaces escritos a mano.
 */
const navigation = [
  { label: 'Inicio', path: '/' },
  { label: 'Nosotras', path: '/nosotras' },
  { label: 'Servicios', path: '/servicios' },
  { label: 'Productos', path: '/productos' },
  { label: 'Contacto', path: '/contacto' },
];

// ── BLOQUE 3: Declaraciones institucionales ─────────────────────────────────
// Textos largos que aparecen en la página "Nosotras" y que además se envían
// al agente de IA para que hable con el mismo criterio que la empresa.
const identity = {
  mission:
    'Somos una empresa que brinda acompañamiento integral en salud y bienestar femenino para mujeres en todas las etapas de su vida —pubertad, menstruación, embarazo y menopausia— a través de una página web informativa, orientación educativa, comunidad de apoyo y distribución de productos de bienestar femenino.',
  vision:
    'Ser, en el año 2030, una empresa líder nacional e internacional reconocida por transformar la manera en que se acompaña la salud mental y emocional de la mujer en cada etapa de su vida, con apoyo especializado, orientación emocional y soluciones tecnológicas.',
  purpose:
    'Brindar apoyo emocional e inclusión a todas las mujeres, acompañándolas en sus procesos y haciendo que se sientan comprendidas y valoradas.',
  valueProposition:
    'Ayudamos a mujeres en todas las etapas de su vida a resolver la falta de acompañamiento e información en su salud femenina, mediante una plataforma informativa y una tienda de productos de bienestar seleccionados y distribuidos por la empresa.',
  innovation:
    'La integración: orientación educativa, acompañamiento emocional y productos naturales especializados en un mismo lugar, para que cada mujer encuentre apoyo físico, informativo y comunitario sin tener que buscarlo en cinco sitios distintos.',
};

module.exports = { brand, navigation, identity };
